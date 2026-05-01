from flask import Blueprint, jsonify, send_from_directory, current_app, request
import requests
import os
import time


render_status_bp = Blueprint("render_status", __name__)

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
FAQ_REEL_CACHE_SECONDS = int(os.environ.get("FAQ_REEL_CACHE_SECONDS", "900"))
FAQ_REEL_CACHE = {}

FAQ_REEL_QUERIES = {
    "salon": "hair salon transformation short video healthy hair",
    "meme": "funny hair meme short video bad hair day",
    "professional": "professional hairstyle tips short video hair care",
    "home": "home hairstyle wash day natural hair care short video",
    "family": "family hairstyle event prep kids natural hair short video",
    "random": "hair care short video healthy hairstyle funny professional",
}


def _probe_primary_url():
    url = (os.environ.get("PRIMARY_PUBLIC_URL") or "https://aria.supportrd.com").strip()
    try:
        response = requests.get(url, timeout=6)
        return {
            "url": url,
            "ok": response.status_code < 500,
            "status_code": response.status_code,
        }
    except Exception as exc:
        return {
            "url": url,
            "ok": False,
            "status_code": 502,
            "error": str(exc)[:160],
        }


def _safe_reel_category(value):
    value = (value or "random").strip().lower()
    return value if value in FAQ_REEL_QUERIES else "random"


def _fallback_reels(category):
    local = {
        "salon": ["/static/videos/reel-1.mp4", "/static/videos/reel-2.mp4"],
        "meme": ["/static/videos/reel-3.mp4", "/static/videos/reel-4.mp4"],
        "professional": ["/static/videos/reel-6.mp4", "/static/videos/sample-10s.mp4"],
        "home": ["/static/videos/sample-10s.mp4", "/static/videos/reel-1.mp4"],
        "family": ["/static/videos/reel-2.mp4", "/static/videos/reel-6.mp4"],
        "random": ["/static/videos/reel-4.mp4", "/static/videos/sample-10s.mp4"],
    }
    return [
        {
            "id": f"fallback-{category}-{idx}",
            "title": f"SupportRD {category.title()} Reel Slot {idx + 1}",
            "link": src,
            "clip": src,
            "thumbnail": "",
            "source": "SupportRD Local Reel",
            "channel": "SupportRD",
            "duration": "0:15",
            "views": "",
            "category": category,
            "fallback": True,
            "position": idx + 1,
        }
        for idx, src in enumerate(local.get(category) or local["random"])
    ]


def _normalize_short_video(item, idx, category):
    return {
        "id": f"{category}-{item.get('position') or idx + 1}",
        "title": item.get("title") or "Hair short video",
        "link": item.get("link") or "",
        "clip": item.get("clip") or "",
        "thumbnail": item.get("thumbnail") or item.get("source_logo") or item.get("profile_picture") or "",
        "source": item.get("source") or "Google Short Videos",
        "channel": item.get("channel") or item.get("profile_name") or "",
        "duration": item.get("duration") or "short",
        "views": item.get("views") or "",
        "category": category,
        "position": item.get("position") or idx + 1,
        "fallback": False,
    }


def _fetch_short_videos(category, start=0):
    category = _safe_reel_category(category)
    start = max(0, int(start or 0))
    cache_key = f"{category}:{start}"
    now = time.time()
    cached = FAQ_REEL_CACHE.get(cache_key)
    if cached and now - cached["at"] < FAQ_REEL_CACHE_SECONDS:
        return cached["payload"]

    if not SERPAPI_KEY:
        payload = {
            "ok": True,
            "configured": False,
            "provider": "fallback",
            "category": category,
            "items": _fallback_reels(category),
            "message": "Set SERPAPI_KEY on Render to enable live Google Short Videos discovery.",
        }
        FAQ_REEL_CACHE[cache_key] = {"at": now, "payload": payload}
        return payload

    params = {
        "engine": "google_short_videos",
        "q": FAQ_REEL_QUERIES[category],
        "api_key": SERPAPI_KEY,
        "hl": "en",
        "gl": "us",
        "safe": "active",
        "device": "mobile",
        "start": start,
        "output": "json",
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        raw_items = data.get("short_video_results") or data.get("short_videos") or []
        items = [_normalize_short_video(item, idx, category) for idx, item in enumerate(raw_items[:24])]
        payload = {
            "ok": True,
            "configured": True,
            "provider": "serpapi_google_short_videos",
            "category": category,
            "query": FAQ_REEL_QUERIES[category],
            "items": items or _fallback_reels(category),
            "pagination": data.get("serpapi_pagination") or {},
        }
    except Exception as exc:
        payload = {
            "ok": False,
            "configured": True,
            "provider": "fallback",
            "category": category,
            "items": _fallback_reels(category),
            "error": str(exc)[:220],
        }
    FAQ_REEL_CACHE[cache_key] = {"at": now, "payload": payload}
    return payload


@render_status_bp.route("/api/faq/reels")
def faq_reels():
    category = _safe_reel_category(request.args.get("category"))
    try:
        start = int(request.args.get("start", "0"))
    except Exception:
        start = 0
    return jsonify(_fetch_short_videos(category, start))


@render_status_bp.route("/api/faq/magic-hour/brief", methods=["POST"])
def faq_magic_hour_brief():
    body = request.get_json(silent=True) or {}
    category = _safe_reel_category(body.get("category"))
    topic = (body.get("topic") or FAQ_REEL_QUERIES[category]).strip()[:240]
    return jsonify({
        "ok": True,
        "configured": bool(os.environ.get("MAGIC_HOUR_API_KEY", "")),
        "category": category,
        "brief": {
            "duration_seconds": 15,
            "style": category,
            "prompt": f"Create a clean SupportRD 10-15 second hair reel about: {topic}. Keep it positive, hair-care focused, and brand-safe.",
        },
    })


@render_status_bp.route("/accounts/<tag>")
@render_status_bp.route("/accounts/<tag>/")
def account_guest_channel(tag):
    return send_from_directory(current_app.static_folder, "index.html")


@render_status_bp.route("/api/status/render-health")
def render_health():
    probe = _probe_primary_url()
    return jsonify({
        "ok": True,
        "probe": probe,
        "official_pages": {
            "render_status": "https://status.render.com",
            "render_troubleshooting": "https://render.com/docs/troubleshooting-deploys",
            "render_web_services": "https://render.com/docs/web-services",
        },
    })


@render_status_bp.route("/status/502")
def bad_gateway_help():
    probe = _probe_primary_url()
    message = (
        "Service responded normally."
        if probe.get("ok")
        else "Bad gateway detected or upstream unavailable. Use official Render status/troubleshooting links."
    )
    return jsonify({
        "ok": probe.get("ok", False),
        "status": probe.get("status_code", 502),
        "message": message,
        "probe_url": probe.get("url"),
        "official_pages": {
            "status_page": "https://status.render.com",
            "troubleshooting": "https://render.com/docs/troubleshooting-deploys",
            "docs": "https://render.com/docs",
        },
    }), (200 if probe.get("ok") else 502)
