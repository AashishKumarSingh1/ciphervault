import time
import json
import uuid
import io
import csv
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.services.crypto_service import CryptoService

class BenchmarkService:
    SAMPLE_NAMES = ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright", "Fiona Gallagher", "George Clark", "Hannah Abbott"]
    SAMPLE_DOMAINS = ["example.com", "securevault.org", "cyberdefense.edu", "ciphervault.io"]
    SAMPLE_CATEGORIES = ["Identity", "Financial", "Medical", "Credentials"]
    SAMPLE_NOTES = [
        "Confidential account backup codes: 8291-0394-1102-4920. Authorized personnel only.",
        "Patient medical diagnostic record: Stage 2 hypertension. Prescribed Lisinopril 10mg daily.",
        "Corporate offshore banking wire credentials: SWIFT CHASEUS33, Account #9928172648.",
        "Root infrastructure API tokens: vault_live_sec_99482710492847104820194820194820."
    ]

    @classmethod
    def generate_synthetic_records(cls, count: int) -> List[Dict[str, str]]:
        """Generates realistic synthetic records for benchmarking."""
        records = []
        for i in range(count):
            name = f"{cls.SAMPLE_NAMES[i % len(cls.SAMPLE_NAMES)]} {i + 1}"
            email = f"user{i + 1}@{cls.SAMPLE_DOMAINS[i % len(cls.SAMPLE_DOMAINS)]}"
            phone = f"+1 (555) {100 + (i % 900):03d}-{1000 + (i % 9000):04d}"
            category = cls.SAMPLE_CATEGORIES[i % len(cls.SAMPLE_CATEGORIES)]
            notes = cls.SAMPLE_NOTES[i % len(cls.SAMPLE_NOTES)]
            records.append({
                "full_name": name,
                "email": email,
                "phone_number": phone,
                "category": category,
                "sensitive_notes": notes
            })
        return records

    @classmethod
    def run_benchmark(cls, record_count: int, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes an actual AES-256-GCM performance benchmark on real data with monotonic timing.
        """
        if record_count not in (100, 500, 1000, 5000):
            # Clamp to allowed sizes or default
            if record_count <= 100:
                record_count = 100
            elif record_count <= 500:
                record_count = 500
            elif record_count <= 1000:
                record_count = 1000
            else:
                record_count = 5000

        dataset = cls.generate_synthetic_records(record_count)
        master_key = CryptoService.get_master_key()

        # Measure plaintext size in bytes
        plaintext_json_list = [json.dumps(r, separators=(',', ':')).encode('utf-8') for r in dataset]
        total_plaintext_bytes = sum(len(b) for b in plaintext_json_list)

        # 1. Benchmark Encryption
        encrypted_results = []
        start_enc_ns = time.perf_counter_ns()
        for idx, p_bytes in enumerate(plaintext_json_list):
            aad = f"record-{idx}".encode('utf-8')
            res = CryptoService.encrypt_data(p_bytes, master_key, aad=aad)
            encrypted_results.append((res, aad))
        end_enc_ns = time.perf_counter_ns()

        total_enc_ns = end_enc_ns - start_enc_ns
        enc_time_ms = total_enc_ns / 1_000_000.0
        avg_enc_latency_us = (total_enc_ns / record_count) / 1_000.0

        # Calculate Encrypted storage size (ciphertext bytes + 12 nonce bytes + 16 tag bytes)
        total_encrypted_bytes = sum(
            (len(res["ciphertext"]) // 2) + 12 + 16
            for res, _ in encrypted_results
        )

        # 2. Benchmark Decryption
        start_dec_ns = time.perf_counter_ns()
        for res, aad in encrypted_results:
            _ = CryptoService.decrypt_data(
                ciphertext_hex=res["ciphertext"],
                nonce_hex=res["nonce"],
                auth_tag_hex=res["auth_tag"],
                key_bytes=master_key,
                aad=aad
            )
        end_dec_ns = time.perf_counter_ns()

        total_dec_ns = end_dec_ns - start_dec_ns
        dec_time_ms = total_dec_ns / 1_000_000.0
        avg_dec_latency_us = (total_dec_ns / record_count) / 1_000.0

        # Storage Overhead Percentage: ((Encrypted - Plaintext) / Plaintext) * 100
        storage_overhead_pct = ((total_encrypted_bytes - total_plaintext_bytes) / total_plaintext_bytes) * 100.0

        # Overall Throughput (records / sec)
        total_time_sec = (total_enc_ns + total_dec_ns) / 1_000_000_000.0
        throughput_records_per_sec = (record_count * 2) / (total_time_sec if total_time_sec > 0 else 0.0001)

        benchmark_id = str(uuid.uuid4())
        now = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())

        # Persist benchmark result in database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO benchmarks (
                    id, user_id, record_count, enc_time_ms, dec_time_ms,
                    avg_enc_latency_us, avg_dec_latency_us,
                    plaintext_size_bytes, encrypted_size_bytes,
                    storage_overhead_pct
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                benchmark_id,
                user_id,
                record_count,
                round(enc_time_ms, 2),
                round(dec_time_ms, 2),
                round(avg_enc_latency_us, 2),
                round(avg_dec_latency_us, 2),
                total_plaintext_bytes,
                total_encrypted_bytes,
                round(storage_overhead_pct, 2)
            ))
            conn.commit()

        return {
            "id": benchmark_id,
            "record_count": record_count,
            "encryption_time_ms": round(enc_time_ms, 2),
            "decryption_time_ms": round(dec_time_ms, 2),
            "avg_encryption_latency_us": round(avg_enc_latency_us, 2),
            "avg_decryption_latency_us": round(avg_dec_latency_us, 2),
            "plaintext_size_bytes": total_plaintext_bytes,
            "encrypted_size_bytes": total_encrypted_bytes,
            "storage_overhead_pct": round(storage_overhead_pct, 2),
            "throughput_records_per_sec": round(throughput_records_per_sec, 1),
            "created_at": now
        }

    @classmethod
    def get_history(cls, limit: int = 15) -> List[Dict[str, Any]]:
        """Retrieves recent benchmark runs."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM benchmarks ORDER BY created_at DESC LIMIT ?;
            """, (limit,))
            rows = cursor.fetchall()

            history = []
            for r in rows:
                total_time_sec = (r["enc_time_ms"] + r["dec_time_ms"]) / 1000.0
                throughput = (r["record_count"] * 2) / (total_time_sec if total_time_sec > 0 else 0.001)
                history.append({
                    "id": r["id"],
                    "record_count": r["record_count"],
                    "encryption_time_ms": r["enc_time_ms"],
                    "decryption_time_ms": r["dec_time_ms"],
                    "avg_encryption_latency_us": r["avg_enc_latency_us"],
                    "avg_decryption_latency_us": r["avg_dec_latency_us"],
                    "plaintext_size_bytes": r["plaintext_size_bytes"],
                    "encrypted_size_bytes": r["encrypted_size_bytes"],
                    "storage_overhead_pct": r["storage_overhead_pct"],
                    "throughput_records_per_sec": round(throughput, 1),
                    "created_at": str(r["created_at"])
                })
            return history

    @classmethod
    def export_csv(cls) -> str:
        """Exports benchmark history as a CSV formatted string."""
        history = cls.get_history(limit=100)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Benchmark ID", "Records", "Enc Time (ms)", "Dec Time (ms)",
            "Avg Enc Latency (us)", "Avg Dec Latency (us)",
            "Plaintext Size (bytes)", "Encrypted Size (bytes)",
            "Storage Overhead (%)", "Throughput (rec/s)", "Timestamp"
        ])
        for row in history:
            writer.writerow([
                row["id"], row["record_count"], row["encryption_time_ms"], row["decryption_time_ms"],
                row["avg_encryption_latency_us"], row["avg_decryption_latency_us"],
                row["plaintext_size_bytes"], row["encrypted_size_bytes"],
                row["storage_overhead_pct"], row["throughput_records_per_sec"], row["created_at"]
            ])
        return output.getvalue()
