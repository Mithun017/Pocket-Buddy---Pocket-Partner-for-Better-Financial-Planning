from datetime import datetime, timedelta
from bson import ObjectId
from app.database import get_collection
from app.models.user import UserCreate, UserLogin, Token, UserInDB, UserProfile
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.config import get_settings
from fastapi import HTTPException, status

settings = get_settings()

class AuthService:
    @property
    def collection(self):
        return get_collection("users")

    async def register_user(self, user: UserCreate) -> dict:
        # Check if user exists
        existing = await self.collection.find_one({"email": user.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user
        user_dict = {
            "_id": str(ObjectId()),
            "email": user.email,
            "full_name": user.full_name,
            "hashed_password": get_password_hash(user.password),
            "profile": None,
            "created_at": datetime.utcnow()
        }

        await self.collection.insert_one(user_dict)

        # Create token
        access_token = create_access_token(
            data={"sub": user_dict["_id"]},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_dict["_id"],
            "full_name": user.full_name
        }

    async def login_user(self, user: UserLogin) -> dict:
        user_data = await self.collection.find_one({"email": user.email})
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        if not verify_password(user.password, user_data["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        access_token = create_access_token(
            data={"sub": user_data["_id"]},
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_data["_id"],
            "full_name": user_data["full_name"]
        }

    async def update_profile(self, user_id: str, profile: UserProfile) -> dict:
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"profile": profile.dict()}}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return {"message": "Profile updated successfully"}

    async def get_profile(self, user_id: str) -> dict:
        user = await self.collection.find_one({"_id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {
            "email": user["email"],
            "full_name": user["full_name"],
            "profile": user.get("profile")
        }
