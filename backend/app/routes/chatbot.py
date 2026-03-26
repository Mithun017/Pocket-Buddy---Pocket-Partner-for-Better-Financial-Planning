from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.services.chatbot_service import ChatbotService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])
chatbot_service = ChatbotService()

class ChatQuery(BaseModel):
    query: str
    conversation_history: Optional[List[Dict]] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: str

@router.post("/query")
async def process_chat_query(
    chat_query: ChatQuery,
    current_user: Dict = Depends(get_current_user)
):
    """Process chatbot query"""
    result = await chatbot_service.process_query(
        chat_query.query,
        current_user["_id"],
        chat_query.conversation_history
    )
    return result

@router.get("/suggestions")
async def get_suggestions(current_user: Dict = Depends(get_current_user)):
    """Get suggested questions"""
    return {
        "suggestions": [
            "Where should I invest my money?",
            "What is a good SIP amount for me?",
            "How should I diversify my portfolio?",
            "What are the best tax-saving options?",
            "Is this stock good for long-term investment?",
            "How much emergency fund should I have?",
            "What's the difference between mutual funds and stocks?"
        ]
    }
