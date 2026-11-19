from fastapi import APIRouter
from app.schemas.security import SecuritySuiteResponse
from app.services.security_service import SecurityService

router = APIRouter(prefix="/api/security", tags=["Security Center"])

@router.post("/run-tests", response_model=SecuritySuiteResponse)
def run_security_tests():
    """Executes the automated security & cryptographic verification suite."""
    suite = SecurityService.run_all_security_tests()
    return SecuritySuiteResponse(**suite)

@router.get("/overview")
def get_security_overview():
    """Returns cryptographic configuration and security posture."""
    return {
        "encryption_algorithm": "AES-256-GCM",
        "key_length_bits": 256,
        "nonce_length_bits": 96,
        "tag_length_bits": 128,
        "mode": "Galois/Counter Mode (Authenticated)",
        "password_hashing": "Bcrypt (12 rounds)",
        "session_storage": "Server-side SQLite + HttpOnly Cookie",
        "aad_enabled": True,
        "protection_features": [
            "Authenticated Encryption with Associated Data (AEAD)",
            "Cryptographically random nonces (zero reuse)",
            "Pre-persistence encryption (zero plaintext at rest)",
            "Tamper-evident authentication tag verification",
            "Salted bcrypt password hashing",
            "Rate limiting & audit logging"
        ]
    }
