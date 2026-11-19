import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.database import get_db
from app.services.crypto_service import CryptoService, CryptographicError, AuthenticationTagVerificationError
from app.services.auth_service import AuthService
from app.schemas.records import RecordCreateRequest, RecordUpdateRequest

class RecordService:
    @classmethod
    def create_record(cls, user: dict, req: RecordCreateRequest) -> Dict[str, Any]:
        """
        Encrypts sensitive fields using AES-256-GCM before persisting to SQLite.
        Associated Authenticated Data (AAD) is bound to the record UUID.
        """
        record_id = str(uuid.uuid4())
        master_key = CryptoService.get_master_key()

        # Sensitive payload to encrypt
        sensitive_payload = {
            "full_name": req.full_name,
            "email": req.email,
            "phone_number": req.phone_number,
            "sensitive_notes": req.sensitive_notes
        }

        # Cryptographically bind ciphertext to its unique record identifier
        aad = record_id.encode('utf-8')
        enc_result = CryptoService.encrypt_data(sensitive_payload, master_key, aad=aad)

        now = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO encrypted_records (
                    id, owner_id, category, ciphertext, nonce, auth_tag, encryption_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                record_id,
                user["id"],
                req.category,
                enc_result["ciphertext"],
                enc_result["nonce"],
                enc_result["auth_tag"],
                enc_result["encryption_version"],
                now,
                now
            ))
            conn.commit()

        AuthService.log_audit(
            user_id=user["id"],
            username=user["username"],
            action="RECORD_CREATE",
            status="SUCCESS",
            details=f"Record {record_id} encrypted with AES-256-GCM and stored."
        )

        return {
            "id": record_id,
            "owner_id": user["id"],
            "category": req.category,
            "ciphertext_preview": enc_result["ciphertext"][:32] + "...",
            "nonce": enc_result["nonce"],
            "auth_tag": enc_result["auth_tag"],
            "encryption_version": enc_result["encryption_version"],
            "created_at": now,
            "updated_at": now,
            "is_encrypted": True
        }

    @classmethod
    def list_records(
        cls,
        user: dict,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves encrypted records for the user. Never returns plaintext sensitive notes.
        """
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM encrypted_records WHERE owner_id = ?"
            params = [user["id"]]

            if category and category.lower() != "all":
                query += " AND category = ?"
                params.append(category)

            query += " ORDER BY created_at DESC;"
            cursor.execute(query, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "owner_id": row["owner_id"],
                    "category": row["category"],
                    "ciphertext_preview": row["ciphertext"][:32] + "...",
                    "nonce": row["nonce"],
                    "auth_tag": row["auth_tag"],
                    "encryption_version": row["encryption_version"],
                    "created_at": str(row["created_at"]),
                    "updated_at": str(row["updated_at"]),
                    "is_encrypted": True
                })

            return results

    @classmethod
    def get_decrypted_record(cls, record_id: str, user: dict) -> Dict[str, Any]:
        """
        Verifies ownership and decrypts sensitive data after verifying GCM authentication tag.
        """
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM encrypted_records WHERE id = ?;", (record_id,))
            row = cursor.fetchone()

            if not row:
                raise ValueError("Record not found.")

            if row["owner_id"] != user["id"] and user.get("role") != "admin":
                AuthService.log_audit(
                    user_id=user["id"],
                    username=user["username"],
                    action="UNAUTHORIZED_RECORD_ACCESS",
                    status="BLOCKED",
                    details=f"Unauthorized access attempt to record {record_id}."
                )
                raise PermissionError("Access denied: You do not have permission to view this record.")

            master_key = CryptoService.get_master_key()
            aad = record_id.encode('utf-8')

            try:
                decrypted_payload = CryptoService.decrypt_data(
                    ciphertext_hex=row["ciphertext"],
                    nonce_hex=row["nonce"],
                    auth_tag_hex=row["auth_tag"],
                    key_bytes=master_key,
                    aad=aad,
                    as_json=True
                )
            except AuthenticationTagVerificationError as e:
                AuthService.log_audit(
                    user_id=user["id"],
                    username=user["username"],
                    action="TAMPER_DETECTED",
                    status="ALERT",
                    details=f"Ciphertext verification failed for record {record_id}: MAC mismatch."
                )
                raise

            AuthService.log_audit(
                user_id=user["id"],
                username=user["username"],
                action="RECORD_DECRYPT",
                status="SUCCESS",
                details=f"Record {record_id} decrypted and MAC verified successfully."
            )

            return {
                "id": row["id"],
                "owner_id": row["owner_id"],
                "category": row["category"],
                "full_name": decrypted_payload.get("full_name", ""),
                "email": decrypted_payload.get("email", ""),
                "phone_number": decrypted_payload.get("phone_number", ""),
                "sensitive_notes": decrypted_payload.get("sensitive_notes", ""),
                "encryption_version": row["encryption_version"],
                "nonce": row["nonce"],
                "auth_tag": row["auth_tag"],
                "created_at": str(row["created_at"]),
                "updated_at": str(row["updated_at"])
            }

    @classmethod
    def update_record(cls, record_id: str, user: dict, req: RecordUpdateRequest) -> Dict[str, Any]:
        """
        Updates an existing record by decrypting, applying changes, and re-encrypting with fresh nonce.
        """
        existing = cls.get_decrypted_record(record_id, user)

        updated_name = req.full_name if req.full_name is not None else existing["full_name"]
        updated_email = req.email if req.email is not None else existing["email"]
        updated_phone = req.phone_number if req.phone_number is not None else existing["phone_number"]
        updated_notes = req.sensitive_notes if req.sensitive_notes is not None else existing["sensitive_notes"]
        updated_category = req.category if req.category is not None else existing["category"]

        new_payload = {
            "full_name": updated_name,
            "email": str(updated_email),
            "phone_number": updated_phone,
            "sensitive_notes": updated_notes
        }

        master_key = CryptoService.get_master_key()
        aad = record_id.encode('utf-8')
        enc_result = CryptoService.encrypt_data(new_payload, master_key, aad=aad)
        now = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE encrypted_records
                SET category = ?,
                    ciphertext = ?,
                    nonce = ?,
                    auth_tag = ?,
                    encryption_version = ?,
                    updated_at = ?
                WHERE id = ?;
            """, (
                updated_category,
                enc_result["ciphertext"],
                enc_result["nonce"],
                enc_result["auth_tag"],
                enc_result["encryption_version"],
                now,
                record_id
            ))
            conn.commit()

        AuthService.log_audit(
            user_id=user["id"],
            username=user["username"],
            action="RECORD_UPDATE",
            status="SUCCESS",
            details=f"Record {record_id} re-encrypted with fresh nonce and updated."
        )

        return {
            "id": record_id,
            "owner_id": user["id"],
            "category": updated_category,
            "ciphertext_preview": enc_result["ciphertext"][:32] + "...",
            "nonce": enc_result["nonce"],
            "auth_tag": enc_result["auth_tag"],
            "encryption_version": enc_result["encryption_version"],
            "created_at": existing["created_at"],
            "updated_at": now,
            "is_encrypted": True
        }

    @classmethod
    def delete_record(cls, record_id: str, user: dict) -> bool:
        """Deletes a record after checking ownership."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT owner_id FROM encrypted_records WHERE id = ?;", (record_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Record not found.")

            if row["owner_id"] != user["id"] and user.get("role") != "admin":
                raise PermissionError("Access denied.")

            cursor.execute("DELETE FROM encrypted_records WHERE id = ?;", (record_id,))
            conn.commit()

        AuthService.log_audit(
            user_id=user["id"],
            username=user["username"],
            action="RECORD_DELETE",
            status="SUCCESS",
            details=f"Record {record_id} permanently deleted."
        )
        return True
