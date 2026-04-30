from flask import Blueprint, Response, abort, jsonify, request
import json
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone

outreach_engine_bp = Blueprint("outreach_engine", __name__)

DB_PATH = os.environ.get("OUTREACH_DB_PATH", os.environ.get("GLOBAL_SWEEP_DB_PATH", "global_sweep.db"))
SUPPORT_URL = os.environ.get("SUPPORT_RD_PUBLIC_URL", "https://supportrd.com")
BOT_AGENT_REF = os.environ.get("SUPPORT_RD_BOT_AGENT_REF", "agt_69f2460cc584819192e4a3a276e8b004")
ENGINE_ENABLED = os.environ.get("OUTREACH_ENGINE_ENABLED", "true").lower() == "true"
ENGINE_INTERVAL_SECONDS = int(os.environ.get("OUTREACH_ENGINE_INTERVAL_SECONDS", "900"))
ADMIN_TOKEN = (
    os.environ.get("OUTREACH_ADMIN_TOKEN")
    or os.environ.get("GLOBALTRACKER_ADMIN_TOKEN")
    or os.environ.get("ADMIN_API_TOKEN")
    or ""
)

SEEDS = [
    {"category": "free blog post", "title": "Natural hair repair guest article", "target": "beauty blogs", "hook": "SupportRD Caribbean Hair Solutions hair repair routine"},
    {"category": "guest post", "title": "Dry hair and breakage guide", "target": "hair care blogs and local business blogs", "hook": "How SupportRD routes hair concerns to product guidance and real support"},
    {"category": "salon outreach", "title": "Salon partnership email", "target": "salons and stylists", "hook": "ARIA hair prep plus Shopify catalog for clients"},
    {"category": "hair store outreach", "title": "Beauty supply partnership", "target": "hair stores", "hook": "SupportRD product line and AI hair guidance"},
    {"category": "video post idea", "title": "10-second hair damage short", "target": "TikTok, YouTube Shorts, and Instagram Reels style content", "hook": "How to fix dry damaged hair before it gets worse"},
    {"category": "personal story", "title": "Personal SupportRD family story", "target": "approved personal accounts only", "hook": "Why SupportRD was built for real hair problems"},
    {"category": "social comment draft", "title": "Helpful hair solution comment", "target": "approved social replies only", "hook": "Short value-first reply that links only when welcome"},
    {"category": "radio shoutout", "title": "SupportRD radio shoutout", "target": "community radio", "hook": "SupportRD.com Suave Natural Hair Solution Join Us"},
    {"category": "keyword cluster", "title": "Best tech hair website 2026", "target": "search entry pages", "hook": "AI hair analysis, voice assistant, Shopify catalog, live Diary and Studio"},
    {"category": "career website", "title": "Workplace ready hair ad", "target": "career centers", "hook": "Get your hair right before interviews and work"},
    {"category": "community college placement", "title": "Community college hair confidence ad", "target": "student bulletin boards and approved school ad channels", "hook": "SupportRD Caribbean Get Away - get your hair right"},
    {"category": "newspaper/rating channel", "title": "Best tech hair website review pitch", "target": "newspapers and review/rating sites", "hook": "Review SupportRD as a tech hair website"},
]

_scheduler_started = False
_scheduler_lock = threading.Lock()


def utc():
    return datetime.now(timezone.utc).isoformat()


def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "CREATE TABLE IF NOT EXISTS outreach_opportunities ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "opportunity_key TEXT UNIQUE,"
        "opportunity_json TEXT NOT NULL,"
        "status TEXT DEFAULT 'queued',"
        "score INTEGER DEFAULT 0,"
        "created_at TEXT NOT NULL,"
        "updated_at TEXT NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS outreach_engine_events ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "event_type TEXT NOT NULL,"
        "event_json TEXT NOT NULL,"
        "created_at TEXT NOT NULL)"
    )
    conn.commit()
    return conn


