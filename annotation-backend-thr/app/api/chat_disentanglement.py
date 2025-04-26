from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Set, Any
import pandas as pd
import json
from io import StringIO
from datetime import datetime

from ..database import get_db
from ..models import User, Project, ChatMessage, Annotation, ThreadAnnotation
from ..schemas import (
    ChatMessage as ChatMessageSchema,
    ThreadAnnotation as ThreadAnnotationSchema,
    ThreadAnnotationBase
)
from ..auth import get_current_user, get_current_admin_user

router = APIRouter()

# Constants
MANDATORY_CHAT_COLUMNS = {"user_id", "turn_id", "turn_text", "reply_to_turn"}
THREAD_COLUMN = "thread"


@router.get("/projects/{project_id}/messages", response_model=List[ChatMessageSchema])
async def list_messages(
    project_id: int,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get paginated messages from a project"""
    # Check if project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found" 
        )

    # Get messages with pagination
    query = (
        select(ChatMessage)
        .where(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.created_at)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return messages


@router.post("/messages/{message_id}/thread", response_model=ThreadAnnotationSchema)
async def annotate_thread(
    message_id: int,
    thread_data: ThreadAnnotationBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update a thread annotation for a message"""
    # Check message exists
    query = select(ChatMessage).where(ChatMessage.id == message_id)
    result = await db.execute(query)
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if annotation already exists
    query = select(ThreadAnnotation).where(
        ThreadAnnotation.message_id == message_id,
        ThreadAnnotation.created_by == current_user.id
    )
    result = await db.execute(query)
    existing_annotation = result.scalar_one_or_none()
    
    if existing_annotation:
        # Update existing annotation
        existing_annotation.thread_id = thread_data.thread_id
        existing_annotation.confidence = thread_data.confidence
        existing_annotation.notes = thread_data.notes
        existing_annotation.updated_at = datetime.now()
        await db.commit()
        return existing_annotation
    
    # Create new annotation
    annotation = ThreadAnnotation(
        message_id=message_id,
        thread_id=thread_data.thread_id,
        confidence=thread_data.confidence,
        notes=thread_data.notes,
        created_by=current_user.id,
        created_at=datetime.now()
    )
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)
    
    return annotation


@router.get("/projects/{project_id}/threads", response_model=Dict[str, List[Dict[str, Any]]])
async def get_thread_annotations(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all thread annotations for a project"""
    # Check project exists
    project_query = select(Project).where(Project.id == project_id)
    result = await db.execute(project_query)
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get all thread annotations with user information
    query = (
        select(ChatMessage, ThreadAnnotation, User)
        .select_from(ChatMessage)
        .join(ThreadAnnotation, ThreadAnnotation.message_id == ChatMessage.id)
        .join(User, User.id == ThreadAnnotation.created_by)
        .where(
            ChatMessage.project_id == project_id
        )
        .order_by(ChatMessage.created_at)
    )
    result = await db.execute(query)
    rows = result.all()
    
    # Organize by thread ID with metadata
    threads = {}
    for message, annotation, user in rows:
        thread_id = annotation.thread_id
        if thread_id:
            if thread_id not in threads:
                threads[thread_id] = []
            threads[thread_id].append({
                "turn_id": message.turn_id,
                "message_content": message.content,
                "annotation_id": annotation.id,
                "annotator": {
                    "id": user.id,
                    "email": user.email
                },
                "created_at": annotation.created_at.isoformat(),
                "updated_at": annotation.updated_at.isoformat() if annotation.updated_at else None,
                "confidence": annotation.confidence,
                "notes": annotation.notes
            })
    
    return threads


@router.post("/projects/{project_id}/import", response_model=Dict[str, Any])
async def import_chat_data(
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Import chat data from CSV file (admin only)"""
    # Check if project exists
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found" 
        )

    # Read CSV file
    content = await file.read()
    df = pd.read_csv(StringIO(content.decode()))
    
    # Validate required columns
    missing_columns = MANDATORY_CHAT_COLUMNS - set(df.columns)
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {missing_columns}"
        )
    
    # Import messages
    imported_count = 0
    for _, row in df.iterrows():
        message = ChatMessage(
            project_id=project_id,
            turn_id=str(row["turn_id"]),
            user_id=str(row["user_id"]),
            content=str(row["turn_text"]),
            timestamp=datetime.now(),  # Use current time if not provided
            reply_to_turn=str(row["reply_to_turn"]) if pd.notna(row["reply_to_turn"]) else None
        )
        db.add(message)
        imported_count += 1
    
    await db.commit()
    
    return {
        "status": "success",
        "imported_count": imported_count
    } 