import google.generativeai as genai
from typing import Dict, List
from app.config import get_settings
from app.database import get_collection

settings = get_settings()

class ChatbotService:
    def __init__(self):
        self.model = None
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            # Use gemini-1.5-flash for better compatibility with current SDK
            self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def process_query(self, query: str, user_id: str, conversation_history: List[Dict] = None) -> Dict:
        """Process user query and return AI response"""

        # Get user profile for context
        users_collection = get_collection("users")
        user = await users_collection.find_one({"_id": user_id})
        profile = user.get("profile", {}) if user else {}

        # Build context-aware prompt
        context = self._build_context(profile)

        if self.model and settings.gemini_api_key:
            try:
                response = await self._call_gemini(query, context, conversation_history)
            except Exception as e:
                # Fallback to rule-based if API fails
                print(f"Gemini API error: {e}")
                response = self._rule_based_response(query, profile)
        else:
            # Use rule-based responses if no API key
            response = self._rule_based_response(query, profile)

        return {
            "response": response,
            "context_used": bool(profile),
            "timestamp": __import__('datetime').datetime.utcnow().isoformat()
        }

    async def _call_gemini(self, query: str, context: str, history: List[Dict]) -> str:
        """Call Google Gemini API for response"""
        # Build the prompt with context and history
        system_prompt = f"You are Pocket Buddy, an AI financial advisor. {context}"

        # Build conversation as text
        conversation_parts = [system_prompt]

        if history:
            for msg in history[-5:]:  # Keep last 5 messages for context
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    conversation_parts.append(f"User: {content}")
                else:
                    conversation_parts.append(f"Assistant: {content}")

        conversation_parts.append(f"User: {query}")
        conversation_parts.append("Assistant:")

        full_prompt = "\n\n".join(conversation_parts)

        # Call Gemini API asynchronously
        try:
            # Note: in modern google-generativeai, it's just generate_content
            # but we can use asyncio.to_thread for safety if not using the async sdk variant
            import asyncio
            response = await asyncio.to_thread(
                self.model.generate_content,
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=500,
                )
            )
            return response.text
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            raise e

    def _build_context(self, profile: Dict) -> str:
        """Build context from user profile"""
        if not profile:
            return "Provide general financial advice."

        context = f"""User profile:
        - Age: {profile.get('age', 'Unknown')}
        - Income: ₹{profile.get('income', 'Unknown')}
        - Risk Appetite: {profile.get('risk_appetite', 'Unknown')}
        - Goals: {profile.get('financial_goals', 'Unknown')}
        - Preferences: {', '.join(profile.get('investment_preferences', []))}

        Tailor recommendations based on this profile."""

        return context

    def _rule_based_response(self, query: str, profile: Dict) -> str:
        """Fallback rule-based response system"""
        query_lower = query.lower()

        # Common financial queries
        responses = {
            "invest": self._get_investment_advice(profile),
            "stock": self._get_stock_advice(query_lower, profile),
            "mutual fund": self._get_mf_advice(profile),
            "sip": "SIP (Systematic Investment Plan) is a great way to invest regularly. Based on your profile, consider starting with ₹" + str(self._suggest_sip_amount(profile)) + " monthly.",
            "risk": f"Your risk appetite is {profile.get('risk_appetite', 'not set')}. This means you should {self._get_risk_guidance(profile)}.",
            "portfolio": "A balanced portfolio typically includes stocks, bonds, and mutual funds. Based on your risk profile, adjust the allocation accordingly.",
            "tax": "Consider tax-saving instruments like ELSS mutual funds, PPF, and NPS. ELSS has the shortest lock-in of 3 years.",
            "retirement": f"For retirement planning at age {profile.get('age', 'your age')}, start investing early. Consider NPS and long-term equity funds.",
            "emergency": "Keep 3-6 months of expenses in a liquid fund or savings account as an emergency corpus.",
        }

        # Find matching response
        for keyword, response in responses.items():
            if keyword in query_lower:
                return response

        # Default response
        return "I'm here to help with your financial questions. You can ask about investments, stocks, mutual funds, tax planning, or retirement. How can I assist you today?"

    def _get_investment_advice(self, profile: Dict) -> str:
        risk = profile.get("risk_appetite", "medium")
        if risk == "low":
            return "For low-risk investors, I recommend starting with debt mutual funds, government bonds, and blue-chip stocks. Consider SIPs in balanced funds."
        elif risk == "high":
            return "For high-risk investors, consider equity mutual funds, growth stocks, and sectoral funds. You might also explore small-cap funds for higher returns."
        return "For moderate risk, a balanced portfolio with 60% equity and 40% debt works well. Consider index funds and balanced advantage funds."

    def _get_stock_advice(self, query: str, profile: Dict) -> str:
        return "Stock investing requires research. Focus on companies with strong fundamentals, consistent earnings, and good management. Consider starting with NIFTY 50 companies."

    def _get_mf_advice(self, profile: Dict) -> str:
        risk = profile.get("risk_appetite", "medium")
        if risk == "low":
            return "Consider debt funds, liquid funds, and short-term funds. These provide stable returns with lower volatility."
        return "Look for diversified equity funds, index funds, or funds aligned with your goals. Review fund performance and expense ratios before investing."

    def _suggest_sip_amount(self, profile: Dict) -> int:
        income = profile.get("income", 500000)
        return int((income / 12) * 0.20 / 100) * 100

    def _get_risk_guidance(self, profile: Dict) -> str:
        risk = profile.get("risk_appetite", "medium")
        guidance = {
            "low": "prioritize capital preservation with debt instruments and fixed deposits",
            "medium": "balance growth and safety with a mix of equity and debt",
            "high": "focus on growth through equity and aggressive funds"
        }
        return guidance.get(risk, "assess your comfort with market fluctuations")
