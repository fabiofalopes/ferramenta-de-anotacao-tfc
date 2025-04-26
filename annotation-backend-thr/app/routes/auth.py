import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User
from ..schemas import Token, UserCreate
from ..auth import (
    verify_password,
    get_password_hash,
    create_access_token
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"Login attempt for user: {form_data.username}")
    
    try:
        # Get user from database
        query = select(User).where(User.email == form_data.username)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            logger.warning(f"Authentication failed for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.email})
        logger.info(f"Successfully authenticated user: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    
    except Exception as e:
        logger.error(f"Error during authentication for user {form_data.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )

@router.post("/register", response_model=Token)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"Registration attempt for user: {user_data.email}")
    
    try:
        # Check if user exists
        query = select(User).where(User.email == user_data.email)
        result = await db.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            logger.warning(f"Registration failed: User already exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            is_admin=user_data.is_admin
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.email})
        logger.info(f"Successfully registered user: {user_data.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration for user {user_data.email}: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        ) 