def is_local_request():
    host = (request.host or "").split(":")[0]
    remote = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
    return host in {"127.0.0.1", "localhost", "::1"} or remote in {"127.0.0.1", "::1"}


def require_admin():
    if is_local_request():
        return True
    supplied = (
        request.headers.get("X-Outreach-Admin-Token")
        or request.args.get("token")
        or request.args.get("admin_token")
        or ""
    )
    if ADMIN_TOKEN and supplied == ADMIN_TOKEN:
        return True
    abort(403)


def log_event(event_type, payload=None):
    conn = db()
    try:
        conn.execute(
            "INSERT INTO outreach_engine_events (event_type, event_json, created_at) VALUES (?, ?, ?)",
            (event_type[:80], json.dumps(payload or {}, sort_keys=True), utc()),
        )
        conn.commit()
    finally:
        conn.close()


def copy_for(item):
    cat = (item.get("category") or "opportunity").lower()
    hook = item.get("hook") or "SupportRD Caribbean Hair Solutions"
    if "salon" in cat or "hair store" in cat:
        message = (
            "Hello, I am preparing partnership outreach for SupportRD Caribbean Hair Solutions. "
            "SupportRD helps people with natural-hair concerns using ARIA guidance, Profile Hair Prep, and a Shopify product catalog. "
            f"Would this be a fit for a reviewed listing, collaboration, or customer resource? {SUPPORT_URL}"
        )
    elif "college" in cat or "career" in cat:
        message = (
            "SupportRD Caribbean Get Away: get your hair right before interviews, school, work, or your next opportunity. "
            f"Try Profile Hair Prep and ARIA hair guidance at {SUPPORT_URL}."
        )
    elif "radio" in cat:
        message = f"SupportRD.com - Suave Natural Hair Solution. Caribbean Hair Solutions from Dominican Republic, STI. Join us at {SUPPORT_URL}."
    elif "keyword" in cat:
        message = (
            "Best Tech Hair Website 2026 candidate: SupportRD combines AI hair analysis, voice assistants, Shopify catalog, "
            f"live Diary, FAQ Lounge, and Studio tools around natural-hair solutions. Visit {SUPPORT_URL}."
        )
    elif "social" in cat:
        message = (
            "Helpful draft only: If someone asks about dry hair, breakage, or product guidance, offer a short answer first. "
            f"Only include {SUPPORT_URL} when links are welcome and the account owner approves."
        )
    else:
        message = (
            f"{hook}. SupportRD brings AI hair guidance, Caribbean hair solutions, Profile prep, FAQ Lounge, "
            f"and product links together. Learn more at {SUPPORT_URL}."
        )
    return {
        "headline": item.get("title", "SupportRD outreach"),
        "target": item.get("target", "public audience"),
        "message": message,
        "cta": SUPPORT_URL,
    }


def score(item):
    text = json.dumps(item).lower()
    total = 40
    for term, points in [
        ("salon", 18), ("hair store", 18), ("college", 14), ("career", 14),
        ("radio", 12), ("newspaper", 12), ("rating", 12), ("keyword", 16),
        ("google", 10), ("video", 10), ("guest post", 14), ("blog", 14),
    ]:
        if term in text:
            total += points
    return min(100, total)


def normalize_item(item):
    category = item.get("category") or "opportunity"
    title = item.get("title") or "SupportRD growth opportunity"
    key = item.get("key") or f"{category}:{title}".lower().replace(" ", "-")[:140]
    normalized = {
        **item,
        "key": key,
        "copy": item.get("copy") or copy_for(item),
        "permission": "manual approval required before posting, emailing, submitting, or commenting",
        "automation_scope": "research, drafting, queueing, and logging only",
        "agent_ref": BOT_AGENT_REF,
    }
    return normalized


