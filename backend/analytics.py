import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from collections import Counter
from database import get_db


def log_query(username: str, role: str, question: str, answer: str,
              confidence: float, response_time_ms: int, sources_count: int = 0) -> int:
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO query_logs (username, role, question, answer, confidence, response_time_ms, sources_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (username, role, question, answer, confidence, response_time_ms, sources_count))
    query_id = c.lastrowid
    conn.commit()
    conn.close()
    return query_id


def log_chat(username: str, role: str, question: str, answer: str,
             sources: list, confidence: float, response_time_ms: int):
    conn = get_db()
    conn.execute("""
        INSERT INTO chat_history (username, role, question, answer, sources, confidence, response_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (username, role, question, answer, json.dumps(sources), confidence, response_time_ms))
    conn.commit()
    conn.close()


def submit_feedback(query_id: int, feedback: int):
    conn = get_db()
    conn.execute("UPDATE query_logs SET feedback = ? WHERE id = ?", (feedback, query_id))
    conn.commit()
    conn.close()


def get_query_stats(days: int = 7, role: Optional[str] = None) -> Dict:
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    conn = get_db()
    c = conn.cursor()

    if role:
        c.execute("SELECT * FROM query_logs WHERE timestamp >= ? AND role = ?", (cutoff, role))
    else:
        c.execute("SELECT * FROM query_logs WHERE timestamp >= ?", (cutoff,))
    rows = c.fetchall()
    conn.close()

    if not rows:
        return {"total_queries": 0, "total_users": 0, "avg_response_time_ms": 0,
                "top_questions": [], "average_confidence_score": 0, "by_role": {}, "period_days": days}

    total = len(rows)
    users = len(set(r["username"] for r in rows))
    avg_time = sum(r["response_time_ms"] for r in rows) / total
    avg_conf = sum(r["confidence"] for r in rows) / total

    q_counts = Counter(r["question"] for r in rows)
    top_questions = [{"question": q, "count": cnt} for q, cnt in q_counts.most_common(10)]

    by_role: Dict = {}
    for r in rows:
        rl = r["role"]
        if rl not in by_role:
            by_role[rl] = {"queries": 0, "times": [], "confidences": []}
        by_role[rl]["queries"] += 1
        by_role[rl]["times"].append(r["response_time_ms"])
        by_role[rl]["confidences"].append(r["confidence"])

    for rl in by_role:
        t = by_role[rl]["times"]
        cf = by_role[rl]["confidences"]
        by_role[rl] = {
            "queries": by_role[rl]["queries"],
            "avg_time_ms": round(sum(t) / len(t), 2) if t else 0,
            "avg_confidence": round(sum(cf) / len(cf), 3) if cf else 0,
        }

    return {
        "total_queries": total,
        "total_users": users,
        "avg_response_time_ms": round(avg_time, 2),
        "top_questions": top_questions,
        "average_confidence_score": round(avg_conf, 3),
        "by_role": by_role,
        "period_days": days,
    }


def get_user_activity(username: Optional[str] = None, limit: int = 100) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    if username:
        c.execute("""
            SELECT id, username, role, question, answer, confidence, response_time_ms,
                   sources_count, feedback, timestamp
            FROM query_logs WHERE username = ? ORDER BY timestamp DESC LIMIT ?
        """, (username, limit))
    else:
        c.execute("""
            SELECT id, username, role, question, answer, confidence, response_time_ms,
                   sources_count, feedback, timestamp
            FROM query_logs ORDER BY timestamp DESC LIMIT ?
        """, (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_chat_history(username: str, limit: int = 50) -> List[Dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT id, question, answer, sources, confidence, response_time_ms, timestamp
        FROM chat_history WHERE username = ?
        ORDER BY timestamp DESC LIMIT ?
    """, (username, limit))
    rows = c.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["sources"] = json.loads(d["sources"]) if d["sources"] else []
        result.append(d)
    return result


def get_evaluation_metrics() -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM query_logs")
    rows = c.fetchall()
    conn.close()

    if not rows:
        return {
            "total_queries": 0,
            "avg_confidence": 0,
            "answer_rate": 0,
            "feedback_score": 0,
            "avg_response_time_ms": 0,
            "confidence_distribution": {"high": 0, "medium": 0, "low": 0},
            "queries_by_role": {},
            "thumbs_up": 0,
            "thumbs_down": 0,
        }

    total = len(rows)
    avg_conf = sum(r["confidence"] for r in rows) / total
    avg_time = sum(r["response_time_ms"] for r in rows) / total

    answered = sum(
        1 for r in rows
        if r["answer"]
        and "not available" not in r["answer"].lower()
        and "don't have information" not in r["answer"].lower()
        and len(r["answer"]) > 30
    )
    answer_rate = answered / total

    feedback_rows = [r for r in rows if r["feedback"] is not None]
    thumbs_up = sum(1 for r in feedback_rows if r["feedback"] == 1)
    thumbs_down = sum(1 for r in feedback_rows if r["feedback"] == -1)
    feedback_score = thumbs_up / len(feedback_rows) if feedback_rows else 0

    high = sum(1 for r in rows if r["confidence"] >= 0.75)
    medium = sum(1 for r in rows if 0.5 <= r["confidence"] < 0.75)
    low = sum(1 for r in rows if r["confidence"] < 0.5)

    roles: Dict = {}
    for r in rows:
        roles[r["role"]] = roles.get(r["role"], 0) + 1

    return {
        "total_queries": total,
        "avg_confidence": round(avg_conf, 3),
        "answer_rate": round(answer_rate, 3),
        "feedback_score": round(feedback_score, 3),
        "avg_response_time_ms": round(avg_time, 2),
        "confidence_distribution": {"high": high, "medium": medium, "low": low},
        "queries_by_role": roles,
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
    }


def get_performance_metrics() -> Dict:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT response_time_ms, confidence FROM query_logs")
    rows = c.fetchall()
    conn.close()

    if not rows:
        return {"total_queries": 0, "avg_response_time_ms": 0, "min_response_time_ms": 0,
                "max_response_time_ms": 0, "avg_confidence": 0, "records_stored": 0}

    times = [r["response_time_ms"] for r in rows]
    confs = [r["confidence"] for r in rows]
    sorted_times = sorted(times)
    p95_idx = max(0, int(len(sorted_times) * 0.95) - 1)

    return {
        "total_queries": len(rows),
        "avg_response_time_ms": round(sum(times) / len(times), 2),
        "min_response_time_ms": min(times),
        "max_response_time_ms": max(times),
        "p95_response_time_ms": sorted_times[p95_idx],
        "avg_confidence": round(sum(confs) / len(confs), 3),
        "records_stored": len(rows),
    }
