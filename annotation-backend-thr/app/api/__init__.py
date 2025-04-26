from fastapi import APIRouter
from .auth import router as auth_router
from .chat_disentanglement import router as chat_disentanglement_router
from .projects import router as projects_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(chat_disentanglement_router, prefix="/chat", tags=["chat"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])

__all__ = [
    "auth", 
    "chat_disentanglement",
    "projects"
] 