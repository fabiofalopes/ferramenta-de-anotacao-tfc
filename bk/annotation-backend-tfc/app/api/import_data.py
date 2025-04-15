from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
import json
import pandas as pd
from io import StringIO
from datetime import datetime
import logging
from sqlalchemy import select

from ..database import get_db
from ..models import User, Project, DataContainer, DataItem, Annotation
from ..schemas import ImportStatus
from ..auth import get_current_admin_user

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
        config = json.loads(import_config)
        logger.info(f"Import config: {config}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid import configuration JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import configuration"
        )
    
    # Validate configuration
    project_id = config.get("project_id")
    if not project_id:
        logger.error("No project_id in import configuration")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID is required"
        )
    
    # Check if project exists and user has access
    project_query = select(Project).where(Project.id == project_id)
    result = await db.execute(project_query)
    project = result.scalar_one_or_none()
    
    if not project:
        logger.error(f"Project {project_id} not found or access denied")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Create a data container
    container_name = config.get("container_name", file.filename)
    container = DataContainer(
        name=container_name,
        project_id=project_id,
        meta_data={
            "import_type": config.get("import_type", "generic"),
            "original_filename": file.filename,
            "imported_by": current_user.id
        },
        status="processing"
    )
    db.add(container)
    await db.commit()
    await db.refresh(container)
    logger.info(f"Created data container {container.id} with name '{container_name}'")
    
    # Process the file based on import type
    import_type = config.get("import_type", "generic")
    
    try:
        if import_type == "generic" and file.filename.endswith(".csv"):
            return await process_csv_import(file, container, config, db, current_user)
        else:
            logger.error(f"Unsupported import type: {import_type} or file format: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported import type or file format"
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

async def process_csv_import(file, container, config, db, current_user):
    """Process a CSV file import with enhanced column mapping and error handling"""
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
    
    # Get column mappings
    column_mapping = config.get("column_mapping", {})
    content_column = column_mapping.get("content")
    type_column = column_mapping.get("type")
    metadata_mapping = column_mapping.get("metadata", {})
    
    # Validate column mappings against actual CSV columns
    csv_columns = df.columns.tolist()
    logger.info(f"Content column: {content_column}, Type column: {type_column}")
    logger.info(f"Metadata mapping: {metadata_mapping}")
    logger.info(f"CSV columns: {csv_columns}")
    
    if not content_column:
        raise ValueError("Content column mapping is required")
    
    if content_column not in csv_columns:
        raise ValueError(f"Mapped content column '{content_column}' not found in CSV. Available columns: {csv_columns}")
        
    # Look for turn_text column and auto-map to content if not already mapped
    if 'turn_text' in csv_columns and content_column != 'turn_text' and not any(col == 'turn_text' for col in metadata_mapping.values()):
        logger.info(f"Auto-mapping 'turn_text' column to content")
        content_column = 'turn_text'
        column_mapping['content'] = 'turn_text'
        
    # Look for turn_id, user_id, reply_to_turn and timestamp columns for auto-mapping to metadata
    special_columns = ['turn_id', 'user_id', 'reply_to_turn', 'timestamp']
    for special_col in special_columns:
        if special_col in csv_columns and not any(col == special_col for col in metadata_mapping.values()) and special_col != content_column:
            logger.info(f"Auto-mapping special column '{special_col}' to metadata.{special_col}")
            metadata_mapping[special_col] = special_col
    
    # Process annotations if specified
    annotation_mapping = config.get("annotation_mapping")
    
    # Import data
    errors = []
    warnings = []
    processed = 0
    
    # Update container with final mapping used
    container.meta_data = {
        **container.meta_data,
        "final_mapping": {
            "content": content_column,
            "type": type_column,
            "metadata": metadata_mapping
        }
    }
    await db.commit()
    
    for idx, row in df.iterrows():
        try:
            # Prepare metadata
            metadata = {}
            for field_name, column in metadata_mapping.items():
                if column in row.index:
                    value = row[column]
                    if pd.notna(value):
                        # Convert to string for consistent handling
                        metadata[field_name] = str(value)
                        if idx < 3:  # Log only first 3 items for debugging
                            logger.debug(f"Row {idx} - Metadata {field_name}: {value}")
            
            # Get content
            if content_column not in row.index:
                logger.warning(f"Content column '{content_column}' not found in row {idx}")
                warnings.append(f"Row {idx}: Content column '{content_column}' not found")
                continue
                
            content_value = row[content_column]
            if pd.isna(content_value) or content_value == "":
                logger.warning(f"Empty content in row {idx}")
                warnings.append(f"Row {idx}: Empty content")
                continue
            
            # Get type
            item_type = "generic"
            if type_column and type_column in row.index and pd.notna(row[type_column]):
                item_type = str(row[type_column])
            
            # Create item
            item = DataItem(
                container_id=container.id,
                content=str(content_value),
                type=item_type,
                meta_data=metadata
            )
            db.add(item)
            await db.commit()
            await db.refresh(item)
            
            if idx < 5:  # Log only first 5 items for debugging
                logger.info(f"Created item {idx}: content={item.content[:50]}..., type={item.type}, metadata={item.meta_data}")
            
            # Create initial annotation if mapping provided
            if annotation_mapping:
                annotation_data = {}
                for field_name, column in annotation_mapping.get("data", {}).items():
                    if column in row.index and pd.notna(row[column]):
                        annotation_data[field_name] = str(row[column])
                        
                if annotation_data:
                    annotation = Annotation(
                        item_id=item.id,
                        type=annotation_mapping["type"],
                        data=annotation_data,
                        created_by=current_user.id
                    )
                    db.add(annotation)
                    await db.commit()
            
            processed += 1
            
        except Exception as e:
            error_msg = f"Error on row {idx}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
    
    # Update container status
    container.status = "completed"
    if errors:
        container.meta_data = {
            **container.meta_data,
            "errors": errors[:10],  # Store first 10 errors
            "error_count": len(errors)
        }
    await db.commit()
    
    result = ImportStatus(
        id=str(container.id),
        status="completed",
        progress=1.0,
        total_rows=len(df),
        processed_rows=processed,
        errors=errors,
        warnings=warnings
    )
    logger.info(f"Import completed: {result.dict()}")
    return result 