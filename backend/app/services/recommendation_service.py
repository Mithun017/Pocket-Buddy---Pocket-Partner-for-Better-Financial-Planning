import numpy as np
from typing import List, Dict
from app.models.user import UserProfile
from sklearn.cluster import KMeans
import json

class RecommendationService:
    # Asset allocation templates
    ALLOCATIONS = {
        "low": {"bonds": 50, "mutual_funds": 30, "stocks": 10, "liquid": 10},
        "medium": {"bonds": 30, "mutual_funds": 35, "stocks": 25, "liquid": 10},
        "high": {"bonds": 10, "mutual_funds": 25, "stocks": 50, "liquid": 15},
    }

    GOAL_ALLOCATIONS = {
        "short-term": {"liquid_funds": 60, "debt_funds": 30, "equity": 10},
        "long-term": {"equity": 60, "debt_funds": 25, "liquid_funds": 15},
    }

    SPECIFIC_RECOMMENDATIONS = {
        "low": [
            {"name": "Government Bonds", "category": "bonds", "expected_return": "6-7%", "risk_level": "low"},
            {"name": "Blue-chip Debt Funds", "category": "mutual_funds", "expected_return": "7-8%", "risk_level": "low"},
            {"name": "FD-like Instruments", "category": "fixed_deposit", "expected_return": "5-6%", "risk_level": "low"},
        ],
        "medium": [
            {"name": "Balanced Mutual Funds", "category": "mutual_funds", "expected_return": "10-12%", "risk_level": "medium"},
            {"name": "NIFTY 50 Index Fund", "category": "stocks", "expected_return": "12-15%", "risk_level": "medium"},
            {"name": "Corporate Bonds", "category": "bonds", "expected_return": "8-10%", "risk_level": "medium"},
        ],
        "high": [
            {"name": "Growth Stocks", "category": "stocks", "expected_return": "15-20%", "risk_level": "high"},
            {"name": "Small-cap Funds", "category": "mutual_funds", "expected_return": "18-25%", "risk_level": "high"},
            {"name": "Sectoral Funds", "category": "mutual_funds", "expected_return": "20-30%", "risk_level": "high"},
        ],
    }

    def get_rule_based_recommendations(self, profile: UserProfile) -> Dict:
        """Generate rule-based recommendations based on user profile"""
        risk = profile.risk_appetite
        goal = profile.financial_goals

        # Get base allocation
        allocation = self.ALLOCATIONS.get(risk, self.ALLOCATIONS["medium"]).copy()

        # Adjust for goal
        if goal == "short-term":
            allocation["liquid"] += 10
            allocation["stocks"] = max(5, allocation["stocks"] - 5)
        else:
            allocation["stocks"] += 10
            allocation["bonds"] = max(5, allocation["bonds"] - 5)

        # Normalize
        total = sum(allocation.values())
        allocation = {k: round(v / total * 100, 1) for k, v in allocation.items()}

        # Calculate expected returns
        expected_return = self._calculate_expected_return(risk)

        return {
            "portfolio_allocation": allocation,
            "specific_recommendations": self.SPECIFIC_RECOMMENDATIONS.get(risk, []),
            "expected_annual_return": expected_return,
            "risk_score": self._calculate_risk_score(profile),
            "diversification_strategy": self._get_diversification_strategy(risk, profile.savings),
            "investment_amount_suggestion": self._suggest_investment_amount(profile)
        }

    def _calculate_expected_return(self, risk: str) -> str:
        returns = {"low": "6-8%", "medium": "10-12%", "high": "15-20%"}
        return returns.get(risk, "8-10%")

    def _calculate_risk_score(self, profile: UserProfile) -> int:
        """Calculate risk score from 1-100"""
        score = 0

        # Age factor (younger = higher risk capacity)
        if profile.age < 30:
            score += 30
        elif profile.age < 40:
            score += 20
        elif profile.age < 50:
            score += 10
        else:
            score += 5

        # Risk appetite
        risk_scores = {"low": 10, "medium": 50, "high": 90}
        score += risk_scores.get(profile.risk_appetite, 50)

        # Savings ratio (savings/income)
        if profile.income > 0:
            savings_ratio = profile.savings / profile.income
            if savings_ratio > 0.5:
                score += 20
            elif savings_ratio > 0.3:
                score += 10
            else:
                score += 5

        return min(100, max(1, score))

    def _get_diversification_strategy(self, risk: str, savings: float) -> Dict:
        """Suggest diversification based on risk and capital"""
        if savings < 100000:
            return {
                "strategy": "concentrated",
                "num_instruments": "3-5",
                "rationale": "With limited capital, focus on quality over quantity"
            }
        elif savings < 500000:
            return {
                "strategy": "moderate",
                "num_instruments": "5-8",
                "rationale": "Balance between diversification and manageable portfolio"
            }
        else:
            return {
                "strategy": "diversified",
                "num_instruments": "8-12",
                "rationale": "Adequate capital for full diversification across asset classes"
            }

    def _suggest_investment_amount(self, profile: UserProfile) -> Dict:
        """Suggest monthly investment amount"""
        if profile.income > 0:
            # Recommend 20-30% of income based on age
            if profile.age < 35:
                pct = 0.30
            elif profile.age < 50:
                pct = 0.25
            else:
                pct = 0.20

            monthly = profile.income / 12 * pct
            return {
                "monthly_suggested": round(monthly, 2),
                "percentage_of_income": f"{int(pct*100)}%",
                "rationale": "Based on age-appropriate savings rate"
            }
        return {"monthly_suggested": 5000, "percentage_of_income": "N/A", "rationale": "Default recommendation"}

    def ml_cluster_recommendations(self, user_profiles: List[Dict], current_profile: UserProfile) -> Dict:
        """Advanced ML-based clustering for similar users"""
        if len(user_profiles) < 5:
            return {"message": "Insufficient data for ML recommendations", "clusters": None}

        # Prepare features
        features = []
        for profile in user_profiles:
            p = profile.get("profile", {})
            if p:
                features.append([
                    p.get("age", 30),
                    p.get("income", 50000) / 100000,  # Normalize
                    p.get("savings", 10000) / 100000,  # Normalize
                    {"low": 0, "medium": 1, "high": 2}.get(p.get("risk_appetite"), 1),
                    {"short-term": 0, "long-term": 1}.get(p.get("financial_goals"), 1)
                ])

        if len(features) < 5:
            return {"message": "Insufficient data for ML recommendations", "clusters": None}

        # Apply K-Means clustering
        kmeans = KMeans(n_clusters=min(3, len(features)), random_state=42)
        clusters = kmeans.fit_predict(features)

        # Find current user's cluster
        current_features = [
            current_profile.age,
            current_profile.income / 100000,
            current_profile.savings / 100000,
            {"low": 0, "medium": 1, "high": 2}.get(current_profile.risk_appetite, 1),
            {"short-term": 0, "long-term": 1}.get(current_profile.financial_goals, 1)
        ]

        user_cluster = kmeans.predict([current_features])[0]

        # Find similar users
        similar_users = [i for i, c in enumerate(clusters) if c == user_cluster]

        return {
            "user_cluster": int(user_cluster),
            "similar_users_count": len(similar_users),
            "cluster_characteristics": self._describe_cluster(kmeans.cluster_centers_[user_cluster]),
            "recommendation": "Users similar to you prefer diversified portfolios with moderate risk"
        }

    def _describe_cluster(self, centroid) -> Dict:
        """Describe cluster characteristics"""
        age = int(centroid[0])
        income = centroid[1] * 100000
        risk_score = centroid[3]

        risk_level = "low" if risk_score < 0.8 else "medium" if risk_score < 1.8 else "high"

        return {
            "average_age": age,
            "average_income": round(income, 2),
            "dominant_risk_appetite": risk_level
        }
