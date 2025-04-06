import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_session
from ..models import User
from ..schemas.auth import Token, UserCreate
from ..services.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    logger.info(f"Login attempt for user: {form_data.username}")
    
    try:
        user = await authenticate_user(session, form_data.username, form_data.password)
        if not user:
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
    session: AsyncSession = Depends(get_session)
):
    logger.info(f"Registration attempt for user: {user_data.email}")
    
    try:
        # Check if user exists
        existing_user = await session.get(User, user_data.email)
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
        
        session.add(new_user)
        await session.commit()
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.email})
        logger.info(f"Successfully registered user: {user_data.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration for user {user_data.email}: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        ) 