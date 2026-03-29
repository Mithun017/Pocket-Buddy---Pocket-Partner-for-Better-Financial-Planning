from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routes import auth, user, recommendations, market, chatbot, quantel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title="Pocket Buddy API",
    description="AI-powered WealthTech API for personalized financial recommendations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001", # Common alternate React ports
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(recommendations.router)
app.include_router(market.router)
app.include_router(chatbot.router)
app.include_router(quantel.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Pocket Buddy API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
