import pytest
import secrets
from app.services.crypto_service import (
    CryptoService,
    AuthenticationTagVerificationError,
    CryptographicError
)

def test_key_generation():
    key_hex = CryptoService.generate_key_hex()
    assert len(key_hex) == 64
    raw = bytes.fromhex(key_hex)
    assert len(raw) == 32

def test_aes_gcm_roundtrip():
    key = secrets.token_bytes(32)
    plaintext = "Confidential User Healthcare and Financial Records"
    
    enc = CryptoService.encrypt_data(plaintext, key)
    assert "ciphertext" in enc
    assert "nonce" in enc
    assert "auth_tag" in enc
    assert len(bytes.fromhex(enc["nonce"])) == 12
    assert len(bytes.fromhex(enc["auth_tag"])) == 16

    decrypted = CryptoService.decrypt_data(
        ciphertext_hex=enc["ciphertext"],
        nonce_hex=enc["nonce"],
        auth_tag_hex=enc["auth_tag"],
        key_bytes=key
    )
    assert decrypted == plaintext

def test_aes_gcm_wrong_key_fails():
    key1 = secrets.token_bytes(32)
    key2 = secrets.token_bytes(32)
    enc = CryptoService.encrypt_data("Secret Message", key1)

    with pytest.raises(AuthenticationTagVerificationError):
        CryptoService.decrypt_data(
            ciphertext_hex=enc["ciphertext"],
            nonce_hex=enc["nonce"],
            auth_tag_hex=enc["auth_tag"],
            key_bytes=key2
        )

def test_aes_gcm_tampered_ciphertext_fails():
    key = secrets.token_bytes(32)
    enc = CryptoService.encrypt_data("Integrity Protected Data", key)
    tampered_c = CryptoService.tamper_hex_payload(enc["ciphertext"], 0)

    with pytest.raises(AuthenticationTagVerificationError):
        CryptoService.decrypt_data(
            ciphertext_hex=tampered_c,
            nonce_hex=enc["nonce"],
            auth_tag_hex=enc["auth_tag"],
            key_bytes=key
        )

def test_aes_gcm_tampered_nonce_fails():
    key = secrets.token_bytes(32)
    enc = CryptoService.encrypt_data("Integrity Protected Data", key)
    tampered_n = CryptoService.tamper_hex_payload(enc["nonce"], 0)

    with pytest.raises(AuthenticationTagVerificationError):
        CryptoService.decrypt_data(
            ciphertext_hex=enc["ciphertext"],
            nonce_hex=tampered_n,
            auth_tag_hex=enc["auth_tag"],
            key_bytes=key
        )

def test_aes_gcm_tampered_auth_tag_fails():
    key = secrets.token_bytes(32)
    enc = CryptoService.encrypt_data("Integrity Protected Data", key)
    tampered_t = CryptoService.tamper_hex_payload(enc["auth_tag"], 0)

    with pytest.raises(AuthenticationTagVerificationError):
        CryptoService.decrypt_data(
            ciphertext_hex=enc["ciphertext"],
            nonce_hex=enc["nonce"],
            auth_tag_hex=tampered_t,
            key_bytes=key
        )

def test_aes_gcm_aad_binding():
    key = secrets.token_bytes(32)
    aad_correct = b"record_id_10294"
    aad_wrong = b"record_id_99999"
    enc = CryptoService.encrypt_data("Payload with AAD", key, aad=aad_correct)

    # Decrypt with correct AAD
    dec = CryptoService.decrypt_data(
        ciphertext_hex=enc["ciphertext"],
        nonce_hex=enc["nonce"],
        auth_tag_hex=enc["auth_tag"],
        key_bytes=key,
        aad=aad_correct
    )
    assert dec == "Payload with AAD"

    # Decrypt with mismatched AAD must fail
    with pytest.raises(AuthenticationTagVerificationError):
        CryptoService.decrypt_data(
            ciphertext_hex=enc["ciphertext"],
            nonce_hex=enc["nonce"],
            auth_tag_hex=enc["auth_tag"],
            key_bytes=key,
            aad=aad_wrong
        )

def test_nonce_uniqueness():
    key = secrets.token_bytes(32)
    nonces = set()
    for _ in range(100):
        enc = CryptoService.encrypt_data("test", key)
        nonces.add(enc["nonce"])
    assert len(nonces) == 100
