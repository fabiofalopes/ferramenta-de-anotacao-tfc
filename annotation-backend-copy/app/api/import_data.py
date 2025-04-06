from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List, Callable
import json
import pandas as pd
from io import StringIO
from datetime import datetime
import logging
from sqlalchemy import select

from ..database import get_db
from ..models import User, Project, DataContainer, DataItem, Annotation
from ..schemas import ImportStatus, MapField, CSVImportRequest
from ..auth import get_current_admin_user
from ..config import get_project_type

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/import", response_model=ImportStatus)
async def import_data(
    file: UploadFile = File(...),
    import_config: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Import data from a file to a project"""
    logger.info(f"Starting data import for user {current_user.id}")
    
    # Parse import configuration
    try:
        config_dict = json.loads(import_config)
        config = CSVImportRequest(**config_dict)
        logger.info(f"Import config: {config.model_dump()}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid import configuration JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import configuration"
        )
    except Exception as e:
        logger.error(f"Invalid import configuration: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid import configuration: {str(e)}"
        )
    
    # Check if project exists and user has access
    project_query = select(Project).where(Project.id == config.project_id)
    result = await db.execute(project_query)
    project = result.scalar_one_or_none()
    
    if not project:
        logger.error(f"Project {config.project_id} not found or access denied")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Validate project type supports this data type
    project_type = get_project_type(project.type)
    if project_type and config.data_type not in project_type.data_item_types:
        logger.error(f"Data type {config.data_type} not supported for project type {project.type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data type {config.data_type} not supported for project type {project.type}"
        )
    
    # Create a data container
    container = DataContainer(
        name=config.container_name,
        project_id=config.project_id,
        meta_data={
            "import_type": config.import_type,
            "data_type": config.data_type,
            "original_filename": file.filename,
            "imported_by": current_user.id,
            "field_mapping": [map_field.model_dump() for map_field in config.field_mapping]
        },
        status="processing"
    )
    db.add(container)
    await db.commit()
    await db.refresh(container)
    logger.info(f"Created data container {container.id} with name '{config.container_name}'")
    
    # Process the file based on import type
    try:
        if file.filename.endswith(".csv"):
            return await process_csv_import(file, container, config, db, current_user)
        else:
            logger.error(f"Unsupported file format: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format"
            )
    except Exception as e:
        # Update container status to failed
        container.status = "failed"
        container.meta_data = {
            **container.meta_data,
            "error": str(e)
        }
        await db.commit()
        logger.error(f"Import failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )

async def process_csv_import(file, container, config: CSVImportRequest, db, current_user):
    """Process a CSV file import with enhanced field mapping and error handling"""
    # Read file content
    content = await file.read()
    
    # Use pandas with appropriate options for handling quoted values
    try:
        df = pd.read_csv(
            StringIO(content.decode('utf-8')), 
            quotechar='"', 
            escapechar='\\',
            na_values=[''], 
            keep_default_na=False
        )
        logger.info(f"CSV columns: {df.columns.tolist()}")
        if not df.empty:
            logger.info(f"CSV preview (first row): {df.iloc[0].to_dict()}")
    except Exception as e:
        logger.error(f"Failed to parse CSV: {str(e)}")
        raise ValueError(f"Failed to parse CSV file: {str(e)}")
    
    if df.empty:
        logger.warning("CSV file has no data")
        container.status = "completed"
        container.meta_data = {**container.meta_data, "warning": "CSV file has no data"}
        await db.commit()
        return ImportStatus(
            id=str(container.id),
            status="completed",
            progress=1.0,
            total_rows=0,
            processed_rows=0,
            errors=[],
            warnings=["CSV file has no data"]
        )
    
    # Get field mappings from configuration
    field_mapping = {field.target_field: field for field in config.field_mapping}
    
    # Validate field mappings against actual CSV columns
    csv_columns = df.columns.tolist()
    logger.info(f"Field mapping: {field_mapping}")
    logger.info(f"CSV columns: {csv_columns}")
    
    # Verify required fields for the data type
    required_fields = []
    if config.data_type == "chat_message":
        required_fields = ["content", "user_id", "turn_id"]
    
    # Ensure required fields are mapped
    missing_fields = []
    for field in required_fields:
        if field not in field_mapping:
            missing_fields.append(field)
            continue
            
        map_field = field_mapping[field]
        if map_field.source_field not in csv_columns and map_field.default_value is None:
            missing_fields.append(field)
    
    if missing_fields:
        error_message = f"Required fields not mapped or missing in CSV: {', '.join(missing_fields)}"
        logger.error(error_message)
        raise ValueError(error_message)
        
    # Import data
    errors = []
    warnings = []
    processed = 0
    total_rows = len(df)
    
    # Prepare transforms if defined
    transforms = {}
    for field_name, map_field in field_mapping.items():
        if map_field.transform:
            try:
                # Simple lambda creation from transform expression
                # WARNING: This is a security risk in production - use a safer method
                transforms[field_name] = eval(f"lambda value: {map_field.transform}")
                logger.info(f"Added transform for field {field_name}: {map_field.transform}")
            except Exception as e:
                logger.error(f"Failed to create transform for {field_name}: {e}")
                warnings.append(f"Failed to create transform for {field_name}: {e}")
    
    for idx, row in df.iterrows():
        try:
            # Create metadata and content from mappings
            metadata = {}
            content = None
            
            for field_name, map_field in field_mapping.items():
                # Skip content field - handled separately
                if field_name == "content":
                    if map_field.source_field in row.index:
                        content = row[map_field.source_field]
                    elif map_field.default_value is not None:
                        content = map_field.default_value
                    continue
                    
                # Process other fields into metadata
                value = None
                if map_field.source_field in row.index:
                    value = row[map_field.source_field]
                elif map_field.default_value is not None:
                    value = map_field.default_value
                
                # Skip None/NaN values
                if pd.isna(value):
                    continue
                    
                # Apply transform if defined
                if field_name in transforms and value is not None:
                    try:
                        value = transforms[field_name](value)
                    except Exception as e:
                        logger.warning(f"Transform failed for field {field_name}, row {idx}: {e}")
                
                metadata[field_name] = value
            
            # Ensure we have content
            if content is None or pd.isna(content):
                content = ""  # Use empty string as fallback
                warnings.append(f"Row {idx}: Empty content value")
            
            # Create the data item
            data_item = DataItem(
                container_id=container.id, 
                content=str(content),
                meta_data=metadata,
                type=config.data_type
            )
            db.add(data_item)
            
            processed += 1
            
            # Commit in batches for better performance
            if processed % 100 == 0:
                await db.commit()
                logger.info(f"Processed {processed}/{total_rows} rows")
                
        except Exception as e:
            errors.append(f"Error processing row {idx}: {str(e)}")
            logger.error(f"Error processing row {idx}: {str(e)}")
    
    # Final commit
    await db.commit()
    
    # Update container status
    container.status = "completed" if not errors else "completed_with_errors"
    container.meta_data = {
        **container.meta_data,
        "stats": {
            "total_rows": total_rows,
            "processed_rows": processed,
            "error_count": len(errors),
            "warning_count": len(warnings)
        }
    }
    await db.commit()
    logger.info(f"Import completed: {processed}/{total_rows} rows processed")
    
    return ImportStatus(
        id=str(container.id),
        status=container.status,
        progress=1.0,
        total_rows=total_rows,
        processed_rows=processed,
        errors=errors[:20],  # Limit to first 20 errors
        warnings=warnings[:20]  # Limit to first 20 warnings
    ) 