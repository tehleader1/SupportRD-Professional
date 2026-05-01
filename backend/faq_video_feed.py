from flask import Blueprint, jsonify, request
import os
import time
import requests

faq_video_feed_bp = Blueprint("faq_video_feed", __name__)

SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")
MAGIC_HOUR_API_KEY = os.environ.get("MAGIC_HOUR_API_KEY", "")
CACHE_TTL_SECONDS = int(os.environ.get("FAQ_REEL_CACHE_SECONDS", "900"))
_CACHE = {}

CATEGORY_QUERIES = {
    "salon": "hair salon transformation short video healthy hair",
    "meme": "funny hair meme short video bad hair day",
    "professional": "professional hairstyle tips short video hair care",
    "home": "home hairstyle wash day natural hair care short video",
    "family": "family hairstyle event prep kids natural hair short video",
    "random": "hair care short video healthy hairstyle funny professional",
}


def _safe_category(value):
    value = (value or "random").strip().lower()
    return value if value in CATEGORY_QUERIES else "random"


def _normalize_item(item, idx, category):
    return {
        "id": f"{category}-{idx}",
        "title": item.get("title") or "Hair short video",
        "link": item.get("link") or "",
        "thumbnail": item.get("thumbnail") or item.get("source_logo") or item.get("profile_picture") or "",
        "clip": item.get("clip") or "",
        "source": item.get("source") or "Google Short Videos",
        "channel": item.get("channel") or item.get("profile_name") or "",
        "duration": item.get("duration") or "short",
        "views": item.get("views") or "",
        "category": category,
        "position": item.get("position") or idx + 1,
    }


def _fallback(category):
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
            "id": f"fallback-{category}-{i}",
            "title": f"SupportRD {category.title()} Reel Slot {i+1}",
            "link": src,
            "thumbnail": "",
            "clip": src,
            "source": "SupportRD Local Reel",
            "channel": "SupportRD",
            "duration": "0:15",
            "views": "",
            "category": category,
            "position": i + 1,
            "fallback": True,
        }
        for i, src in enumerate(local.get(category) or local["random"])
    ]


def fetch_serpapi_reels(category, start=0):
    category = _safe_category(category)
    cache_key = f"{category}:{int(start)}"
    cached = _CACHE.get(cache_key)
    now = time.time()
    if cached and now - cached["at"] < CACHE_TTL_SECONDS:
        return cached["payload"]

    if not SERPAPI_KEY:
        payload = {
            "ok": True,
            "provider": "fallback",
            "category": category,
            "configured": False,
            "items": _fallback(category),
            "message": "Set SERPAPI_KEY on Render to enable live Google Short Videos discovery.",
        }
        _CACHE[cache_key] = {"at": now, "payload": payload}
        return payload

    params = {
        "engine": "google_short_videos",
        "q": CATEGORY_QUERIES[category],
        "api_key": SERPAPI_KEY,
        "hl": "en",
        "gl": "us",
        "safe": "active",
        "device": "mobile",
        "start": int(start or 0),
        "output": "json",
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        raw_items = data.get("short_video_results") or data.get("short_videos") or []
        items = [_normalize_item(item, idx, category) for idx, item in enumerate(raw_items[:24])]
        payload = {
            "ok": True,
            "provider": "serpapi_google_short_videos",
            "category": category,
            "configured": True,
            "items": items or _fallback(category),
            "pagination": data.get("serpapi_pagination") or {},
            "query": CATEGORY_QUERIES[category],
        }
    except Exception as exc:
        payload = {
            "ok": False,
            "provider": "fallback",
            "category": category,
            "configured": bool(SERPAPI_KEY),
            "items": _fallback(category),
            "error": str(exc)[:200],
        }
    _CACHE[cache_key] = {"at": now, "payload": payload}
    return payload


@faq_video_feed_bp.route("/api/faq/reels", methods=["GET"])
def api_faq_reels():
    category = _safe_category(request.args.get("category"))
    start = request.args.get("start", "0")
    try:
        start = int(start)
    except Exception:
        start = 0
    return jsonify(fetch_serpapi_reels(category, start))


@faq_video_feed_bp.route("/api/faq/magic-hour/status", methods=["GET"])
def api_magic_hour_status():
    return jsonify({
        "ok": True,
        "configured": bool(MAGIC_HOUR_API_KEY),
        "provider": "magic_hour",
        "message": "Magic Hour is prepared for original SupportRD reel generation. Add MAGIC_HOUR_API_KEY, then connect a create-job endpoint for generated reels.",
    })


@faq_video_feed_bp.route("/api/faq/magic-hour/brief", methods=["POST"])
def api_magic_hour_brief():
    body = request.get_json(silent=True) or {}
    category = _safe_category(body.get("category"))
    topic = (body.get("topic") or CATEGORY_QUERIES[category]).strip()[:240]
    return jsonify({
        "ok": True,
        "configured": bool(MAGIC_HOUR_API_KEY),
        "category": category,
        "brief": {
            "duration_seconds": 15,
            "style": category,
            "prompt": f"Create a clean SupportRD 10-15 second hair reel about: {topic}. Keep it positive, hair-care focused, and brand-safe.",
            "usage": "Use this brief with Magic Hour once MAGIC_HOUR_API_KEY is configured.",
        },
    })
