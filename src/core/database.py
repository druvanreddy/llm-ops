from __future__ import annotations

import contextlib
import csv
import io
import json
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent.parent / "triage_history.db"


@contextlib.contextmanager
def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS triage_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_text TEXT NOT NULL,
                result_json TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(triage_history)").fetchall()}
        if "feedback" not in cols:
            conn.execute("ALTER TABLE triage_history ADD COLUMN feedback TEXT DEFAULT NULL")
        if "language" not in cols:
            conn.execute("ALTER TABLE triage_history ADD COLUMN language TEXT DEFAULT 'en'")
        if "request_id" not in cols:
            conn.execute("ALTER TABLE triage_history ADD COLUMN request_id TEXT DEFAULT NULL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS escalation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                priority TEXT,
                category TEXT,
                action TEXT NOT NULL,
                target TEXT NOT NULL,
                enabled INTEGER DEFAULT 1
            )
        """)


def save_triage(ticket_text: str, result: dict[str, Any], language: str = "en", request_id: str | None = None) -> int:
    with _get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO triage_history (ticket_text, result_json, created_at, language, request_id) VALUES (?, ?, ?, ?, ?)",
            (ticket_text, json.dumps(result), time.time() * 1000, language, request_id),
        )
        return cursor.lastrowid


def get_history(limit: int = 100) -> list[dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT id, ticket_text, result_json, created_at, feedback, language, request_id FROM triage_history ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "text": r["ticket_text"],
                "result": json.loads(r["result_json"]),
                "ts": r["created_at"],
                "feedback": r["feedback"],
                "language": r["language"] or "en",
                "request_id": r["request_id"],
            }
            for r in rows
        ]


def set_feedback(item_id: int, feedback: str | None) -> bool:
    with _get_conn() as conn:
        cursor = conn.execute(
            "UPDATE triage_history SET feedback = ? WHERE id = ?",
            (feedback, item_id),
        )
        return cursor.rowcount > 0


def delete_by_ids(ids: list[int]) -> int:
    if not ids:
        return 0
    with _get_conn() as conn:
        placeholders = ",".join("?" for _ in ids)
        cursor = conn.execute(f"DELETE FROM triage_history WHERE id IN ({placeholders})", ids)
        return cursor.rowcount


def get_stats() -> dict[str, Any]:
    with _get_conn() as conn:
        row = conn.execute("""
            SELECT
                COUNT(*) as total_requests,
                COALESCE(SUM(json_extract(result_json, '$.metadata.cost_usd')), 0) as total_cost,
                COALESCE(SUM(json_extract(result_json, '$.metadata.input_tokens')), 0) as total_input_tokens,
                COALESCE(SUM(json_extract(result_json, '$.metadata.output_tokens')), 0) as total_output_tokens,
                COALESCE(SUM(CASE WHEN json_extract(result_json, '$.metadata.fallback_used') = 1 THEN 1 ELSE 0 END), 0) as total_fallbacks,
                COALESCE(SUM(CASE WHEN feedback = 'up' THEN 1 ELSE 0 END), 0) as thumbs_up,
                COALESCE(SUM(CASE WHEN feedback = 'down' THEN 1 ELSE 0 END), 0) as thumbs_down
            FROM triage_history
        """).fetchone()
        models = conn.execute("""
            SELECT json_extract(result_json, '$.metadata.model') as model, COUNT(*) as count
            FROM triage_history
            GROUP BY model
        """).fetchall()
        latency_points = conn.execute("""
            SELECT
                created_at as ts,
                json_extract(result_json, '$.metadata.latency_ms') as latency_ms
            FROM triage_history
            ORDER BY created_at ASC
        """).fetchall()
        return {
            "total_requests": row["total_requests"],
            "total_cost": row["total_cost"],
            "total_input_tokens": row["total_input_tokens"],
            "total_output_tokens": row["total_output_tokens"],
            "total_fallbacks": row["total_fallbacks"],
            "thumbs_up": row["thumbs_up"],
            "thumbs_down": row["thumbs_down"],
            "requests_by_model": [{"name": m["model"], "value": m["count"]} for m in models],
            "latency_history": [
                {"time": p["ts"], "value": round(p["latency_ms"] or 0)}
                for p in latency_points
            ],
        }


def get_analytics() -> dict[str, Any]:
    with _get_conn() as conn:
        categories = conn.execute("""
            SELECT json_extract(result_json, '$.result.category') as cat, COUNT(*) as count
            FROM triage_history GROUP BY cat ORDER BY count DESC
        """).fetchall()
        priorities = conn.execute("""
            SELECT json_extract(result_json, '$.result.priority') as pri, COUNT(*) as count
            FROM triage_history GROUP BY pri ORDER BY count DESC
        """).fetchall()
        daily = conn.execute("""
            SELECT date(created_at / 1000, 'unixepoch', 'localtime') as day, COUNT(*) as count
            FROM triage_history GROUP BY day ORDER BY day ASC
        """).fetchall()
        latencies = conn.execute("""
            SELECT json_extract(result_json, '$.metadata.latency_ms') as lat
            FROM triage_history ORDER BY lat ASC
        """).fetchall()
        lats = sorted([r["lat"] for r in latencies if r["lat"] is not None])
        p50 = lats[len(lats) // 2] if lats else 0
        p95 = lats[int(len(lats) * 0.95)] if lats else 0
        p99 = lats[int(len(lats) * 0.99)] if lats else 0
        avg_lat = sum(lats) / len(lats) if lats else 0
        costs = conn.execute("""
            SELECT
                COALESCE(SUM(json_extract(result_json, '$.metadata.cost_usd')), 0) as total,
                COUNT(*) as cnt
            FROM triage_history
        """).fetchone()
        feedback_rows = conn.execute("""
            SELECT feedback, COUNT(*) as count FROM triage_history
            WHERE feedback IS NOT NULL GROUP BY feedback
        """).fetchall()
        languages = conn.execute("""
            SELECT language, COUNT(*) as count FROM triage_history GROUP BY language ORDER BY count DESC
        """).fetchall()
        severities = conn.execute("""
            SELECT json_extract(result_json, '$.result.severity') as sev, COUNT(*) as count
            FROM triage_history WHERE sev IS NOT NULL GROUP BY sev ORDER BY count DESC
        """).fetchall()
        intents = conn.execute("""
            SELECT json_extract(result_json, '$.result.customer_intent') as intent, COUNT(*) as count
            FROM triage_history WHERE intent IS NOT NULL GROUP BY intent ORDER BY count DESC
        """).fetchall()
        confidences = conn.execute("""
            SELECT json_extract(result_json, '$.result.confidence') as conf
            FROM triage_history WHERE conf IS NOT NULL
        """).fetchall()
        conf_values = [r["conf"] for r in confidences if r["conf"] is not None]
        conf_buckets = {"high": 0, "medium": 0, "low": 0}
        for c in conf_values:
            if c >= 0.8:
                conf_buckets["high"] += 1
            elif c >= 0.6:
                conf_buckets["medium"] += 1
            else:
                conf_buckets["low"] += 1
        avg_conf = sum(conf_values) / len(conf_values) if conf_values else 0
        return {
            "categories": [{"name": r["cat"], "value": r["count"]} for r in categories],
            "priorities": [{"name": r["pri"], "value": r["count"]} for r in priorities],
            "daily_volume": [{"date": r["day"], "count": r["count"]} for r in daily],
            "latency": {"p50": round(p50), "p95": round(p95), "p99": round(p99), "avg": round(avg_lat)},
            "cost_per_ticket": round(costs["total"] / costs["cnt"], 6) if costs["cnt"] > 0 else 0,
            "total_cost": costs["total"],
            "feedback": {r["feedback"]: r["count"] for r in feedback_rows},
            "languages": [{"name": r["language"] or "en", "value": r["count"]} for r in languages],
            "severities": [{"name": r["sev"], "value": r["count"]} for r in severities],
            "intents": [{"name": r["intent"], "value": r["count"]} for r in intents],
            "confidence": {
                "avg": round(avg_conf, 3),
                "buckets": [
                    {"name": "High (≥80%)", "value": conf_buckets["high"]},
                    {"name": "Medium (60-80%)", "value": conf_buckets["medium"]},
                    {"name": "Low (<60%)", "value": conf_buckets["low"]},
                ],
            },
        }


def export_history(fmt: str = "json") -> str:
    with _get_conn() as conn:
        rows = conn.execute("""
            SELECT id, ticket_text, result_json, created_at, feedback, language, request_id
            FROM triage_history ORDER BY created_at DESC
        """).fetchall()
    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "request_id", "ticket_text", "category", "priority", "product", "summary", "model", "latency_ms", "tokens", "feedback", "language", "timestamp"])
        for r in rows:
            result = json.loads(r["result_json"])
            writer.writerow([
                r["id"],
                r["request_id"] or "",
                r["ticket_text"],
                result["result"]["category"],
                result["result"]["priority"],
                result["result"]["product"],
                result["result"]["summary"],
                result["metadata"]["model"],
                round(result["metadata"]["latency_ms"]),
                result["metadata"]["input_tokens"] + result["metadata"]["output_tokens"],
                r["feedback"] or "",
                r["language"] or "en",
                r["created_at"],
            ])
        return output.getvalue()
    else:
        return json.dumps([
            {
                "id": r["id"],
                "request_id": r["request_id"],
                "ticket_text": r["ticket_text"],
                "result": json.loads(r["result_json"]),
                "feedback": r["feedback"],
                "language": r["language"] or "en",
                "created_at": r["created_at"],
            }
            for r in rows
        ], indent=2)


# Escalation rules
def get_rules() -> list[dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute("SELECT * FROM escalation_rules ORDER BY id").fetchall()
        return [dict(r) for r in rows]


def save_rule(name: str, priority: str | None, category: str | None, action: str, target: str) -> int:
    with _get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO escalation_rules (name, priority, category, action, target) VALUES (?, ?, ?, ?, ?)",
            (name, priority, category, action, target),
        )
        return cursor.lastrowid


def delete_rule(rule_id: int) -> bool:
    with _get_conn() as conn:
        cursor = conn.execute("DELETE FROM escalation_rules WHERE id = ?", (rule_id,))
        return cursor.rowcount > 0


def toggle_rule(rule_id: int, enabled: bool) -> bool:
    with _get_conn() as conn:
        cursor = conn.execute("UPDATE escalation_rules SET enabled = ? WHERE id = ?", (1 if enabled else 0, rule_id))
        return cursor.rowcount > 0


def check_escalation(priority: str, category: str) -> list[dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM escalation_rules WHERE enabled = 1
            AND (priority IS NULL OR priority = ?)
            AND (category IS NULL OR category = ?)
        """, (priority, category)).fetchall()
        return [dict(r) for r in rows]


def clear_history() -> int:
    with _get_conn() as conn:
        cursor = conn.execute("DELETE FROM triage_history")
        return cursor.rowcount
