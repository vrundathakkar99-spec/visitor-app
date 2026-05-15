from fastapi import FastAPI, APIRouter, HTTPException, Header, Query, Depends
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
import random
import re
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import qrcode


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PIN = os.environ.get('ADMIN_PIN', '1234')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS', '12'))
EMPLOYEE_DEFAULT_PASSWORD = os.environ.get('EMPLOYEE_DEFAULT_PASSWORD', 'maxwell@123')
EMPLOYEE_EMAIL_DOMAIN = os.environ.get('EMPLOYEE_EMAIL_DOMAIN', 'maxwell.com')

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)


# ---- Visitor categories / departments ----
VisitorCategory = Literal["factory_visit", "staff_visit", "management"]

# Departments + employees by department
DEPARTMENT_EMPLOYEES: dict[str, list[str]] = {
    "Operation": ["Nishit Patel"],
    "QA": ["Vaibhav Desai"],
    "QC": ["Vasant Sarla"],
    "HR": ["Mohit Goswami", "Vrunda Thakkar", "Harshida Pandor"],
    "Maintenance": ["Patel Pritesh"],
    "Account": ["Parmar Romik"],
    "Purchase": ["Ajinkya Bapat"],
    "Marketing": ["Mayur Dod", "RajvinderKaur Hunda"],
}
DEPARTMENTS_STAFF = list(DEPARTMENT_EMPLOYEES.keys()) + ["Others"]
DEPARTMENTS_FACTORY = ["Operation", "QA", "QC"]

# Management persons (existing list)
MANAGEMENT_PERSONS = [
    "RAJKUMAR CHAUDHARY",
    "VINU CHAVDA",
    "PRABHAT SINGH KUMAR",
    "POOJA LOKHANDE",
    "KRATI GUPTA",
    "CHETNA BODKE",
]


def _email_from_name(name: str) -> str:
    parts = re.findall(r"[A-Za-z]+", name)
    if len(parts) == 1:
        local = parts[0].lower()
    else:
        local = f"{parts[0].lower()}.{parts[-1].lower()}"
    return f"{local}@{EMPLOYEE_EMAIL_DOMAIN}"


def _hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def _verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _create_jwt(employee_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": employee_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRE_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _generate_pass_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"MX-{today}-{random.randint(1000, 9999)}"


# ---- Pydantic models ----
class VisitorCreate(BaseModel):
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str = ""
    category: VisitorCategory = "staff_visit"
    department: Optional[str] = None  # for staff/factory; None for management
    assigned_to: Optional[str] = None  # employee/management/custom name
    photo_base64: Optional[str] = None


class Visitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pass_number: str = Field(default_factory=_generate_pass_number)
    full_name: str
    mobile: str
    purpose: str
    person_to_meet: str = ""
    category: VisitorCategory = "staff_visit"
    department: Optional[str] = None
    assigned_to: Optional[str] = None
    photo_base64: Optional[str] = None
    status: Literal["pending", "approved", "rejected"] = "pending"
    decided_by: Optional[str] = None  # "admin" or employee email
    decided_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]


class PinVerify(BaseModel):
    pin: str


class EmployeeLogin(BaseModel):
    email: str
    password: str


class Employee(BaseModel):
    id: str
    name: str
    email: str
    department: str


def _hydrate(doc: dict) -> Visitor:
    doc.setdefault("category", "staff_visit")
    doc.setdefault("pass_number", _generate_pass_number())
    doc.setdefault("department", None)
    # back-compat with old `sub_category` field
    if doc.get("assigned_to") is None and doc.get("sub_category"):
        doc["assigned_to"] = doc.get("sub_category")
    doc.setdefault("assigned_to", None)
    doc.setdefault("person_to_meet", "")
    return Visitor(**doc)


