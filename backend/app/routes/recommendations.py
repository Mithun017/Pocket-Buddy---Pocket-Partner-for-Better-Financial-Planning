from fastapi import APIRouter, Depends, HTTPException
from app.services.recommendation_service import RecommendationService
from app.services.auth_service import AuthService
from app.database import get_collection
from app.utils.auth import get_current_user
from typing import Dict

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
rec_service = RecommendationService()
auth_service = AuthService()

@router.get("/")
async def get_recommendations(current_user: Dict = Depends(get_current_user)):
    """Get personalized investment recommendations"""
    # Get user profile
    user = await auth_service.get_profile(current_user["_id"])

    if not user.get("profile"):
        raise HTTPException(status_code=400, detail="Please complete your profile first")

    from app.models.user import UserProfile
    profile = UserProfile(**user["profile"])

    # Get rule-based recommendations
    recommendations = rec_service.get_rule_based_recommendations(profile)

    # Try ML recommendations (if enough data)
    users_collection = get_collection("users")
    all_users = await users_collection.find({"profile": {"$exists": True}}).to_list(length=100)

    ml_recs = rec_service.ml_cluster_recommendations(all_users, profile)

    return {
        "rule_based": recommendations,
        "ml_based": ml_recs,
        "profile_summary": {
            "risk_appetite": profile.risk_appetite,
            "financial_goals": profile.financial_goals,
            "age": profile.age
        }
    }

@router.get("/portfolio-suggestion")
async def get_portfolio_suggestion(current_user: Dict = Depends(get_current_user)):
    """Get specific portfolio allocation suggestion"""
    user = await auth_service.get_profile(current_user["_id"])

    if not user.get("profile"):
        raise HTTPException(status_code=400, detail="Please complete your profile first")

    from app.models.user import UserProfile
    profile = UserProfile(**user["profile"])

    recommendations = rec_service.get_rule_based_recommendations(profile)

    return {
        "allocation": recommendations["portfolio_allocation"],
        "specific_funds": recommendations["specific_recommendations"],
        "expected_return": recommendations["expected_annual_return"],
        "monthly_investment": recommendations["investment_amount_suggestion"]
    }
