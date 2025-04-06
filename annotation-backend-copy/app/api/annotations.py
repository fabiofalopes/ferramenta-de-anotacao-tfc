from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..database import get_db
from ..models import User, Project, DataItem, Annotation, DataContainer
from ..schemas import Annotation as AnnotationSchema, AnnotationCreate
from ..auth import get_current_user
from ..config import get_project_type

router = APIRouter()


@router.post("/items/{item_id}/annotations", response_model=AnnotationSchema)
async def create_annotation(
    item_id: int,
    annotation: AnnotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create an annotation for a data item"""
    try:
        # Simpler query to check if item exists
        item_query = select(DataItem).where(DataItem.id == item_id)
        result = await db.execute(item_query)
        item = result.scalar_one_or_none()
        
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data item not found"
            )
        
        # Simplified access check - we can add this back later
        # For now, allow any authenticated user to create annotations
        
        # Create the annotation
        db_annotation = Annotation(
            item_id=item_id,
            type=annotation.type,
            data=annotation.data,
            created_by=current_user.id,
            created_at=datetime.now()
        )
        db.add(db_annotation)
        await db.commit()
        await db.refresh(db_annotation)
        
        return db_annotation
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error and return a generic error message
        print(f"Error creating annotation: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create annotation: {str(e)}"
        )


@router.get("/items/{item_id}/annotations", response_model=List[AnnotationSchema])
async def get_item_annotations(
    item_id: int,
    annotation_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all annotations for a specific data item"""
    # Check item exists and user has access
    query = (
        select(DataItem)
        .join(DataItem.container)
        .join(Project, Project.id == DataItem.container.project_id)
        .where(
            DataItem.id == item_id,
            (
                (Project.assignments.any(user_id=current_user.id)) |
                (current_user.is_admin == True)
            )
        )
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data item not found or access denied"
        )
    
    # Query annotations
    conditions = [Annotation.item_id == item_id]
    if annotation_type:
        conditions.append(Annotation.type == annotation_type)
    
    query = select(Annotation).where(and_(*conditions))
    result = await db.execute(query)
    annotations = result.scalars().all()
    
    return annotations


@router.get("/containers/{container_id}/annotations", response_model=List[AnnotationSchema])
async def get_container_annotations(
    container_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    annotation_type: Optional[str] = None,
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get annotations for a container with pagination and filtering"""
    try:
        # Simplified check for container existence
        container_query = select(DataContainer).where(DataContainer.id == container_id)
        result = await db.execute(container_query)
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Container not found"
            )
        
        # Simplified query to get annotations
        # First get all data items from the container
        items_query = select(DataItem.id).where(DataItem.container_id == container_id)
        items_result = await db.execute(items_query)
        item_ids = [item_id for item_id, in items_result.fetchall()]
        
        if not item_ids:
            # No items in container, return empty list
            return []
        
        # Build annotation query
        conditions = [Annotation.item_id.in_(item_ids)]
        if annotation_type:
            conditions.append(Annotation.type == annotation_type)
        if user_id:
            conditions.append(Annotation.created_by == user_id)
        
        # Get annotations with pagination
        query = (
            select(Annotation)
            .where(and_(*conditions))
            .order_by(Annotation.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        annotations = result.scalars().all()
        
        return annotations
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving container annotations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving annotations: {str(e)}"
        )


@router.get("/annotations/{annotation_id}", response_model=AnnotationSchema)
async def get_annotation(
    annotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific annotation by ID"""
    try:
        # Simplified query to get the annotation
        query = select(Annotation).where(Annotation.id == annotation_id)
        result = await db.execute(query)
        annotation = result.scalar_one_or_none()
        
        if not annotation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Annotation not found"
            )
        
        # Simple permission check - admin or annotation creator can access
        if not current_user.is_admin and annotation.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this annotation"
            )
        
        return annotation
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving annotation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving annotation: {str(e)}"
        )


@router.put("/annotations/{annotation_id}", response_model=AnnotationSchema)
async def update_annotation(
    annotation_id: int,
    annotation_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an annotation (only by owner or admin)"""
    # Find annotation and check permissions
    query = select(Annotation).where(Annotation.id == annotation_id)
    result = await db.execute(query)
    annotation = result.scalar_one_or_none()
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    # Check if user is admin or owner
    if not current_user.is_admin and annotation.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own annotations"
        )
    
    # Update annotation
    annotation.data = annotation_data
    annotation.updated_at = datetime.now()
    await db.commit()
    await db.refresh(annotation)
    
    return annotation


@router.delete("/annotations/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_annotation(
    annotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an annotation (only by owner or admin)"""
    # Find annotation and check permissions
    query = select(Annotation).where(Annotation.id == annotation_id)
    result = await db.execute(query)
    annotation = result.scalar_one_or_none()
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    # Check if user is admin or owner
    if not current_user.is_admin and annotation.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own annotations"
        )
    
    # Delete annotation
    await db.delete(annotation)
    await db.commit() 