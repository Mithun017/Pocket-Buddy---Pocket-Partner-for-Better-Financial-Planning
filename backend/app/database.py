from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_db():
    db.client = AsyncIOMotorClient(settings.mongodb_url)

async def close_db():
    if db.client:
        db.client.close()

def get_db():
    return db.client[settings.db_name]

def get_collection(collection_name: str):
    return get_db()[collection_name]
