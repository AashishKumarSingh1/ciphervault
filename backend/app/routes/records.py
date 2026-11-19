from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.schemas.records import (
    RecordCreateRequest,
    RecordUpdateRequest,
    EncryptedRecordResponse,
    DecryptedRecordResponse
)
from app.services.record_service import RecordService
from app.services.crypto_service import AuthenticationTagVerificationError
from app.middleware.authentication import get_current_user

router = APIRouter(prefix="/api/records", tags=["Secure Records"])

@router.post("", response_model=EncryptedRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    req: RecordCreateRequest,
    user: dict = Depends(get_current_user)
):
    try:
        return RecordService.create_record(user, req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create encrypted record: {str(e)}")

@router.get("", response_model=List[EncryptedRecordResponse])
def list_records(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    return RecordService.list_records(user, category=category, search=search)

@router.get("/{record_id}", response_model=DecryptedRecordResponse)
def get_decrypted_record(
    record_id: str,
    user: dict = Depends(get_current_user)
):
    try:
        return RecordService.get_decrypted_record(record_id, user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except AuthenticationTagVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Integrity check failed: Authentication tag does not match ciphertext."
        )

@router.put("/{record_id}", response_model=EncryptedRecordResponse)
def update_record(
    record_id: str,
    req: RecordUpdateRequest,
    user: dict = Depends(get_current_user)
):
    try:
        return RecordService.update_record(record_id, user, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")

@router.delete("/{record_id}")
def delete_record(
    record_id: str,
    user: dict = Depends(get_current_user)
):
    try:
        RecordService.delete_record(record_id, user)
        return {"success": True, "message": "Record securely deleted."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
