from fastapi import FastAPI, APIRouter, HTTPException, Header, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone
import qrcode


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PIN = os.environ.get('ADMIN_PIN', '1234')

app = FastAPI()
api_router = APIRouter(prefix="/api")


VisitorCategory = Literal["factory_visit", "staff_visit", "management"]


SUB_OPTIONS: dict[str, list[str]] = {
    "factory_visit": ["Production", "QC"],
    "staff_visit": [
        "HR", "SALES", "ACCOUNT", "PURCHASE",
        "MAINTENANCE", "DESIGN", "QC", "OPERATION",
    ],
    "management": [
        "RAJKUMAR CHAUDHARY",
        "VINU CHAVDA",
        "PRABHAT SINGH KUMAR",
        "POOJA LOKHANDE",
        "KRATI GUPTA",
        "CHETNA BODKE",
    ],
}


def _generate_pass_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"MX-{today}-{random.randint(1000, 9999)}"


class VisitorCreate(BaseModel):
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str
    category: VisitorCategory = "staff_visit"
    sub_category: Optional[str] = None
    photo_base64: Optional[str] = None


class Visitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pass_number: str = Field(default_factory=_generate_pass_number)
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str
    category: VisitorCategory = "staff_visit"
    sub_category: Optional[str] = None
    photo_base64: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]


class PinVerify(BaseModel):
    pin: str


def _hydrate(doc: dict) -> Visitor:
    doc.setdefault("category", "staff_visit")
    doc.setdefault("pass_number", _generate_pass_number())
    doc.setdefault("sub_category", None)
    return Visitor(**doc)


def _validate_sub(category: str, sub: Optional[str]) -> Optional[str]:
    if sub is None or sub == "":
        return None
    allowed = SUB_OPTIONS.get(category, [])
    if sub not in allowed:
        raise HTTPException(status_code=400, detail=f"sub_category must be one of {allowed}")
    return sub


@api_router.get("/")
async def root():
    return {"message": "Visitor Entry API"}


@api_router.get("/categories")
async def get_categories():
    """Return category + sub-option map for the dropdown."""
    return SUB_OPTIONS


@api_router.post("/visitors", response_model=Visitor)
async def create_visitor(payload: VisitorCreate):
    if not payload.full_name.strip() or not payload.mobile.strip() or not payload.purpose.strip():
        raise HTTPException(status_code=400, detail="full_name, mobile and purpose are required")
    data = payload.model_dump()
    data["sub_category"] = _validate_sub(data["category"], data.get("sub_category"))
    visitor = Visitor(**data)
    await db.visitors.insert_one(visitor.model_dump())
    return visitor


@api_router.get("/visitors", response_model=List[Visitor])
async def list_visitors(x_admin_pin: Optional[str] = Header(default=None)):
    if x_admin_pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid admin PIN")
    docs = await db.visitors.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [_hydrate(d) for d in docs]


@api_router.get("/visitors/by-mobile/{mobile}", response_model=List[Visitor])
async def list_by_mobile(mobile: str):
    docs = await db.visitors.find({"mobile": mobile}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [_hydrate(d) for d in docs]


@api_router.get("/visitors/{visitor_id}", response_model=Visitor)
async def get_visitor(visitor_id: str):
    doc = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return _hydrate(doc)


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
    return _hydrate(result)


@api_router.post("/admin/verify-pin")
async def verify_pin(payload: PinVerify):
    return {"ok": payload.pin == ADMIN_PIN}


def _qr_png(text: str, box_size: int = 8) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=2,
    )
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@api_router.get("/qr")
async def qr_for(text: str = Query(..., min_length=1, max_length=2048), size: int = Query(8, ge=2, le=20)):
    """Generic QR-code generator. Returns PNG bytes."""
    png = _qr_png(text, box_size=size)
    return Response(content=png, media_type="image/png")


@api_router.get("/qr-entry")
async def qr_entry(size: int = Query(10, ge=2, le=20)):
    """QR code that opens the visitor form in any mobile browser."""
    public_url = os.environ.get("PUBLIC_APP_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://guest-pass-simple.preview.emergentagent.com"
    # Ensure trailing slash points at the form root
    if not public_url.endswith("/"):
        public_url = public_url + "/"
    png = _qr_png(public_url, box_size=size)
    return Response(
        content=png,
        media_type="image/png",
        headers={"X-Entry-Url": public_url},
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Entry-Url"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
