from fastapi import APIRouter, HTTPException, status
from app.schemas.encryption import (
    EncryptLabRequest,
    EncryptLabResponse,
    DecryptLabRequest,
    DecryptLabResponse,
    TamperLabRequest,
    TamperLabResponse
)
from app.services.crypto_service import (
    CryptoService,
    AuthenticationTagVerificationError,
    CryptographicError
)

router = APIRouter(prefix="/api/encryption", tags=["Encryption Lab"])

@router.get("/lab-key")
def get_lab_key():
    """Returns dedicated test key for experimentation without revealing production master key."""
    test_key_bytes = CryptoService.get_test_key()
    return {
        "lab_key_hex": test_key_bytes.hex(),
        "key_length_bits": 256,
        "purpose": "Cryptographic playground testing. Distinct from production master key."
    }

@router.get("/generate-key")
def generate_sample_key():
    """Generates a random 256-bit key for playground testing."""
    return {
        "key_hex": CryptoService.generate_key_hex(),
        "key_length_bits": 256
    }

@router.post("/encrypt", response_model=EncryptLabResponse)
def encrypt_lab(req: EncryptLabRequest):
    """Encrypts plaintext using AES-256-GCM with fresh nonce."""
    try:
        if req.custom_key_hex:
            key_bytes = bytes.fromhex(req.custom_key_hex.strip())
            if len(key_bytes) != 32:
                raise ValueError("Key must be exactly 32 bytes (64 hex characters).")
        else:
            key_bytes = CryptoService.get_test_key()

        aad = req.aad_string.encode('utf-8') if req.aad_string else None
        enc_res = CryptoService.encrypt_data(req.plaintext, key_bytes, aad=aad)

        # Generate key preview e.g. "d1f2...ef0"
        key_hex = key_bytes.hex()
        key_preview = f"{key_hex[:8]}...{key_hex[-8:]}"

        return EncryptLabResponse(
            success=True,
            algorithm="AES-256-GCM",
            key_preview=key_preview,
            nonce=enc_res["nonce"],
            auth_tag=enc_res["auth_tag"],
            ciphertext=enc_res["ciphertext"],
            ciphertext_length_bytes=len(enc_res["ciphertext"]) // 2,
            plaintext_length_bytes=len(req.plaintext.encode('utf-8')),
            aad_used=req.aad_string
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encryption failed: {str(e)}")

@router.post("/decrypt", response_model=DecryptLabResponse)
def decrypt_lab(req: DecryptLabRequest):
    """Decrypts AES-256-GCM ciphertext and validates authentication tag."""
    try:
        if req.custom_key_hex:
            key_bytes = bytes.fromhex(req.custom_key_hex.strip())
            if len(key_bytes) != 32:
                raise ValueError("Key must be exactly 32 bytes (64 hex characters).")
        else:
            key_bytes = CryptoService.get_test_key()

        aad = req.aad_string.encode('utf-8') if req.aad_string else None

        plaintext = CryptoService.decrypt_data(
            ciphertext_hex=req.ciphertext,
            nonce_hex=req.nonce,
            auth_tag_hex=req.auth_tag,
            key_bytes=key_bytes,
            aad=aad
        )

        return DecryptLabResponse(
            success=True,
            decrypted_plaintext=plaintext,
            integrity_verified=True,
            verification_details="16-byte authentication tag matched. Data integrity and authenticity successfully verified."
        )
    except AuthenticationTagVerificationError as e:
        return DecryptLabResponse(
            success=False,
            decrypted_plaintext=None,
            integrity_verified=False,
            error_message="Authentication tag verification failed. Key is incorrect or ciphertext has been altered.",
            verification_details="AES-GCM GMAC verification rejected payload. Zero corrupt plaintext released."
        )
    except Exception as e:
        return DecryptLabResponse(
            success=False,
            decrypted_plaintext=None,
            integrity_verified=False,
            error_message=str(e),
            verification_details=f"Cryptographic error: {str(e)}"
        )

@router.post("/tamper", response_model=TamperLabResponse)
def tamper_lab(req: TamperLabRequest):
    """Simulates active adversary tampering on ciphertext, nonce, or tag."""
    tampered_c = req.ciphertext
    tampered_n = req.nonce
    tampered_t = req.auth_tag

    if req.target == "ciphertext":
        tampered_c = CryptoService.tamper_hex_payload(req.ciphertext, req.byte_index)
        desc = f"Flipped bit at byte position {req.byte_index} in ciphertext."
    elif req.target == "nonce":
        tampered_n = CryptoService.tamper_hex_payload(req.nonce, req.byte_index)
        desc = f"Flipped bit in 12-byte initialization nonce."
    else:
        tampered_t = CryptoService.tamper_hex_payload(req.auth_tag, req.byte_index)
        desc = f"Flipped bit in 16-byte authentication tag."

    return TamperLabResponse(
        tampered_ciphertext=tampered_c,
        tampered_nonce=tampered_n,
        tampered_auth_tag=tampered_t,
        tampered_component=req.target,
        description=desc
    )
