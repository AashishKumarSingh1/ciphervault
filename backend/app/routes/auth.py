from fastapi import APIRouter, Response, Depends, HTTPException, status
from app.schemas.auth import LoginRequest, AuthResponse, UserResponse
from app.services.auth_service import AuthService
from app.middleware.authentication import get_current_user, get_current_user_optional
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, response: Response):
    success, user_dict, token_or_msg = AuthService.authenticate_user(req.username, req.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=token_or_msg
        )

    # Set HTTP-only secure cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token_or_msg,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
        path="/"
    )

    return AuthResponse(
        success=True,
        message="Authentication successful.",
        user=UserResponse(**user_dict),
        session_token=token_or_msg
    )

@router.post("/logout")
def logout(response: Response, user: dict = Depends(get_current_user)):
    # Clear cookie
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/"
    )
    return {"success": True, "message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)
