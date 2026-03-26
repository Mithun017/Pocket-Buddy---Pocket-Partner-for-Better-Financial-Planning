from fastapi import APIRouter, Depends, HTTPException
from app.models.user import UserProfile
from app.services.auth_service import AuthService
from app.utils.auth import get_current_user
from typing import Dict

router = APIRouter(prefix="/user", tags=["User"])
auth_service = AuthService()

@router.post("/profile")
async def update_profile(profile: UserProfile, current_user: Dict = Depends(get_current_user)):
    """Update user profile"""
    result = await auth_service.update_profile(current_user["_id"], profile)
    return result

@router.get("/profile")
async def get_profile(current_user: Dict = Depends(get_current_user)):
    """Get user profile"""
    profile = await auth_service.get_profile(current_user["_id"])
    return profile
