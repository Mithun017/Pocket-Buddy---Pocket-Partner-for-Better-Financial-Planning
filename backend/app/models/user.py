from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    age: int
    income: float
    savings: float
    risk_appetite: Literal["low", "medium", "high"]
    financial_goals: Literal["short-term", "long-term"]
    investment_preferences: list[str]

class UserInDB(UserBase):
    id: str
    hashed_password: str
    profile: Optional[UserProfile] = None
    created_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None
