from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from ..database import get_db
from ..models import User, Project, ProjectAssignment
from ..schemas import Project as ProjectSchema, ProjectCreate, User as UserSchema
from ..auth import get_current_user
from ..config import get_project_type, PROJECT_TYPES, validate_project_metadata

router = APIRouter()


@router.get("/types", response_model=Dict[str, Any])
async def get_project_types():
    """Get all registered project types"""
    return {
        type_id: {
            "name": schema.name,
            "description": schema.description,
            "data_item_types": schema.data_item_types,
            "annotation_types": schema.annotation_types,
            "fields": [field.model_dump() for field in schema.fields]
        }
        for type_id, schema in PROJECT_TYPES.items()
    }


@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create projects"
        )
    
    # Validate project type
    project_type = get_project_type(project.type)
    if not project_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid project type: {project.type}"
        )
    
    # Create project
    try:
        project_data = project.model_dump(exclude_unset=True, exclude={"meta_data"})
        
        db_project = Project(**project_data)
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        return db_project
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


@router.get("/", response_model=List[ProjectSchema])
async def list_user_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects assigned to the current user"""
    if current_user.is_admin:
        # Admins can see all projects
        result = await db.execute(select(Project))
        return result.scalars().all()
    
    # Regular users only see assigned projects
    query = (
        select(Project)
        .join(ProjectAssignment)
        .where(ProjectAssignment.user_id == current_user.id)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project if the user has access"""
    # First check if project exists
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check access
    if not current_user.is_admin:
        query = select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.user_id == current_user.id
        )
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this project"
            )
    
    return project


@router.post("/{project_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def assign_user_to_project(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a user to a project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign users to projects"
        )
    
    # Check if project exists
    project_query = select(Project).where(Project.id == project_id)
    project_result = await db.execute(project_query)
    if not project_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if assignment already exists
    assignment_query = select(ProjectAssignment).where(
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.user_id == user_id
    )
    assignment_result = await db.execute(assignment_query)
    if assignment_result.scalar_one_or_none():
        return  # Already assigned
    
    # Create assignment
    assignment = ProjectAssignment(project_id=project_id, user_id=user_id)
    db.add(assignment)
    await db.commit()


@router.delete("/{project_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_project(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a user from a project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove users from projects"
        )
    
    # Find and delete assignment
    query = select(ProjectAssignment).where(
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.user_id == user_id
    )
    result = await db.execute(query)
    assignment = result.scalar_one_or_none()
    
    if assignment:
        await db.delete(assignment)
        await db.commit()


@router.get("/{project_id}/users", response_model=List[UserSchema])
async def get_project_users(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users assigned to a project"""
    # First check if project exists and user has access
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check access if not admin
    if not current_user.is_admin:
        query = select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.user_id == current_user.id
        )
        result = await db.execute(query)
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this project"
            )
    
    # Get all users assigned to the project
    query = (
        select(User)
        .join(ProjectAssignment)
        .where(ProjectAssignment.project_id == project_id)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: int,
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update projects"
        )
    
    # Check if project exists
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Validate project type
    project_type = get_project_type(project_data.type)
    if not project_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid project type: {project_data.type}"
        )
    
    try:
        # Update project
        update_data = project_data.model_dump(exclude_unset=True, exclude={"meta_data"})
        
        for field, value in update_data.items():
            setattr(project, field, value)
        
        await db.commit()
        await db.refresh(project)
        
        return project
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        ) 