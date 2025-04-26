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
    projects = relationship("Project", secondary="project_assignments", back_populates="users")


class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project_assignments = relationship("ProjectAssignment", back_populates="project")
    users = relationship("User", secondary="project_assignments", back_populates="projects")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    turn_id: Mapped[str] = mapped_column(String)
    user_id: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reply_to_turn: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project")
    annotations = relationship("Annotation", back_populates="message")


class Annotation(Base):
    __tablename__ = "annotations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id"))
    type: Mapped[str] = mapped_column(String)
    data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    message = relationship("ChatMessage", back_populates="annotations")
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


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project")
    user = relationship("User") 