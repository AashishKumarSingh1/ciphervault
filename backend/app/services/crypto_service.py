import json
import secrets
from typing import Optional, Tuple, Dict, Any
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from app.config import settings

ENCRYPTION_VERSION = "AES-256-GCM-v1"
NONCE_LENGTH = 12  # Standard 96-bit nonce for AES-GCM
KEY_LENGTH = 32    # 256-bit key

class CryptographicError(Exception):
    """Base exception for cryptographic operations."""
    pass

class AuthenticationTagVerificationError(CryptographicError):
    """Raised when authentication tag verification fails (wrong key or tampered ciphertext)."""
    pass

class CryptoService:
    @staticmethod
    def generate_key_hex() -> str:
        """Generates a secure random 256-bit key in hex format."""
        return secrets.token_hex(KEY_LENGTH)

    @classmethod
    def encrypt_data(
        cls,
        data: str | bytes | dict,
        key_bytes: bytes,
        aad: Optional[bytes] = None
    ) -> Dict[str, str]:
        """
        Encrypts plaintext or dict using AES-256-GCM.
        Generates a fresh 12-byte nonce for every single operation.
        Returns ciphertext, nonce, and auth_tag in hexadecimal format.
        """
        if len(key_bytes) != KEY_LENGTH:
            raise ValueError(f"AES-256 requires a {KEY_LENGTH}-byte key. Received {len(key_bytes)} bytes.")

        if isinstance(data, dict):
            plaintext_bytes = json.dumps(data, separators=(',', ':'), sort_keys=True).encode('utf-8')
        elif isinstance(data, str):
            plaintext_bytes = data.encode('utf-8')
        elif isinstance(data, bytes):
            plaintext_bytes = data
        else:
            raise TypeError("Data to encrypt must be str, bytes, or dict.")

        # 12-byte cryptographically secure random nonce
        nonce = get_random_bytes(NONCE_LENGTH)
        cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=nonce)

        if aad:
            cipher.update(aad)

        ciphertext, tag = cipher.encrypt_and_digest(plaintext_bytes)

        return {
            "ciphertext": ciphertext.hex(),
            "nonce": nonce.hex(),
            "auth_tag": tag.hex(),
            "encryption_version": ENCRYPTION_VERSION,
            "algorithm": "AES-256-GCM"
        }

    @classmethod
    def decrypt_data(
        cls,
        ciphertext_hex: str,
        nonce_hex: str,
        auth_tag_hex: str,
        key_bytes: bytes,
        aad: Optional[bytes] = None,
        as_json: bool = False
    ) -> Any:
        """
        Decrypts AES-256-GCM ciphertext and verifies integrity using the 16-byte authentication tag.
        Raises AuthenticationTagVerificationError if verification fails.
        """
        if len(key_bytes) != KEY_LENGTH:
            raise ValueError(f"AES-256 requires a {KEY_LENGTH}-byte key. Received {len(key_bytes)} bytes.")

        try:
            ciphertext = bytes.fromhex(ciphertext_hex)
            nonce = bytes.fromhex(nonce_hex)
            tag = bytes.fromhex(auth_tag_hex)
        except ValueError as e:
            raise CryptographicError(f"Invalid hexadecimal encoding in cryptographic components: {str(e)}")

        if len(nonce) != NONCE_LENGTH:
            raise CryptographicError(f"Invalid nonce length: expected {NONCE_LENGTH} bytes, got {len(nonce)}")

        cipher = AES.new(key_bytes, AES.MODE_GCM, nonce=nonce)

        if aad:
            cipher.update(aad)

        try:
            decrypted_bytes = cipher.decrypt_and_verify(ciphertext, tag)
        except (ValueError, KeyError) as e:
            raise AuthenticationTagVerificationError(
                "Decryption failed: Message authentication code (MAC) verification failed. "
                "Possible causes: incorrect key, tampered ciphertext, or corrupted authentication tag."
            ) from e

        decrypted_str = decrypted_bytes.decode('utf-8')
        if as_json:
            try:
                return json.loads(decrypted_str)
            except json.JSONDecodeError as e:
                raise CryptographicError(f"Decrypted payload is not valid JSON: {str(e)}")

        return decrypted_str

    @classmethod
    def tamper_hex_payload(cls, hex_string: str, byte_position: int = 0) -> str:
        """
        Flips bits in the given hex string to simulate data corruption or active tampering.
        """
        byte_arr = bytearray.fromhex(hex_string)
        if not byte_arr:
            return hex_string
        target_idx = byte_position % len(byte_arr)
        # Flip the lowest bit
        byte_arr[target_idx] ^= 0x01
        return byte_arr.hex()

    @classmethod
    def get_master_key(cls) -> bytes:
        """Loads master key for system record operations."""
        return settings.master_key_bytes

    @classmethod
    def get_test_key(cls) -> bytes:
        """Loads dedicated test key for lab/demonstration operations."""
        return settings.test_key_bytes
