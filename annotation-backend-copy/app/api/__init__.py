from fastapi import APIRouter
from . import auth, admin, projects, chat_disentanglement, data, import_data, annotations

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(chat_disentanglement.router, prefix="/chat", tags=["chat"])
api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(import_data.router, prefix="/import", tags=["import"])
api_router.include_router(annotations.router, prefix="/annotations", tags=["annotations"])

__all__ = [
    "auth", 
    "admin", 
    "projects", 
    "chat_disentanglement", 
    "data", 
    "import_data", 
    "annotations"
] 