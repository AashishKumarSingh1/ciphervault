from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    session_token: Optional[str] = None
