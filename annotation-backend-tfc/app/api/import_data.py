from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
import json
import pandas as pd
from io import StringIO
from datetime import datetime
import logging

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
    """Generic data import endpoint
    
    import_config should be a JSON object with:
    {
        "project_id": int,
        "container_name": str,
        "import_type": str,
        "column_mapping": {
            "content": str,  # Column containing main content
            "type": str,     # Column containing item type (optional)
            "metadata": {    # Map columns to metadata fields
                "field_name": "column_name",
                ...
            }
        },
        "annotation_mapping": {  # Optional mapping for initial annotations
            "type": str,         # Annotation type
            "data": {            # Map columns to annotation data fields
                "field_name": "column_name",
                ...
            }
        }
    }
    """
    try:
        # Parse import config
        config = json.loads(import_config)
        logger.info(f"Import config: {config}")
        
        # Validate project access
        project_id = config.get("project_id")
        if not project_id:
            raise ValueError("project_id is required")
            
        # Create container
        container = DataContainer(
            name=config.get("container_name", f"Import {datetime.now()}"),
            project_id=project_id,
            meta_data={"import_type": config.get("import_type", "generic")}
        )
        db.add(container)
        await db.commit()
        await db.refresh(container)
        logger.info(f"Created container: {container.id} - {container.name}")
        
        # Read file content
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode()))
        logger.info(f"CSV columns: {df.columns.tolist()}")
        logger.info(f"CSV preview (first row): {df.iloc[0].to_dict()}")
        
        # Get column mappings
        column_mapping = config.get("column_mapping", {})
        content_column = column_mapping.get("content")
        type_column = column_mapping.get("type")
        metadata_mapping = column_mapping.get("metadata", {})
        
        logger.info(f"Content column: {content_column}")
        logger.info(f"Type column: {type_column}")
        logger.info(f"Metadata mapping: {metadata_mapping}")
        
        if not content_column:
            raise ValueError("content column mapping is required")
            
        # Process annotations if specified
        annotation_mapping = config.get("annotation_mapping")
        
        # Import data
        errors = []
        processed = 0
        
        for idx, row in df.iterrows():
            try:
                # Prepare metadata
                metadata = {}
                for field_name, column in metadata_mapping.items():
                    value = row.get(column)
                    if pd.notna(value):
                        metadata[field_name] = str(value)
                        logger.debug(f"Row {idx} - Metadata {field_name}: {value}")
                
                # Create item
                item = DataItem(
                    container_id=container.id,
                    content=str(row[content_column]) if pd.notna(row[content_column]) else "",
                    type=str(row[type_column]) if type_column and pd.notna(row[type_column]) else "generic",
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
                    for field_name, column in annotation_mapping["data"].items():
                        value = row.get(column)
                        if pd.notna(value):
                            annotation_data[field_name] = str(value)
                            
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
                
        result = ImportStatus(
            id=str(container.id),
            status="completed",
            progress=1.0,
            total_rows=len(df),
            processed_rows=processed,
            errors=errors,
            warnings=[]
        )
        logger.info(f"Import completed: {result.dict()}")
        return result
        
    except Exception as e:
        logger.exception(f"Import failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 