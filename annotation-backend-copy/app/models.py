from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, Boolean, DateTime, Float
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column
from sqlalchemy.sql import func
from typing import Optional, Dict, Any
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project_assignments = relationship("ProjectAssignment", back_populates="user")


class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)  # e.g., "chat_disentanglement"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Commented out temporarily - needs migration
    # meta_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    containers = relationship("DataContainer", back_populates="project")
    assignments = relationship("ProjectAssignment", back_populates="project")


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    
    # Relationships
    user = relationship("User", back_populates="project_assignments")
    project = relationship("Project", back_populates="assignments")


class DataContainer(Base):
    __tablename__ = "data_containers"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    meta_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending, processing, completed, failed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="containers")
    items = relationship("DataItem", back_populates="container")


class DataItem(Base):
    __tablename__ = "data_items"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    container_id: Mapped[int] = mapped_column(ForeignKey("data_containers.id"))
    content: Mapped[str] = mapped_column(Text)
    meta_data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    type: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    container = relationship("DataContainer", back_populates="items")
    annotations = relationship("Annotation", back_populates="item")

    __mapper_args__ = {
        "polymorphic_identity": "generic",
        "polymorphic_on": "type",
    }
    
    # Helper methods for accessing metadata fields
    def get_meta(self, key, default=None):
        """Get a metadata field with a default value if not found"""
        return self.meta_data.get(key, default)
    
    def set_meta(self, key, value):
        """Set a metadata field"""
        self.meta_data[key] = value
        
    # Common field accessors
    @property
    def title(self) -> Optional[str]:
        """Get the title from metadata"""
        return self.get_meta("title")
    
    @title.setter
    def title(self, value: str):
        """Set the title in metadata"""
        self.set_meta("title", value)
        
    @property
    def category(self) -> Optional[str]:
        """Get the category from metadata"""
        return self.get_meta("category")
    
    @category.setter
    def category(self, value: str):
        """Set the category in metadata"""
        self.set_meta("category", value)
        
    @property
    def tags(self) -> Optional[Dict[str, Any]]:
        """Get the tags from metadata"""
        return self.get_meta("tags")
    
    @tags.setter
    def tags(self, value: Dict[str, Any]):
        """Set the tags in metadata"""
        self.set_meta("tags", value)
        
    @property
    def source(self) -> Optional[str]:
        """Get the source from metadata"""
        return self.get_meta("source")
    
    @source.setter
    def source(self, value: str):
        """Set the source in metadata"""
        self.set_meta("source", value)


# No longer needed as a separate table, kept for backward compatibility
class ImportedData(DataItem):
    """Compatibility layer for ImportedData.
    All fields now stored in meta_data of parent DataItem.
    """
    __mapper_args__ = {
        "polymorphic_identity": "imported_data",
    }
    
    @property
    def title(self) -> Optional[str]:
        return self.get_meta("title")
    
    @title.setter
    def title(self, value: str):
        self.set_meta("title", value)
    
    @property
    def category(self) -> Optional[str]:
        return self.get_meta("category")
    
    @category.setter
    def category(self, value: str):
        self.set_meta("category", value)
    
    @property
    def tags(self) -> Optional[Dict[str, Any]]:
        return self.get_meta("tags")
    
    @tags.setter
    def tags(self, value: Dict[str, Any]):
        self.set_meta("tags", value)
    
    @property
    def source(self) -> Optional[str]:
        return self.get_meta("source")
    
    @source.setter
    def source(self, value: str):
        self.set_meta("source", value)


class ChatMessage(DataItem):
    """Chat message data item with specific chat fields"""
    __mapper_args__ = {
        "polymorphic_identity": "chat_message",
    }
    
    @property
    def turn_id(self) -> str:
        """Get the turn ID from metadata"""
        return str(self.get_meta("turn_id", self.id))
    
    @turn_id.setter
    def turn_id(self, value: str):
        self.set_meta("turn_id", value)
    
    @property
    def user_id(self) -> str:
        """Get the user ID from metadata"""
        return str(self.get_meta("user_id", "unknown"))
    
    @user_id.setter
    def user_id(self, value: str):
        self.set_meta("user_id", value)
    
    @property
    def reply_to_turn(self) -> Optional[str]:
        """Get the reply-to turn ID from metadata"""
        return self.get_meta("reply_to_turn")
    
    @reply_to_turn.setter
    def reply_to_turn(self, value: str):
        self.set_meta("reply_to_turn", value)
    
    @property
    def timestamp(self) -> Optional[datetime]:
        """Get the message timestamp from metadata"""
        return self.get_meta("timestamp")
    
    @timestamp.setter
    def timestamp(self, value: datetime):
        self.set_meta("timestamp", value)


class Annotation(Base):
    __tablename__ = "annotations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("data_items.id"))
    type: Mapped[str] = mapped_column(String)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    item = relationship("DataItem", back_populates="annotations")
    user = relationship("User")

    __mapper_args__ = {
        "polymorphic_identity": "annotation",
        "polymorphic_on": "type",
    }


class ThreadAnnotation(Annotation):
    __tablename__ = "thread_annotations"
    
    id: Mapped[int] = mapped_column(ForeignKey("annotations.id"), primary_key=True)
    thread_id: Mapped[str] = mapped_column(String)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __mapper_args__ = {
        "polymorphic_identity": "thread",
    } 