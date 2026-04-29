from flask import Blueprint, jsonify, request
import os
import re
import json
import sqlite3
from datetime import datetime, timezone

viral_engine_bp = Blueprint("viral_engine", __name__)
DB_PATH = os.environ.get("GLOBAL_SWEEP_DB_PATH", "global_sweep.db")

HAIR_TOPICS = {
    "dry hair": ["dry", "brittle", "frizz", "rough", "moisture"],
    "damaged hair": ["damaged", "burned", "breakage", "split", "heat damage", "bleach"],
    "hair growth": ["growth", "fall", "thin", "edges", "scalp", "anti-fall"],
    "wedding prep": ["wedding", "married", "bride", "event", "date", "party"],
    "wet hair care": ["wet", "conditioner", "mask", "mascarilla", "swimming", "pool"],
    "girlfriend shampoo help": ["girlfriend", "wife", "family", "mom", "sister", "shampoo"],
    "studio/live creator": ["live", "diary", "stream", "studio", "jake", "creator"],
    "professional making money": ["pro", "professional", "money", "market", "signals", "premium"]
}

PRODUCT_MAP = {
    "dry hair": {"product":"Mascarilla", "href":"https://shop.supportrd.com/products/mascarilla"},
    "damaged hair": {"product":"Exclusive Formula Anti-Fall", "href":"https://shop.supportrd.com/products/exclusive-formula-anti-fall"},
    "hair growth": {"product":"Lacceador Crece", "href":"https://shop.supportrd.com/products/lacceador-crece"},
    "wedding prep": {"product":"Support Full Product Line", "href":"https://shop.supportrd.com/products/support-full-product-line"},
    "wet hair care": {"product":"Mascarilla", "href":"https://shop.supportrd.com/products/mascarilla"},
    "girlfriend shampoo help": {"product":"Shampoo", "href":"https://shop.supportrd.com/products/shampoo"},
    "studio/live creator": {"product":"SupportRD Diary Live", "href":"https://shop.supportrd.com/products/supportrd-diary-live"},
    "professional making money": {"product":"SupportRD Market Signals", "href":"https://shop.supportrd.com/products/supportrd-market-signals"}
}

def _utc():
    return datetime.now(timezone.utc).isoformat()

def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS viral_opportunities (id INTEGER PRIMARY KEY AUTOINCREMENT, opportunity_key TEXT UNIQUE, opportunity_json TEXT NOT NULL, score INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)")
    conn.commit()
    return conn

def _safe_json(value, fallback=None):
    try:
        return json.loads(value or "{}")
    except Exception:
        return fallback if fallback is not None else {}

def _norm(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())

def _latest_sweep():
    conn = _db()
    try:
        row = conn.execute("SELECT run_json FROM global_sweep_runs ORDER BY id DESC LIMIT 1").fetchone()
        return _safe_json(row["run_json"], {}) if row else {}
    finally:
        conn.close()

def _confidence(match):
    exact = match.get("exact") or []
    tokens = " ".join(exact).lower()
    score = min(100, 35 + len(exact) * 12)
    tier = "Weak Match"
    if any(k in tokens for k in ["email:", "phone:", "customer.", "customer_id"]):
        score = max(score, 95); tier = "Exact Identity"
    elif any(k in tokens for k in ["checkout", "cart_token", "session_id", "visitor_id"]):
        score = max(score, 82); tier = "Session Intent"
    elif any(k in tokens for k in ["product", "variant", "sku", "handle"]):
        score = max(score, 68); tier = "Product Intent"
    elif any(k in tokens for k in ["path", "url", "campaign", "utm"]):
        score = max(score, 52); tier = "Topic Discovery"
    return min(score, 100), tier

def _text_blob(*items):
    parts = []
    for item in items:
        if isinstance(item, dict):
            parts.append(json.dumps(item, sort_keys=True))
        else:
            parts.append(str(item or ""))
    return _norm(" ".join(parts))

def _topic_for(match):
    blob = _text_blob(match.get("personal"), match.get("shopify"), match.get("exact"))
    best_topic, best_hits = "dry hair", 0
    for topic, words in HAIR_TOPICS.items():
        hits = sum(1 for word in words if word in blob)
        if hits > best_hits:
            best_topic, best_hits = topic, hits
    return best_topic, best_hits

