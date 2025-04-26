from pydantic import BaseModel, EmailStr, Field, constr
from typing import Optional, Dict, Any, Literal
from datetime import datetime


# Base Models
class UserBase(BaseModel):
    email: EmailStr


class ProjectBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class ChatMessageBase(BaseModel):
    turn_id: str
    user_id: str
    content: str
    timestamp: datetime
    reply_to_turn: Optional[str] = None


class AnnotationBase(BaseModel):
    type: str
    data: Dict[str, Any]


class ThreadAnnotationBase(AnnotationBase):
    thread_id: constr(min_length=1, pattern=r'^[a-zA-Z0-9_-]+$') = Field(..., description="Thread ID must be at least 1 characters long and contain only letters, numbers, underscores, and hyphens")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence value between 0 and 1")
    notes: Optional[str] = None


# Create Request Models
class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False


class ProjectCreate(ProjectBase):
    pass


class ChatMessageCreate(ChatMessageBase):
    project_id: int


class AnnotationCreate(AnnotationBase):
    message_id: int


class ThreadAnnotationCreate(AnnotationCreate):
    type: Literal["thread"] = "thread"
    thread_id: str
    confidence: Optional[float] = None
    notes: Optional[str] = None


# Response Models
class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Project(ProjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(ChatMessageBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Annotation(AnnotationBase):
    id: int
    message_id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ThreadAnnotation(Annotation):
    thread_id: str
    confidence: Optional[float] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None 