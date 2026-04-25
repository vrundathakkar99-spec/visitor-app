from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PIN = os.environ.get('ADMIN_PIN', '1234')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ---- Models ----
class VisitorCreate(BaseModel):
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str
    photo_base64: Optional[str] = None  # data URL or raw base64


class Visitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str
    photo_base64: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]


class PinVerify(BaseModel):
    pin: str


# ---- Routes ----
@api_router.get("/")
async def root():
    return {"message": "Visitor Entry API"}


@api_router.post("/visitors", response_model=Visitor)
async def create_visitor(payload: VisitorCreate):
    if not payload.full_name.strip() or not payload.mobile.strip() or not payload.purpose.strip():
        raise HTTPException(status_code=400, detail="full_name, mobile and purpose are required")
    visitor = Visitor(**payload.model_dump())
    await db.visitors.insert_one(visitor.model_dump())
    return visitor


@api_router.get("/visitors", response_model=List[Visitor])
async def list_visitors(x_admin_pin: Optional[str] = Header(default=None)):
    if x_admin_pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid admin PIN")
    docs = await db.visitors.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Visitor(**d) for d in docs]


@api_router.get("/visitors/by-mobile/{mobile}", response_model=List[Visitor])
async def list_by_mobile(mobile: str):
    docs = await db.visitors.find({"mobile": mobile}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Visitor(**d) for d in docs]


@api_router.get("/visitors/{visitor_id}", response_model=Visitor)
async def get_visitor(visitor_id: str):
    doc = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return Visitor(**doc)


@api_router.patch("/visitors/{visitor_id}/status", response_model=Visitor)
async def update_status(visitor_id: str, payload: StatusUpdate, x_admin_pin: Optional[str] = Header(default=None)):
    if x_admin_pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid admin PIN")
    result = await db.visitors.find_one_and_update(
        {"id": visitor_id},
        {"$set": {"status": payload.status}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return Visitor(**result)


@api_router.post("/admin/verify-pin")
async def verify_pin(payload: PinVerify):
    return {"ok": payload.pin == ADMIN_PIN}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