def _opportunity_from_match(match, idx):
    confidence, tier = _confidence(match)
    topic, topic_hits = _topic_for(match)
    product = PRODUCT_MAP.get(topic, PRODUCT_MAP["dry hair"])
    velocity = confidence + topic_hits * 6
    if tier == "Exact Identity":
        action = "Follow up now with ARIA product guidance and direct checkout."
    elif tier == "Product Intent":
        action = "Run a short FAQ clip and push the matching product."
    elif tier == "Session Intent":
        action = "Invite user into Diary/Profile and capture email before they leave."
    else:
        action = "Turn topic into a viral FAQ short and collect interested leads."
    title = f"{topic.title()} wave detected"
    hook = f"How to fix {topic} before it gets worse"
    if topic == "wedding prep":
        hook = "Wedding hair prep: what to use before the big day"
    if topic == "girlfriend shampoo help":
        hook = "Girlfriend needs her hair done — what shampoo should you buy?"
    if topic == "professional making money":
        hook = "Professional tier: turn attention into money movement"
    return {
        "key": f"{topic}:{tier}:{idx}",
        "title": title,
        "topic": topic,
        "hook": hook,
        "tier": tier,
        "confidence": confidence,
        "viralScore": min(100, velocity),
        "customerWave": "hot buyer" if confidence >= 90 else "warm lead" if confidence >= 65 else "viral audience",
        "product": product["product"],
        "href": product["href"],
        "cta": f"Go live / make FAQ clip + push {product['product']}",
        "action": action,
        "exact": match.get("exact", [])[:8],
        "createdAt": _utc()
    }

def build_viral_opportunities():
    sweep = _latest_sweep()
    matches = sweep.get("matches") or []
    opportunities = []
    if matches:
        for idx, match in enumerate(matches[:40]):
            opportunities.append(_opportunity_from_match(match, idx))
    else:
        # Seed usable opportunity cards even before first match, so FAQ Lounge still acts like a customer vacuum.
        for idx, topic in enumerate(["dry hair", "damaged hair", "wedding prep", "girlfriend shampoo help", "professional making money"]):
            product = PRODUCT_MAP[topic]
            opportunities.append({
                "key": f"seed:{topic}",
                "title": f"{topic.title()} lead magnet",
                "topic": topic,
                "hook": f"Ask ARIA: what should I buy for {topic}?",
                "tier": "Seed Opportunity",
                "confidence": 45,
                "viralScore": 58 + idx * 5,
                "customerWave": "starter wave",
                "product": product["product"],
                "href": product["href"],
                "cta": f"Build FAQ short + push {product['product']}",
                "action": "Use FAQ Lounge to collect comments, ratings, and product intent.",
                "exact": [],
                "createdAt": _utc()
            })
    opportunities = sorted(opportunities, key=lambda row: (row.get("viralScore", 0), row.get("confidence", 0)), reverse=True)[:24]
    conn = _db()
    now = _utc()
    try:
        for opp in opportunities:
            conn.execute(
                "INSERT INTO viral_opportunities (opportunity_key, opportunity_json, score, created_at, updated_at) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(opportunity_key) DO UPDATE SET opportunity_json=excluded.opportunity_json, score=excluded.score, updated_at=excluded.updated_at",
                (opp["key"], json.dumps(opp, sort_keys=True), int(opp.get("viralScore", 0)), now, now)
            )
        conn.commit()
    finally:
        conn.close()
    return opportunities

@viral_engine_bp.route("/api/viral-engine/opportunities", methods=["GET"])
def api_viral_opportunities():
    opportunities = build_viral_opportunities()
    return jsonify({
        "ok": True,
        "generatedAt": _utc(),
        "count": len(opportunities),
        "opportunities": opportunities
    })

@viral_engine_bp.route("/api/viral-engine/checkin", methods=["POST"])
def api_viral_checkin():
    payload = request.get_json(silent=True) or {}
    conn = _db()
    try:
        conn.execute(
            "INSERT INTO personal_tracker_events (event_json, created_at) VALUES (?, ?)",
            (json.dumps({"source":"faq-viral-engine", **payload}, sort_keys=True), _utc())
        )
        conn.commit()
    finally:
        conn.close()
    opportunities = build_viral_opportunities()
    return jsonify({"ok": True, "stored": True, "opportunities": opportunities[:8]})
