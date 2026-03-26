from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.models.user import UserCreate, UserLogin, UserProfile
from app.services.auth_service import AuthService
from app.utils.auth import get_current_user
from typing import Dict

router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()

@router.post("/register")
async def register(user: UserCreate):
    """Register a new user"""
    result = await auth_service.register_user(user)
    return result

@router.post("/login")
async def login(user: UserLogin):
    """Login user and return JWT token"""
    result = await auth_service.login_user(user)
    return result

@router.get("/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"]
    }
