from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine
from contextlib import asynccontextmanager
from sqlalchemy import select
import logging
import uvicorn

from .config import get_settings
from .database import engine
from .models import Base, User
from .api import auth, admin, projects, chat_disentanglement, data, import_data
from .auth import get_password_hash

# Import routers (we'll create these next)
# from .api import admin, projects, annotations, chat_disentanglement

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


async def create_first_admin():
    """Create the first admin user if it doesn't exist."""
    async with engine.begin() as conn:
        # Check if admin exists
        result = await conn.execute(
            select(User).where(User.email == settings.FIRST_ADMIN_EMAIL)
        )
        if result.first() is None:
            # Create admin user
            hashed_password = get_password_hash(settings.FIRST_ADMIN_PASSWORD)
            await conn.execute(
                User.__table__.insert().values(
                    email=settings.FIRST_ADMIN_EMAIL,
                    hashed_password=hashed_password,
                    is_admin=True
                )
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create first admin user
    await create_first_admin()
    
    yield
    # Cleanup on shutdown
    await engine.dispose()


app = FastAPI(
    title="Annotation Backend",
    description="A flexible backend system for text annotation tasks",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming {request.method} request to {request.url}")
    logger.info(f"Client host: {request.client.host}")
    logger.info(f"Headers: {request.headers}")
    
    response = await call_next(request)
    
    logger.info(f"Response status: {response.status_code}")
    return response

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(data.router, prefix="/data", tags=["data"])
app.include_router(import_data.router, prefix="/import", tags=["import"])
app.include_router(
    chat_disentanglement.router,
    prefix="/chat-disentanglement",
    tags=["chat-disentanglement"]
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to the Annotation Backend API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 