import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.services.auth_service import AuthService
from app.services.record_service import RecordService
from app.schemas.records import RecordCreateRequest
from app.routes import (
    auth,
    records,
    encryption,
    performance,
    security,
    dashboard
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables
    init_db()
    # Seed default admin user
    AuthService.seed_default_admin()
    
    # Check if records need initial seed data for demonstration
    admin_user = AuthService.get_user_from_session("init") # fallback query
    from app.database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username FROM users WHERE username = 'admin';")
        admin_row = cursor.fetchone()
        if admin_row:
            admin_user_dict = {"id": admin_row["id"], "username": admin_row["username"], "role": "admin"}
            cursor.execute("SELECT COUNT(*) as count FROM encrypted_records;")
            if cursor.fetchone()["count"] == 0:
                initial_samples = [
                    RecordCreateRequest(
                        full_name="Sarah Connor",
                        email="sarah.connor@cyberdyne-defense.net",
                        phone_number="+1 (555) 839-2041",
                        category="Identity",
                        sensitive_notes="Biometric passport ID: US94827104. High-threat evasive identity profile."
                    ),
                    RecordCreateRequest(
                        full_name="Alexander Hamilton",
                        email="treasury.sec@federalreserve-audit.gov",
                        phone_number="+1 (555) 204-9182",
                        category="Financial",
                        sensitive_notes="Primary treasury vault master PIN: 8492-1049-3829. Root clearance level 5."
                    ),
                    RecordCreateRequest(
                        full_name="Dr. Evelyn Reed",
                        email="evelyn.reed@st-jude-oncology.org",
                        phone_number="+1 (555) 302-8471",
                        category="Medical",
                        sensitive_notes="Genome sequencing data and chemotherapy titration metrics. Confidential HIPAA class 4."
                    ),
                    RecordCreateRequest(
                        full_name="Marcus Vance",
                        email="m.vance@cryptosolutions.io",
                        phone_number="+1 (555) 774-2910",
                        category="Credentials",
                        sensitive_notes="Production database cluster replication token: ciphervault_master_rep_8839201948201."
                    )
                ]
                for sample in initial_samples:
                    RecordService.create_record(admin_user_dict, sample)

    yield

app = FastAPI(
    title="CipherVault API",
    description="AES-256 Authenticated Secure Database Management System",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(records.router)
app.include_router(encryption.router)
app.include_router(performance.router)
app.include_router(security.router)
app.include_router(dashboard.router)

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "CipherVault Backend",
        "encryption": "AES-256-GCM",
        "version": settings.VERSION
    }
