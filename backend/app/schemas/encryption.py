from pydantic import BaseModel, Field
from typing import Optional

class EncryptLabRequest(BaseModel):
    plaintext: str = Field(..., min_length=1, max_length=10000)
    custom_key_hex: Optional[str] = Field(None, description="Optional 64-character hex key (256-bit). If omitted, dedicated lab key is used.")
    aad_string: Optional[str] = Field(None, max_length=500, description="Optional Associated Authenticated Data")

class EncryptLabResponse(BaseModel):
    success: bool
    algorithm: str = "AES-256-GCM"
    key_preview: str # Partial preview e.g. "d1f2...ef0" to demonstrate key separation without full leak
    nonce: str
    auth_tag: str
    ciphertext: str
    ciphertext_length_bytes: int
    plaintext_length_bytes: int
    aad_used: Optional[str] = None

class DecryptLabRequest(BaseModel):
    ciphertext: str
    nonce: str
    auth_tag: str
    custom_key_hex: Optional[str] = Field(None, description="Key to use for decryption")
    aad_string: Optional[str] = None

class DecryptLabResponse(BaseModel):
    success: bool
    decrypted_plaintext: Optional[str] = None
    integrity_verified: bool
    error_message: Optional[str] = None
    verification_details: str

class TamperLabRequest(BaseModel):
    ciphertext: str
    nonce: str
    auth_tag: str
    target: str = Field("ciphertext", pattern="^(ciphertext|nonce|auth_tag)$")
    byte_index: int = 0

class TamperLabResponse(BaseModel):
    tampered_ciphertext: str
    tampered_nonce: str
    tampered_auth_tag: str
    tampered_component: str
    description: str
