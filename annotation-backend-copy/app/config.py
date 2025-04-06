from pydantic_settings import BaseSettings
from pydantic import SecretStr
from functools import lru_cache
import os
from pydantic import BaseModel
from typing import Dict, List, Optional, Any, Literal


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/postgres"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/postgres"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"  # Match .env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]  # Frontend URL
    
    # Admin user (created on first run)
    FIRST_ADMIN_EMAIL: str = "admin@example.com"
    FIRST_ADMIN_PASSWORD: str = "admin"  # Change immediately in production
    
    # File upload settings
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Project type schema definition
class ProjectTypeField(BaseModel):
    """Definition of a field in a project type"""
    name: str
    type: Literal["string", "number", "boolean", "date", "array", "object"]
    required: bool = False
    description: Optional[str] = None
    default: Optional[Any] = None


class ProjectTypeSchema(BaseModel):
    """Schema definition for a project type"""
    name: str
    description: str
    data_item_types: List[str]
    annotation_types: List[str]
    fields: List[ProjectTypeField]
    metadata_schema: Dict[str, Any] = {}


# Project type registry
PROJECT_TYPES: Dict[str, ProjectTypeSchema] = {
    "chat_disentanglement": ProjectTypeSchema(
        name="Chat Disentanglement",
        description="Annotate chat messages to identify conversation threads",
        data_item_types=["chat_message"],
        annotation_types=["thread"],
        fields=[
            ProjectTypeField(
                name="platform",
                type="string",
                required=False,
                description="Chat platform source (Discord, Slack, etc.)",
            )
        ],
        metadata_schema={
            "type": "object",
            "properties": {
                "platform": {"type": "string"},
                "channel_id": {"type": "string"},
                "start_date": {"type": "string", "format": "date-time"},
                "end_date": {"type": "string", "format": "date-time"}
            }
        }
    ),
    "generic": ProjectTypeSchema(
        name="Generic",
        description="Generic annotation project",
        data_item_types=["generic", "imported_data"],
        annotation_types=["annotation"],
        fields=[],
        metadata_schema={
            "type": "object",
            "properties": {}
        }
    )
}


def get_project_type(type_id: str) -> Optional[ProjectTypeSchema]:
    """Get a project type by ID."""
    return PROJECT_TYPES.get(type_id)


def register_project_type(type_id: str, schema: ProjectTypeSchema) -> None:
    """Register a new project type."""
    PROJECT_TYPES[type_id] = schema


def validate_project_metadata(type_id: str, metadata: Dict[str, Any]) -> bool:
    """Validate project metadata against its schema."""
    # This is a simplified validation - in a real app, use jsonschema or similar
    project_type = get_project_type(type_id)
    if not project_type:
        return False

    # Check required fields in metadata schema
    for field in project_type.fields:
        if field.required and field.name not in metadata:
            return False
            
    return True 