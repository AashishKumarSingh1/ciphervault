# CipherVault — AES-256 Secure Database Management System

<div align="center">

![CipherVault Banner](https://img.shields.io/badge/CipherVault-AES--256--GCM%20Vault-amber?style=for-the-badge&logo=shield&logoColor=black)

**High-Assurance Application-Layer Cryptographic Engine & Interactive Block Cipher Simulator**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![AES-256-GCM](https://img.shields.io/badge/Cryptography-AES--256--GCM-F59E0B?style=flat-square&logo=lock)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
[![Tests Passing](https://img.shields.io/badge/Tests-15%2F15%20Passing-brightgreen?style=flat-square&logo=pytest)](https://pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

[Live Architecture](#-architecture--tech-stack) • [Core Features](#-key-features) • [Cryptographic Simulator](#-interactive-aes-256-microscopic-simulator) • [Quick Start](#-quick-start) • [Threat Model](#-threat-model--security-specifications)

</div>

---

## 📌 Overview

**CipherVault** is a production-grade, application-layer cryptographic database management system designed to eliminate plaintext exposure in modern persistent storage. 

While **TLS (Transport Layer Security)** secures data in transit and **Full Disk Encryption (FDE)** protects stolen physical storage drives, neither protects against SQL injection, compromised database snapshots, malicious database administrators, or cloud database exfiltration. 

CipherVault addresses this vulnerability through **Pre-Persistence Authenticated Encryption with Associated Data (AEAD)** via **AES-256-GCM**. Confidential fields are encrypted and authenticated within application memory *before* being committed to SQLite storage, ensuring zero plaintext at rest.

---

## 🛡️ Key Features

### 1. Application-Layer Pre-Persistence Cryptography
- **Zero Plaintext at Rest:** Sensitive fields (`full_name`, `email`, `phone_number`, `sensitive_notes`) are serialized and encrypted in application memory prior to database insertion.
- **Cryptographic Binding via AAD:** The unique record UUID is injected as Associated Authenticated Data (AAD), cryptographically locking ciphertext to its database primary key and defeating **Ciphertext Transplant Attacks**.
- **Cryptographic Nonce Hygiene:** Unique 96-bit (12-byte) initialization vectors are generated via a cryptographically secure pseudorandom number generator (`Crypto.Random`) for every operation, ensuring that identical inputs yield distinct ciphertexts.

### 2. Interactive AES-256 Microscopic Execution Simulator (`/simulator`)
An educational and analytical simulation engine demonstrating the internal mechanics of the Rijndael block cipher:
- **ASCII-to-Hex Transformation:** Character-by-character ASCII decimal and hex breakdown with PKCS#7 block padding.
- **4x4 Column-Major Matrix Mapping:** Visual byte layout showing index-to-coordinate positioning.
- **Rijndael S-Box Visualizer:** Interactive coordinate lookup table ($GF(2^8)$ non-linear confusion layer) demonstrating resistance against differential cryptanalysis.
- **ShiftRows Trajectory Permutations:** Visual cyclic left row rotations ($0, 1, 2, 3$ byte offsets).
- **Galois Field $GF(2^8)$ MixColumns Explorer:** Clickable column selection calculating MDS matrix polynomial multiplications modulo $m(x) = x^8 + x^4 + x^3 + x + 1$ with $x\text{time}()$ reduction.
- **AddRoundKey 3-Matrix Visualizer:** Side-by-side equation rendering $[\text{State}] \oplus [\text{Key}] = [\text{Result}]$ with cell-level 8-bit binary XOR inspection.
- **Final Ciphertext Stream Extraction:** Column-major serialization producing 32-character Hex and Base64 output streams with 1-click clipboard export.
- **Custom 256-bit Key Schedule Configuration:** Dynamically generates round subkeys ($K_0$ through $K_{14}$) with random key generation.
- **Autoplay Engine:** Speed controls (0.5x, 1x, 2x) for technical demonstrations.

### 3. Cryptographic Lab & Tamper Sandbox (`/encryption-lab`)
- Real-time encryption/decryption playground.
- **Bit-Flip Corruption Simulator:** Inverts specific bits within the ciphertext to demonstrate instant rejection by the 128-bit GHASH authentication tag (`AuthenticationTagVerificationError`).
- **Wrong-Key Authentication Failure:** Demonstrates mathematical rejection of unauthorized keys.

### 4. Automated Adversary Emulation Suite (`/security`)
Automated multi-vector security verification suite testing:
1. Ciphertext corruption / bit tampering detection.
2. Cross-record ciphertext transplant mitigation via AAD.
3. Brute-force credential resistance (12-round salted Bcrypt).
4. SQL Injection payload immunity on encrypted fields.
5. Unauthorized cross-session record access rejection.
6. Nonce collision and entropy validation.

### 5. High-Resolution Microsecond Benchmarking Engine (`/performance`)
- Benchmarking engine using Python's `time.perf_counter_ns()`.
- Latency and throughput profiling across 100 to 5,000 synthetic records.
- Live visualization via Recharts with CSV export functionality.

---

## 🏗 Architecture & Tech Stack

```
                              CipherVault Architecture
       ┌─────────────────────────────────────────────────────────────────┐
       │                     Next.js 16 (App Router)                     │
       │       TypeScript • Tailwind CSS (Navy/Amber) • Recharts         │
       │           Lucide Icons • AES-256 Microscopic Engine             │
       └────────────────────────────────┬────────────────────────────────┘
                                        │ HTTP / REST API (CORS)
                                        ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │                   FastAPI Backend (Python 3.12)                 │
       │       Asynchronous Routing • Pydantic v2 • Session Auth         │
       └──────────────┬──────────────────────────────────┬───────────────┘
                      │                                  │
                      ▼                                  ▼
       ┌─────────────────────────────┐    ┌─────────────────────────────┐
       │     PyCryptodome Engine     │    │       SQLite 3 (WAL)        │
       │    AES-256-GCM AEAD Mode    │    │   Encrypted Records Table   │
       │  96-bit Nonce, 128-bit Tag  │    │   Zero Plaintext at Rest    │
       │    Isolated Key Separation  │    │    WAL Mode High Throughput │
       └─────────────────────────────┘    └─────────────────────────────┘
```

### Technology Highlights
| Component | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 16.4 (Turbopack, React 19) | Fast server-side routing, static generation, modern CSS styling |
| **Backend** | Python 3.12, FastAPI, Uvicorn | Asynchronous execution, native typing, OpenAPI auto-documentation |
| **Cryptography** | PyCryptodome (`AES.MODE_GCM`) | Authenticated Encryption with Associated Data (AEAD) standard |
| **Database** | SQLite 3 with Write-Ahead Logging (WAL) | Zero-configuration ACID-compliant embedded database with concurrent read access |
| **Authentication** | Bcrypt (12 rounds) & Server Sessions | Work-factored password hashing with session cookie isolation |

---

## 🔬 Cryptographic Specification

CipherVault adheres to NIST SP 800-38D specifications for Galois/Counter Mode (GCM):

$$C = \text{AES-CTR}_K(P) \quad\text{and}\quad T = \text{GHASH}_H(A, C) \oplus E_K(J_0)$$

Where:
- $K$: 256-bit symmetric master key.
- $P$: Input plaintext payload.
- $IV$: 96-bit (12-byte) initialization nonce generated fresh per record.
- $A$: Associated Authenticated Data (record UUID string).
- $C$: Resulting ciphertext block.
- $T$: 128-bit (16-byte) GMAC authentication tag.

### Tampering Detection Workflow
```
[Persistent Storage: Ciphertext (C), Nonce (IV), Tag (T), Record ID (AAD)]
                                    │
                              Attacker Tamper
                            C' = C ⊕ 0x0001
                                    │
                             Decryption Call
                                    ▼
                 Compute: T' = GHASH(AAD, C') ⊕ Ek(J0)
                                    ▼
                              T' == T ?
                               /     \
                            YES       NO
                            /           \
                 Return Plaintext     Raise AuthenticationTagVerificationError
                                      (Zero Plaintext Leaked)
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** (Tested on Python 3.12)
- **Node.js 18+** & **npm**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/ciphervault.git
cd ciphervault
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
cp .env.example backend/.env
```

### 3. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run automated test suite (15/15 tests)
pytest app/tests -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at `http://localhost:8000`.  
Interactive Swagger/OpenAPI documentation is available at `http://localhost:8000/docs`.

### 4. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Default Credentials

For testing and demonstration environments:
- **Username:** `admin`
- **Password:** `CipherVaultAdmin2026!`
*(The login page includes a **"Fill Credentials"** shortcut for automated population).*

---

## 📊 Benchmarking & Performance Metrics

Empirical benchmarks collected across synthetic test suites:

| Record Count | Encrypt Latency (Mean) | Decrypt Latency (Mean) | Storage Overhead |
|:---:|:---:|:---:|:---:|
| **100** | ~82 µs / record | ~64 µs / record | +28 Bytes (Fixed Nonce + Tag) |
| **500** | ~80 µs / record | ~61 µs / record | +28 Bytes (Fixed Nonce + Tag) |
| **1,000** | ~79 µs / record | ~59 µs / record | +28 Bytes (Fixed Nonce + Tag) |
| **5,000** | ~78 µs / record | ~58 µs / record | +28 Bytes (Fixed Nonce + Tag) |

*Hardware: Intel Core i7 / AMD Ryzen with AES-NI hardware instruction acceleration enabled.*

---

## 🔒 Threat Model & Security Specifications

### Addressed Threat Vectors
- **Database Compromise & SQL Dumps:** If the SQLite database file or backup snapshot is exfiltrated, attackers obtain only opaque hexadecimal ciphertexts, random nonces, and MAC tags. No plaintext is recoverable without the master key.
- **Ciphertext Bit Manipulation:** Modifying any bit in storage invalidates the 128-bit authentication tag, causing immediate rejection before decryption completes.
- **Ciphertext Transplant (Cut-and-Paste):** Encrypted blobs cannot be copied into another record row because the record UUID is bound via Associated Authenticated Data (AAD).
- **Password Hashing:** Administrative passwords use salted 12-round Bcrypt with a deliberate ~250ms work factor to deter GPU/ASIC rainbow table attacks.

### Operational Boundaries
- **Runtime Host Memory:** Data in active Python memory during decryption operations is vulnerable to processes with OS-level `root` / `SYSTEM` access or physical memory dumping.
- **Key Storage:** The master 256-bit key is supplied via environment variables (`MASTER_KEY_HEX`). In production enterprise deployments, integrate with a Hardware Security Module (HSM) or Key Management Service (AWS KMS, HashiCorp Vault).

---

## 📂 Repository Structure

```
ciphervault/
├── backend/
│   ├── app/
│   │   ├── config.py             # Security configuration & key validation
│   │   ├── database.py           # SQLite connection pool with WAL mode
│   │   ├── main.py               # FastAPI application lifecycle & CORS
│   │   ├── middleware/           # Session token & authentication filters
│   │   ├── routes/               # API endpoints (auth, records, lab, perf, security)
│   │   ├── schemas/              # Pydantic v2 request/response models
│   │   ├── services/             # Core crypto, record lifecycle & benchmark logic
│   │   └── tests/                # Automated pytest unit & integration suites
│   ├── requirements.txt          # Python dependency specifications
│   └── .env.example              # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/        # Real-time metrics & operational audit logs
│   │   │   ├── encryption-lab/   # Interactive cryptographic sandbox
│   │   │   ├── login/            # Authentication portal with demo fill
│   │   │   ├── performance/      # Microsecond latency benchmarking graphs
│   │   │   ├── records/          # Authenticated CRUD management
│   │   │   ├── security/         # Multi-vector adversary verification suite
│   │   │   └── simulator/        # AES-256 Microscopic Block Cipher Engine
│   │   ├── components/           # Reusable UI controls & navigation layouts
│   │   └── lib/                  # Fully typed API client
│   ├── package.json              # Next.js & UI dependency specifications
│   └── tailwind.config.ts        # Dark navy / amber cybersecurity theme tokens
├── .env.example                  # Master environment variable template
├── .gitignore                    # Git exclusions (no secrets, database files, or local docs)
└── README.md                     # Technical documentation & project specification
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
Open-source and freely available for technical evaluation, educational exploration, and security research.
