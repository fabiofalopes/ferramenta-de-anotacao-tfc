from pydantic import BaseModel, EmailStr, Field, constr
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class ImportType(str, Enum):
    GENERIC = "generic"
    CHAT = "chat"


# Base Models
class UserBase(BaseModel):
    email: EmailStr


class ProjectBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class DataContainerBase(BaseModel):
    name: str
    meta_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = "pending"


class DataItemBase(BaseModel):
    content: str
    meta_data: Dict[str, Any] = Field(default_factory=dict)
    type: str = "generic"


class ImportedDataBase(DataItemBase):
    type: Literal["imported_data"] = "imported_data"
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    source: Optional[str] = None


class ChatMessageBase(DataItemBase):
    type: Literal["chat_message"] = "chat_message"
    turn_id: Optional[str] = None
    user_id: Optional[str] = None
    turn_text: Optional[str] = None
    timestamp: Optional[datetime] = None
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


class DataContainerCreate(DataContainerBase):
    project_id: int


class DataItemCreate(DataItemBase):
    container_id: int


class ImportedDataCreate(DataItemCreate):
    type: Literal["imported_data"] = "imported_data"
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    source: Optional[str] = None
    
    def to_data_item(self) -> Dict[str, Any]:
        """Convert to base DataItem with appropriate metadata"""
        meta_data = self.meta_data or {}
        if self.title is not None:
            meta_data["title"] = self.title
        if self.category is not None:
            meta_data["category"] = self.category
        if self.tags is not None:
            meta_data["tags"] = self.tags
        if self.source is not None:
            meta_data["source"] = self.source
            
        return {
            "container_id": self.container_id,
            "content": self.content,
            "type": self.type,
            "meta_data": meta_data
        }


class ChatMessageCreate(DataItemCreate):
    type: Literal["chat_message"] = "chat_message"
    turn_id: Optional[str] = None
    user_id: Optional[str] = None
    turn_text: Optional[str] = None
    timestamp: Optional[datetime] = None
    reply_to_turn: Optional[str] = None
    
    def to_data_item(self) -> Dict[str, Any]:
        """Convert to base DataItem with appropriate metadata"""
        meta_data = self.meta_data or {}
        if self.turn_id is not None:
            meta_data["turn_id"] = self.turn_id
        if self.user_id is not None:
            meta_data["user_id"] = self.user_id
        if self.turn_text is not None:
            meta_data["turn_text"] = self.turn_text
        if self.timestamp is not None:
            meta_data["timestamp"] = self.timestamp
        if self.reply_to_turn is not None:
            meta_data["reply_to_turn"] = self.reply_to_turn
            
        return {
            "container_id": self.container_id,
            "content": self.content if self.content else (self.turn_text or ""),
            "type": self.type,
            "meta_data": meta_data
        }


class AnnotationCreate(AnnotationBase):
    item_id: int


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


class DataContainer(DataContainerBase):
    id: int
    project_id: int
    created_at: datetime
    status: str

    class Config:
        from_attributes = True


class DataItem(DataItemBase):
    id: int
    container_id: int
    created_at: datetime

    # Helper properties for backward compatibility
    @property
    def title(self) -> Optional[str]:
        return self.meta_data.get("title")
    
    @property
    def category(self) -> Optional[str]:
        return self.meta_data.get("category")
    
    @property
    def tags(self) -> Optional[Dict[str, Any]]:
        return self.meta_data.get("tags")
    
    @property
    def source(self) -> Optional[str]:
        return self.meta_data.get("source")
        
    # Chat message fields
    @property
    def turn_id(self) -> Optional[str]:
        return self.meta_data.get("turn_id")
    
    @property
    def user_id(self) -> Optional[str]:
        return self.meta_data.get("user_id")
    
    @property
    def turn_text(self) -> Optional[str]:
        return self.meta_data.get("turn_text")
    
    @property
    def reply_to_turn(self) -> Optional[str]:
        return self.meta_data.get("reply_to_turn")
    
    @property
    def timestamp(self) -> Optional[datetime]:
        return self.meta_data.get("timestamp")

    class Config:
        from_attributes = True


class ImportedData(DataItem):
    class Config:
        from_attributes = True


class ChatMessage(DataItem):
    class Config:
        from_attributes = True


class Annotation(AnnotationBase):
    id: int
    item_id: int
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


# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Import Models
class MapField(BaseModel):
    source_field: str
    target_field: str
    default_value: Optional[Any] = None
    transform: Optional[str] = None  # Python expression for simple transforms


class CSVImportRequest(BaseModel):
    project_id: int
    container_name: str
    import_type: ImportType = ImportType.GENERIC
    data_type: str = "generic"
    field_mapping: List[MapField]
    

class ChatCSVImportRequest(CSVImportRequest):
    import_type: Literal[ImportType.CHAT] = ImportType.CHAT
    data_type: Literal["chat_message"] = "chat_message"
    field_mapping: List[MapField] = Field(
        default=[
            MapField(source_field="user_id", target_field="user_id"),
            MapField(source_field="turn_id", target_field="turn_id"),
            MapField(source_field="turn_text", target_field="turn_text"),
            MapField(source_field="reply_to_turn", target_field="reply_to_turn")
        ]
    )


class ImportStatus(BaseModel):
    id: str
    status: str
    progress: float
    total_rows: int
    processed_rows: int
    errors: List[str]
    warnings: List[str] = Field(default_factory=list) 