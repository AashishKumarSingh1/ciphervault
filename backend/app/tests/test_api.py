import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.services.auth_service import AuthService

@pytest.fixture(scope="module")
def client():
    init_db()
    AuthService.seed_default_admin()
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["encryption"] == "AES-256-GCM"

def test_login_success_and_logout(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "CipherVaultAdmin2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "session_token" in data
    assert "user" in data
    assert data["user"]["username"] == "admin"
    token = data["session_token"]

    # Verify /me with token header
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "admin"

    # Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "IncorrectPassword99!"
    })
    assert res.status_code == 401

def test_records_crud_lifecycle(client):
    # Login first
    login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "CipherVaultAdmin2026!"
    })
    token = login_res.json()["session_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Record
    create_payload = {
        "full_name": "Test Subject Alpha",
        "email": "alpha@vault-test.org",
        "phone_number": "+1 (555) 901-2940",
        "category": "Identity",
        "sensitive_notes": "Top secret encryption key generation parameter test."
    }
    create_res = client.post("/api/records", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    created_record = create_res.json()
    rec_id = created_record["id"]
    assert created_record["is_encrypted"] is True
    assert "nonce" in created_record
    assert "auth_tag" in created_record

    # 2. List Records
    list_res = client.get("/api/records", headers=headers)
    assert list_res.status_code == 200
    records = list_res.json()
    assert any(r["id"] == rec_id for r in records)

    # 3. Decrypt Record
    dec_res = client.get(f"/api/records/{rec_id}", headers=headers)
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["full_name"] == "Test Subject Alpha"
    assert dec_data["sensitive_notes"] == "Top secret encryption key generation parameter test."

    # 4. Update Record
    update_res = client.put(f"/api/records/{rec_id}", json={
        "sensitive_notes": "Updated sensitive notes with fresh cryptographic nonce."
    }, headers=headers)
    assert update_res.status_code == 200

    # Verify updated notes decrypted
    dec_after_res = client.get(f"/api/records/{rec_id}", headers=headers)
    assert dec_after_res.status_code == 200
    assert dec_after_res.json()["sensitive_notes"] == "Updated sensitive notes with fresh cryptographic nonce."

    # 5. Delete Record
    del_res = client.delete(f"/api/records/{rec_id}", headers=headers)
    assert del_res.status_code == 200

def test_encryption_lab_endpoints(client):
    # 1. Lab key
    key_res = client.get("/api/encryption/lab-key")
    assert key_res.status_code == 200
    assert "lab_key_hex" in key_res.json()
    lab_key = key_res.json()["lab_key_hex"]

    # 2. Encrypt
    enc_res = client.post("/api/encryption/encrypt", json={
        "plaintext": "Confidential Medical Record - Encrypted Payload",
        "custom_key_hex": lab_key
    })
    assert enc_res.status_code == 200
    enc_data = enc_res.json()
    assert enc_data["algorithm"] == "AES-256-GCM"

    # 3. Decrypt with correct key
    dec_res = client.post("/api/encryption/decrypt", json={
        "ciphertext": enc_data["ciphertext"],
        "nonce": enc_data["nonce"],
        "auth_tag": enc_data["auth_tag"],
        "custom_key_hex": lab_key
    })
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["integrity_verified"] is True
    assert dec_data["decrypted_plaintext"] == "Confidential Medical Record - Encrypted Payload"

    # 4. Decrypt with wrong key
    wrong_key = "00" * 32
    dec_wrong_res = client.post("/api/encryption/decrypt", json={
        "ciphertext": enc_data["ciphertext"],
        "nonce": enc_data["nonce"],
        "auth_tag": enc_data["auth_tag"],
        "custom_key_hex": wrong_key
    })
    assert dec_wrong_res.status_code == 200
    dec_wrong_data = dec_wrong_res.json()
    assert dec_wrong_data["integrity_verified"] is False
    assert dec_wrong_data["decrypted_plaintext"] is None

    # 5. Tamper test
    tamper_res = client.post("/api/encryption/tamper", json={
        "ciphertext": enc_data["ciphertext"],
        "nonce": enc_data["nonce"],
        "auth_tag": enc_data["auth_tag"],
        "target": "ciphertext",
        "byte_index": 1
    })
    assert tamper_res.status_code == 200
    tampered_data = tamper_res.json()
    assert tampered_data["tampered_ciphertext"] != enc_data["ciphertext"]

def test_performance_benchmark_run(client):
    res = client.post("/api/performance/run", json={"record_count": 100})
    assert res.status_code == 200
    data = res.json()
    assert data["record_count"] == 100
    assert data["encryption_time_ms"] > 0
    assert data["decryption_time_ms"] > 0
    assert data["storage_overhead_pct"] > 0

def test_security_suite_run(client):
    res = client.post("/api/security/run-tests")
    assert res.status_code == 200
    data = res.json()
    assert data["total_tests"] == 6
    assert data["all_passed"] is True
