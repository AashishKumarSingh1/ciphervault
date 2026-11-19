from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class RecordCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=5, max_length=30)
    category: str = Field(..., min_length=2, max_length=50) # e.g. "Identity", "Financial", "Medical", "Credentials"
    sensitive_notes: str = Field(..., max_length=5000)

class RecordUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, min_length=5, max_length=30)
    category: Optional[str] = Field(None, min_length=2, max_length=50)
    sensitive_notes: Optional[str] = Field(None, max_length=5000)

class EncryptedRecordResponse(BaseModel):
    id: str
    owner_id: str
    category: str
    ciphertext_preview: str
    nonce: str
    auth_tag: str
    encryption_version: str
    created_at: str
    updated_at: str
    is_encrypted: bool = True

class DecryptedRecordResponse(BaseModel):
    id: str
    owner_id: str
    category: str
    full_name: str
    email: str
    phone_number: str
    sensitive_notes: str
    encryption_version: str
    nonce: str
    auth_tag: str
    created_at: str
    updated_at: str