def upsert_opportunity(item, status="queued"):
    normalized = normalize_item(item)
    now = utc()
    conn = db()
    try:
        conn.execute(
            "INSERT INTO outreach_opportunities (opportunity_key, opportunity_json, status, score, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(opportunity_key) DO UPDATE SET opportunity_json=excluded.opportunity_json, score=excluded.score, updated_at=excluded.updated_at",
            (
                normalized["key"],
                json.dumps(normalized, sort_keys=True),
                status,
                score(normalized),
                now,
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return normalized


def seed():
    for item in SEEDS:
        upsert_opportunity(item)


def rows(status=None):
    seed()
    conn = db()
    try:
        if status:
            rs = conn.execute(
                "SELECT * FROM outreach_opportunities WHERE status=? ORDER BY score DESC, id DESC LIMIT 100",
                (status,),
            ).fetchall()
        else:
            rs = conn.execute(
                "SELECT * FROM outreach_opportunities ORDER BY score DESC, id DESC LIMIT 100"
            ).fetchall()
    finally:
        conn.close()
    out = []
    for row in rs:
        obj = json.loads(row["opportunity_json"])
        obj.update({
            "id": row["id"],
            "status": row["status"],
            "score": row["score"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })
        out.append(obj)
    return out


def engine_tick():
    seed()
    current = rows()
    log_event("heartbeat", {
        "agent_ref": BOT_AGENT_REF,
        "total": len(current),
        "queued": len([item for item in current if item.get("status") == "queued"]),
        "note": "Backend outreach engine drafts and logs only. No posting, emailing, or commenting occurs automatically.",
    })
    return current


def loop():
    while True:
        try:
            engine_tick()
        except Exception as exc:
            log_event("error", {"error": str(exc)[:240]})
        time.sleep(max(60, ENGINE_INTERVAL_SECONDS))


def start_outreach_engine_scheduler():
    global _scheduler_started
    if not ENGINE_ENABLED:
        return False
    with _scheduler_lock:
        if _scheduler_started:
            return True
        thread = threading.Thread(target=loop, daemon=True, name="support-rd-outreach-engine")
        thread.start()
        _scheduler_started = True
        return True


@outreach_engine_bp.route("/api/outreach/opportunities", methods=["GET", "POST"])
def opportunities():
    require_admin()
    if request.method == "POST":
        item = request.get_json(silent=True) or {}
        normalized = upsert_opportunity(item)
        log_event("queued", {"key": normalized["key"], "category": normalized.get("category")})
        return jsonify({"ok": True, "opportunity": normalized, "score": score(normalized)})
    report_rows = rows(request.args.get("status"))
    return jsonify({
        "ok": True,
        "botVisible": False,
        "backendMode": True,
        "agent_ref": BOT_AGENT_REF,
        "count": len(report_rows),
        "opportunities": report_rows,
    })


@outreach_engine_bp.route("/api/outreach/approve/<int:opp_id>", methods=["POST"])
def approve(opp_id):
    require_admin()
    conn = db()
    try:
        conn.execute("UPDATE outreach_opportunities SET status='approved', updated_at=? WHERE id=?", (utc(), opp_id))
        conn.commit()
    finally:
        conn.close()
    log_event("approved", {"id": opp_id, "note": "Approval does not send, post, email, or submit automatically."})
    return jsonify({"ok": True, "id": opp_id, "status": "approved", "send_status": "not_sent_manual_next_step"})


@outreach_engine_bp.route("/api/outreach/reject/<int:opp_id>", methods=["POST"])
def reject(opp_id):
    require_admin()
    conn = db()
    try:
        conn.execute("UPDATE outreach_opportunities SET status='rejected', updated_at=? WHERE id=?", (utc(), opp_id))
        conn.commit()
    finally:
        conn.close()
    log_event("rejected", {"id": opp_id})
    return jsonify({"ok": True, "id": opp_id, "status": "rejected"})


@outreach_engine_bp.route("/api/outreach/tick", methods=["POST"])
def api_tick():
    require_admin()
    current = engine_tick()
    return jsonify({"ok": True, "ran": True, "count": len(current)})


@outreach_engine_bp.route("/api/outreach/report")
def report():
    require_admin()
    report_rows = rows()
    cats = {}
    statuses = {}
    for item in report_rows:
        cats[item.get("category", "other")] = cats.get(item.get("category", "other"), 0) + 1
        statuses[item.get("status", "queued")] = statuses.get(item.get("status", "queued"), 0) + 1
    return jsonify({
        "ok": True,
        "botVisible": False,
        "backendMode": True,
        "runsConstantly": ENGINE_ENABLED,
        "intervalSeconds": ENGINE_INTERVAL_SECONDS,
        "agent_ref": BOT_AGENT_REF,
        "summary": {
            "total": len(report_rows),
            "categories": cats,
            "statuses": statuses,
            "topScore": max([item.get("score", 0) for item in report_rows] or [0]),
        },
        "queued": [item for item in report_rows if item.get("status") == "queued"][:50],
        "approved": [item for item in report_rows if item.get("status") == "approved"][:50],
        "safety": "Drafts and logs only. Manual approval is required before any post, email, submission, comment, or account action.",
    })


@outreach_engine_bp.route("/admin/outreach-control")
def admin_outreach_control():
    require_admin()
    token = request.args.get("token") or ""
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>SupportRD Outreach Engine Control</title>
  <style>
    body{{margin:0;font-family:Inter,system-ui,sans-serif;background:#06101f;color:#f7fbff}}
    main{{max-width:1180px;margin:0 auto;padding:1rem;display:grid;gap:1rem}}
    .panel,.card{{border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(255,255,255,.06);padding:1rem}}
    .grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}}
    button{{border:0;border-radius:8px;padding:.65rem .9rem;background:#72f7ff;color:#06101f;font-weight:900;cursor:pointer}}
    pre{{white-space:pre-wrap;color:rgba(247,251,255,.78)}}
    @media(max-width:760px){{.grid{{grid-template-columns:1fr}}}}
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>SupportRD Outreach Engine</h1>
      <p>Backend-only. Drafts and logs opportunities. Manual approval is required before any outside action.</p>
      <button id="tick">Run Engine Tick</button>
    </section>
    <section class="grid" id="cards"></section>
  </main>
  <script>
    const token = {json.dumps(token)};
    const qs = token ? '?token=' + encodeURIComponent(token) : '';
    async function api(path, options) {{
      const res = await fetch(path + qs, options || {{}});
      if (!res.ok) throw new Error('Request failed ' + res.status);
      return res.json();
    }}
    async function load() {{
      const data = await api('/api/outreach/report');
      document.getElementById('cards').innerHTML = (data.queued || []).map(item => `
        <article class="card">
          <strong>${{item.title || item.category}}</strong>
          <p>${{item.category}} | score ${{item.score}} | ${{item.status}}</p>
          <pre>${{(item.copy && item.copy.message) || item.hook || ''}}</pre>
          <button data-approve="${{item.id}}">Approve Draft</button>
          <button data-reject="${{item.id}}">Reject</button>
        </article>
      `).join('') || '<article class="card">No queued opportunities.</article>';
    }}
    document.addEventListener('click', async event => {{
      const approve = event.target.closest('[data-approve]');
      const reject = event.target.closest('[data-reject]');
      if (approve) await api('/api/outreach/approve/' + approve.dataset.approve, {{method:'POST'}});
      if (reject) await api('/api/outreach/reject/' + reject.dataset.reject, {{method:'POST'}});
      if (event.target.id === 'tick') await api('/api/outreach/tick', {{method:'POST'}});
      await load();
    }});
    load().catch(err => document.getElementById('cards').innerHTML = '<article class="card">' + err.message + '</article>');
  </script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


start_outreach_engine_scheduler()