async def get_current_employee(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> dict:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    emp_id = payload.get("sub")
    if not emp_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    emp = await db.employees.find_one({"id": emp_id}, {"_id": 0, "password_hash": 0})
    if not emp:
        raise HTTPException(status_code=401, detail="Employee not found")
    return emp


async def _seed_employees():
    """Idempotently seed employees from DEPARTMENT_EMPLOYEES."""
    for dept, people in DEPARTMENT_EMPLOYEES.items():
        for name in people:
            email = _email_from_name(name)
            existing = await db.employees.find_one({"email": email})
            if existing:
                # Ensure department is up to date if it changed
                if existing.get("department") != dept or existing.get("name") != name:
                    await db.employees.update_one(
                        {"email": email},
                        {"$set": {"department": dept, "name": name}},
                    )
                continue
            await db.employees.insert_one({
                "id": str(uuid.uuid4()),
                "name": name,
                "email": email,
                "department": dept,
                "password_hash": _hash_pw(EMPLOYEE_DEFAULT_PASSWORD),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    # Ensure unique index on email
    try:
        await db.employees.create_index("email", unique=True)
    except Exception:
        pass


# ---- Public / visitor endpoints ----
@api_router.get("/")
async def root():
    return {"message": "Visitor Entry API"}


@api_router.get("/categories")
async def get_categories():
    """Return dependent-dropdown maps."""
    return {
        "departments_staff": DEPARTMENTS_STAFF,
        "departments_factory": DEPARTMENTS_FACTORY,
        "department_employees": DEPARTMENT_EMPLOYEES,
        "management_persons": MANAGEMENT_PERSONS,
    }


@api_router.post("/visitors", response_model=Visitor)
async def create_visitor(payload: VisitorCreate):
    if not payload.full_name.strip() or not payload.mobile.strip() or not payload.purpose.strip():
        raise HTTPException(status_code=400, detail="full_name, mobile and purpose are required")
    data = payload.model_dump()
    # Sanity-check assignment based on category
    if data["category"] == "management":
        if not data.get("assigned_to") or data["assigned_to"] not in MANAGEMENT_PERSONS:
            raise HTTPException(status_code=400, detail="assigned_to must be a management person")
        data["department"] = None
    elif data["category"] == "factory_visit":
        if data.get("department") not in DEPARTMENTS_FACTORY:
            raise HTTPException(status_code=400, detail=f"department must be one of {DEPARTMENTS_FACTORY}")
        if not data.get("assigned_to") or data["assigned_to"] not in DEPARTMENT_EMPLOYEES.get(data["department"], []):
            raise HTTPException(status_code=400, detail="assigned_to must be an employee of that department")
    else:  # staff_visit
        if data.get("department") not in DEPARTMENTS_STAFF:
            raise HTTPException(status_code=400, detail=f"department must be one of {DEPARTMENTS_STAFF}")
        if data["department"] == "Others":
            if not data.get("assigned_to") or not data["assigned_to"].strip():
                raise HTTPException(status_code=400, detail="assigned_to (custom person) is required for Others")
        else:
            if not data.get("assigned_to") or data["assigned_to"] not in DEPARTMENT_EMPLOYEES.get(data["department"], []):
                raise HTTPException(status_code=400, detail="assigned_to must be an employee of that department")
    # Use assigned_to as the visible person_to_meet for downstream UIs
    if not data.get("person_to_meet"):
        data["person_to_meet"] = data["assigned_to"] or ""
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


async def _do_status_update(visitor_id: str, status: str, decided_by: str) -> Visitor:
    existing = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Visitor not found")
    if existing.get("status") and existing["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Already {existing['status']} by {existing.get('decided_by') or 'someone'}")
    result = await db.visitors.find_one_and_update(
        {"id": visitor_id, "status": "pending"},
        {"$set": {
            "status": status,
            "decided_by": decided_by,
            "decided_at": datetime.now(timezone.utc).isoformat(),
        }},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=409, detail="Request was already decided")
    return _hydrate(result)


@api_router.patch("/visitors/{visitor_id}/status", response_model=Visitor)
async def update_status(
    visitor_id: str,
    payload: StatusUpdate,
    x_admin_pin: Optional[str] = Header(default=None),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    decided_by: Optional[str] = None
    # Admin path
    if x_admin_pin and x_admin_pin == ADMIN_PIN:
        decided_by = "admin"
    elif creds and creds.scheme.lower() == "bearer":
        try:
            tok = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            emp = await db.employees.find_one({"id": tok.get("sub")}, {"_id": 0})
            if not emp:
                raise HTTPException(status_code=401, detail="Employee not found")
            # Authorize: employee can decide if they are the assignee OR same department
            visitor = await db.visitors.find_one({"id": visitor_id}, {"_id": 0})
            if not visitor:
                raise HTTPException(status_code=404, detail="Visitor not found")
            allowed = (
                visitor.get("assigned_to") == emp.get("name")
                or visitor.get("department") == emp.get("department")
            )
            if not allowed:
                raise HTTPException(status_code=403, detail="Not authorized for this request")
            decided_by = emp.get("email")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not decided_by:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _do_status_update(visitor_id, payload.status, decided_by)


@api_router.post("/admin/verify-pin")
async def verify_pin(payload: PinVerify):
    return {"ok": payload.pin == ADMIN_PIN}


# ---- Employee auth ----
@api_router.post("/employee/login")
async def employee_login(payload: EmployeeLogin):
    email = (payload.email or "").strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="email and password are required")
    emp = await db.employees.find_one({"email": email})
    # Always run a verify to keep response time uniform
    valid = bool(emp) and _verify_pw(payload.password, emp.get("password_hash", ""))
    if not emp or not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _create_jwt(emp["id"], emp["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "employee": {
            "id": emp["id"],
            "name": emp["name"],
            "email": emp["email"],
            "department": emp["department"],
        },
    }


@api_router.get("/employee/me")
async def employee_me(emp: dict = Depends(get_current_employee)):
    return {"employee": {"id": emp["id"], "name": emp["name"], "email": emp["email"], "department": emp["department"]}}


@api_router.get("/employee/visitors", response_model=List[Visitor])
async def employee_visitors(emp: dict = Depends(get_current_employee)):
    """List visitor requests for the logged-in employee's department (most recent first)."""
    docs = await db.visitors.find({"department": emp["department"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [_hydrate(d) for d in docs]


# ---- QR code endpoints (public) ----
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
    png = _qr_png(text, box_size=size)
    return Response(content=png, media_type="image/png")


@api_router.get("/qr-entry")
async def qr_entry(size: int = Query(10, ge=2, le=20)):
    public_url = (os.environ.get("PUBLIC_APP_URL") or os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").strip()
    if not public_url:
        raise HTTPException(status_code=500, detail="PUBLIC_APP_URL or EXPO_PUBLIC_BACKEND_URL must be set")
    if not public_url.endswith("/"):
        public_url += "/"
    png = _qr_png(public_url, box_size=size)
    return Response(content=png, media_type="image/png", headers={"X-Entry-Url": public_url})


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


@app.on_event("startup")
async def _on_startup():
    try:
        await _seed_employees()
        logger.info("Employees seeded.")
    except Exception as e:
        logger.error("Employee seed failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
