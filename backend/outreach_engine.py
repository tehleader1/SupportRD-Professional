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
COMMENT_FUNNEL_PATH = os.environ.get("SUPPORT_RD_COMMENT_FUNNEL_PATH", "/hair-problems")
ADMIN_TOKEN = (
    os.environ.get("OUTREACH_ADMIN_TOKEN")
    or os.environ.get("GLOBALTRACKER_ADMIN_TOKEN")
    or os.environ.get("ADMIN_API_TOKEN")
    or ""
)
SUPPORTRD_POSTING_MODE = os.environ.get("SUPPORTRD_POSTING_MODE", "auto_owned").strip().lower()
OWNED_POSTING_MODES = {
    "owner_approved",
    "owned_approved",
    "auto_owned",
    "auto_approved",
    "automatic",
    "auto",
    "posting",
    "live",
}
PERMISSION_OPEN_TARGETS_ENABLED = os.environ.get("SUPPORTRD_PERMISSION_OPEN_TARGETS", "true").strip().lower() != "false"
FOCUS_MODE = os.environ.get("OUTREACH_FOCUS_MODE", "comments_story_family").strip().lower()
FOCUS_TERMS = [
    "comment",
    "story",
    "family",
    "letter",
    "post",
    "community",
    "career",
    "college",
    "social video",
    "faq lounge",
]
SUPPORT_RD_PROMO_HOOKS = [
    "New Hair AI!",
    "New Hair AI Premiums",
    "New Hair Scanner",
    "New Hair Analysis",
    "Exclusive suburbs Hair AI",
    "Linked Dominican Republic product",
]

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

EXPANSION_SEEDS = [
    {"category": "free blog post request", "title": "Write-for-us natural hair repair pitch", "target": "beauty blogs with contributor pages", "hook": "A practical SupportRD guide for dry hair, breakage, and product routing"},
    {"category": "guest post request", "title": "Local lifestyle guest article pitch", "target": "local lifestyle and wellness blogs", "hook": "Caribbean natural-hair solutions with AI hair support and real product paths"},
    {"category": "directory listing request", "title": "Beauty directory listing request", "target": "salon, beauty supply, and natural hair directories", "hook": "List SupportRD as a natural-hair solutions and product guidance website"},
    {"category": "salon partner request", "title": "Salon client resource pitch", "target": "independent salons and stylists", "hook": "Give salon clients a Profile scan, ARIA guidance, and Shopify product follow-up path"},
    {"category": "hair store partner request", "title": "Beauty supply counter card pitch", "target": "beauty supply stores", "hook": "Use SupportRD as a product education QR route for dry hair and breakage shoppers"},
    {"category": "creator collab request", "title": "Natural hair creator review pitch", "target": "YouTube, TikTok, and Instagram hair creators", "hook": "Invite creators to review ARIA, Profile Hair Prep, and the product catalog"},
    {"category": "student ad request", "title": "Campus career hair confidence ad", "target": "community college career centers and student bulletin boards", "hook": "Get your hair right before interviews, school, and work"},
    {"category": "radio PSA request", "title": "Community radio shoutout request", "target": "community radio and small podcast shows", "hook": "SupportRD.com - Suave Natural Hair Solution - Caribbean Hair Solutions"},
    {"category": "review/rating request", "title": "Best tech hair website 2026 rating pitch", "target": "review sites, local newspapers, and tech-beauty channels", "hook": "SupportRD combines AI hair analysis, ARIA/Jake, Studio, Diary, FAQ, and Shopify checkout"},
    {"category": "story content request", "title": "Founder story post draft", "target": "approved owned social accounts only", "hook": "Main Developer Anthony building SupportRD for real natural-hair problems"},
    {"category": "FAQ clip request", "title": "Ten second dry hair FAQ clip", "target": "owned FAQ Lounge, Shorts, Reels, and TikTok style clips", "hook": "Dry hair? Scan, ask ARIA, then pick the right SupportRD product"},
    {"category": "paid ad draft", "title": "Premium/Professional upgrade ad", "target": "owned ad review queue", "hook": "Premium Inner Circle and Professional/Making Money access with optional Studio Jake"},
    {"category": "approved comment draft", "title": "Dry hair value-first reply", "target": "approved beauty forum or social thread", "hook": "Start with a helpful no-pressure dry hair answer; link only where allowed and owner approved"},
    {"category": "approved comment draft", "title": "Breakage support reply", "target": "approved natural hair discussion comments", "hook": "Give a short breakage routine and offer SupportRD only when the thread welcomes resources"},
    {"category": "approved comment draft", "title": "Product question reply", "target": "approved product recommendation comments", "hook": "Answer the question first, then route to SupportRD catalog if links are allowed"},
    {"category": "social video feed comment", "title": "Hair video feed reply draft", "target": "approved social video feed comments", "hook": "Helpful short reply for hair videos where viewers ask about dryness, breakage, growth, or product choices"},
    {"category": "free family post draft", "title": "Free family hair care post", "target": "owned family-friendly community pages", "hook": "Free hair guidance for families getting ready for school, work, interviews, and everyday confidence"},
    {"category": "free family post draft", "title": "Parent and student hair prep post", "target": "approved parent and student communities", "hook": "A simple family hair prep message that points to ARIA/Profile only after approval"},
    {"category": "free community post draft", "title": "Neighborhood hair help post", "target": "approved local community boards", "hook": "SupportRD offers natural-hair help, product guidance, and real support for local customers"},
    {"category": "career comment/post", "title": "Career page free comment/post", "target": "career pages, job-readiness boards, and workforce comment areas", "hook": "Free SupportRD hair confidence message for people preparing for interviews, first shifts, office days, and career fairs"},
    {"category": "career post draft", "title": "Interview-ready hair confidence post", "target": "career centers and workforce readiness boards", "hook": "Get your hair right before the interview, first shift, office day, or career fair"},
    {"category": "career post draft", "title": "Returning-to-work hair prep post", "target": "job seeker and career transition communities", "hook": "SupportRD hair prep for people entering, leaving, or leveling up at work"},
    {"category": "college comment/post", "title": "College page free comment/post", "target": "approved college pages, student boards, and campus comment areas", "hook": "SupportRD Caribbean Get Away message for students getting ready for class, work, events, and internships"},
    {"category": "college post draft", "title": "Campus hair confidence post", "target": "approved college student boards", "hook": "SupportRD Caribbean Get Away: get your hair right for class, work, and campus life"},
    {"category": "college post draft", "title": "Student orientation hair help post", "target": "student life and orientation boards", "hook": "Friendly SupportRD intro for students preparing for a new semester or career move"},
    {"category": "community college comment/post", "title": "Community college page free comment/post", "target": "community college pages, entrance boards, advising boards, and comment areas", "hook": "SupportRD.com Get your Hair Right for community college entrance, advising, and career prep"},
    {"category": "community college entrance post", "title": "Community college entrance ad", "target": "community college entrance, advising, and career readiness boards", "hook": "SupportRD.com Get your Hair Right for school, career prep, and confidence"},
    {"category": "community college entrance post", "title": "Community college career fair post", "target": "community college career fair and student success offices", "hook": "Get your hair right before the career fair with SupportRD Profile Hair Prep and ARIA"},
    {"category": "blog post draft", "title": "Free blog post submission draft", "target": "free contributor blog pages and natural-hair article forms", "hook": "A complete helpful SupportRD article draft for dry hair, breakage, product guidance, and ARIA/Profile support"},
    {"category": "featured blog post pitch", "title": "Featured blog placement pitch", "target": "featured article, spotlight, directory, and editor review pages", "hook": "Pitch SupportRD as a featured tech hair website and natural-hair solutions story"},
    {"category": "hair store comment/post", "title": "Hair store page comment/post", "target": "beauty supply pages, hair store posts, and approved store comment areas", "hook": "SupportRD product education comment/post for customers deciding what to buy for dryness, breakage, or shine"},
    {"category": "salon store comment/post", "title": "Salon page comment/post", "target": "salon pages, stylist posts, and approved salon comment areas", "hook": "SupportRD after-care comment/post for salon clients who need hair guidance after appointments"},
    {"category": "owned channel comment plan", "title": "FAQ Lounge comment seeding draft", "target": "SupportRD FAQ Lounge owned channels", "hook": "Create clean SupportRD-owned comments that start useful discussions under Hair Memes, Professional Hair, and Home Hair"},
    {"category": "owned channel post plan", "title": "SupportRD product education post", "target": "SupportRD owned pages and approved channels", "hook": "Explain a hair issue, match a product path, and invite people into ARIA/Profile support"},
    {"category": "radio community post", "title": "Free radio community shoutout post", "target": "community radio pages and public event boards", "hook": "SupportRD.com Suave Natural Hair Solution Join Us"},
    {"category": "local business post draft", "title": "Charlotte area SupportRD post", "target": "approved Charlotte local business/community boards", "hook": "Local-friendly SupportRD natural hair help with real product and order support"},
    {"category": "attention diversity post", "title": "Library bulletin hair confidence post", "target": "public library boards, digital calendars, and community bulletin submissions", "hook": "Free SupportRD hair confidence resource for students, families, and job seekers"},
    {"category": "attention diversity post", "title": "Workforce nonprofit resource post", "target": "workforce nonprofits, re-entry programs, and job training resource boards", "hook": "SupportRD hair prep support for people entering interviews, school, and new work routines"},
    {"category": "attention diversity comment", "title": "Q&A hair help response draft", "target": "approved Q&A pages where hair-care advice is welcome", "hook": "Answer the exact hair concern first, then offer SupportRD only as an optional approved resource"},
    {"category": "attention diversity comment", "title": "Student club hair confidence post", "target": "student clubs, cosmetology groups, career clubs, and campus organization boards", "hook": "SupportRD hair confidence message for students preparing for events, internships, and work"},
    {"category": "attention diversity post", "title": "Community event vendor post", "target": "community event pages, vendor spotlights, and local fair boards", "hook": "SupportRD natural-hair help and product guidance as a useful local resource"},
]

COMMENT_STORY_FAMILY_SEEDS = [
    {"category": "approved comment draft", "title": "Dry hair kindness reply", "target": "approved natural hair comment threads", "hook": "Answer the hair concern first with a kind, useful routine; mention SupportRD only if links are allowed."},
    {"category": "approved comment draft", "title": "Breakage routine comment", "target": "approved hair-care videos and discussion comments", "hook": "Give a short breakage support routine, then hold the SupportRD link for owner approval."},
    {"category": "social video feed comment", "title": "Hair video helpful reply", "target": "approved TikTok, Reels, Shorts, and YouTube comment areas", "hook": "A short friendly comment for people asking about dryness, breakage, growth, or product confusion."},
    {"category": "story/family letter", "title": "Founder family letter", "target": "owned SupportRD story channels and approved family/community pages", "hook": "Main Developer Anthony built SupportRD so families can get real hair help without feeling lost."},
    {"category": "family letter", "title": "Parent and student hair prep letter", "target": "approved parent, student, and family community pages", "hook": "A warm letter for families getting ready for school, work, interviews, and daily confidence."},
    {"category": "personal story post", "title": "Why SupportRD exists story", "target": "owned social/story queue", "hook": "A real story post explaining why SupportRD exists for natural-hair problems and product guidance."},
    {"category": "free family post draft", "title": "Free family hair help post", "target": "family-friendly community pages and owned SupportRD channels", "hook": "Free SupportRD hair guidance for families preparing for school, work, events, and daily routines."},
    {"category": "career comment/post", "title": "Career confidence comment", "target": "career pages and workforce readiness comment areas", "hook": "A free, friendly hair-confidence note for people preparing for interviews, first shifts, and career fairs."},
    {"category": "college comment/post", "title": "College student hair prep post", "target": "approved college pages and student boards", "hook": "SupportRD Caribbean Get Away message for students preparing for class, work, events, and internships."},
    {"category": "community college comment/post", "title": "Community college entrance comment", "target": "community college entrance, advising, and career-readiness boards", "hook": "SupportRD.com Get your Hair Right for community college entrance, advising, and career prep."},
    {"category": "hair store comment/post", "title": "Beauty supply shopper reply", "target": "approved hair-store posts and store comment areas", "hook": "A product education reply that helps shoppers decide what to buy for dryness, breakage, or shine."},
    {"category": "salon store comment/post", "title": "Salon after-care comment", "target": "approved salon, stylist, and appointment after-care posts", "hook": "A useful after-care comment that points clients toward hair guidance after salon visits."},
    {"category": "FAQ Lounge owned comment", "title": "Home Hair Style thread starter", "target": "SupportRD FAQ Lounge owned channels", "hook": "Start useful discussion under Home Hair Style, Hair Memes Style, and Professional Hair Style categories."},
    {"category": "Facebook/story post draft", "title": "SupportRD family story caption", "target": "approved owned social story queue", "hook": "A personal-feeling story caption using SupportRD images until personal photos are approved."},
    {"category": "community story post", "title": "Charlotte family hair help story", "target": "approved Charlotte community channels", "hook": "Local, human, family-safe message that keeps SupportRD useful and permission-based."},
]

ATTENTION_LANES = [
    {
        "id": "career",
        "label": "Career comment/post",
        "description": "Career pages, job-readiness boards, workforce posts, and approved career comment areas.",
        "keywords": ["career", "workforce", "job", "interview", "work"],
        "diversify_targets": ["workforce nonprofits", "career fairs", "job training boards", "re-entry programs"],
    },
    {
        "id": "college",
        "label": "College comment/post",
        "description": "College pages, student boards, campus channels, and approved college comment areas.",
        "keywords": ["college", "student", "campus", "orientation"],
        "diversify_targets": ["student clubs", "campus organizations", "student life boards", "internship pages"],
    },
    {
        "id": "community_college",
        "label": "Community college entrance",
        "description": "Community college entrance, advising, student success, career fair, and comment/post channels.",
        "keywords": ["community college", "advising", "student success", "entrance"],
        "diversify_targets": ["advising boards", "career readiness offices", "orientation calendars", "student success pages"],
    },
    {
        "id": "social_video",
        "label": "Social video feed comment",
        "description": "Regular social video feed comments under approved hair-related videos.",
        "keywords": ["social video", "video feed", "creator", "tiktok", "reels", "shorts"],
        "diversify_targets": ["hair routine videos", "product review videos", "dry hair comments", "breakage Q&A videos"],
    },
    {
        "id": "blog_post",
        "label": "Blog post",
        "description": "Free contributor articles, write-for-us pages, and natural-hair blog submissions.",
        "keywords": ["blog post", "free blog", "guest post", "write-for-us", "contributor"],
        "diversify_targets": ["beauty blogs", "local lifestyle blogs", "wellness blogs", "family care blogs"],
    },
    {
        "id": "featured_blog",
        "label": "Featured blog post",
        "description": "Featured article, spotlight, editor review, rating, and tech-beauty list placement.",
        "keywords": ["featured blog", "rating", "newspaper", "review", "spotlight"],
        "diversify_targets": ["editor spotlights", "local newspaper features", "tech-beauty roundups", "best website lists"],
    },
    {
        "id": "store_salon",
        "label": "Hair store / salon comment-post",
        "description": "Beauty supply, hair store, salon, stylist pages, and approved store/salon comments.",
        "keywords": ["hair store", "salon", "beauty supply", "stylist"],
        "diversify_targets": ["beauty supply pages", "stylist posts", "salon after-care pages", "product education posts"],
    },
    {
        "id": "family_community",
        "label": "Family/community post",
        "description": "Family-friendly, local community, parent/student, and neighborhood post drafts.",
        "keywords": ["family", "community", "parent", "neighborhood", "local"],
        "diversify_targets": ["library boards", "community calendars", "parent groups", "local event pages"],
    },
    {
        "id": "attention_diversity",
        "label": "Attention diversity move",
        "description": "Unique low-competition places the bot uses when ordinary attention is weak.",
        "keywords": ["attention diversity", "library", "nonprofit", "q&a", "vendor", "club"],
        "diversify_targets": ["public library boards", "Q&A pages", "student clubs", "community event pages"],
    },
]

BOT_SETTINGS = {
    "mode": "backend_comments_story_family_engine",
    "draft_mode_only": True,
    "approval_required": True,
    "owned_auto_approval": SUPPORTRD_POSTING_MODE in OWNED_POSTING_MODES,
    "behalf_mode": "intelligent_followup_drafts_with_explicit_approval",
    "attention_low_threshold": 62,
    "attention_goal": "Hone in on owner-reviewed comments, story posts, family letters, and community-safe posts while diversifying placements when attention is weak.",
    "allowed_work": ["research", "draft", "queue", "log", "diagram", "owner_review"],
    "blocked_without_approval": ["post", "comment", "email", "submit", "use_account", "message"],
}

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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS outreach_followups ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "source_key TEXT NOT NULL,"
        "followup_json TEXT NOT NULL,"
        "status TEXT DEFAULT 'queued_for_owner_review',"
        "created_at TEXT NOT NULL,"
        "updated_at TEXT NOT NULL)"
    )
    conn.commit()
    return conn


def reset_outreach_engine_storage():
    conn = db()
    try:
        counts = {}
        for table in ("outreach_opportunities", "outreach_engine_events", "outreach_followups"):
            try:
                counts[table] = int((conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone() or [0])[0] or 0)
                conn.execute(f"DELETE FROM {table}")
            except Exception:
                counts[table] = 0
        conn.commit()
        return {"ok": True, "deleted": counts}
    finally:
        conn.close()


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
    funnel_url = comment_funnel_url(f"draft-{cat}", cat)
    if ("salon" in cat or "hair store" in cat) and "comment" not in cat and "post" not in cat:
        message = (
            "Hello, I am preparing partnership outreach for SupportRD Caribbean Hair Solutions. "
            "SupportRD helps people with natural-hair concerns using ARIA guidance, Profile Hair Prep, and a Shopify product catalog. "
            f"Would this be a fit for a reviewed listing, collaboration, or customer resource? {funnel_url}"
        )
    elif "social video" in cat:
        message = (
            "Social video feed comment draft: keep it short and useful under hair videos where people ask about dryness, "
            "breakage, growth, styling, or products. Do not post unless the account owner approves and the platform rules allow it. "
            f"Approved resource link: {funnel_url}"
        )
    elif "comment" in cat and not any(term in cat for term in ["community college", "career", "college", "featured blog", "blog post", "salon", "hair store", "social video"]):
        message = (
            "Draft comment for approved threads only: start by answering the person's hair question with practical help, "
            "avoid pressure, and include SupportRD only when the community rules allow links and the owner approves. "
            "Rotate the SupportRD hooks when relevant: New Hair AI!, New Hair AI Premiums, New Hair Scanner, "
            "New Hair Analysis, Exclusive suburbs Hair AI, and the linked Dominican Republic product. "
            f"Resource if approved: {funnel_url}"
        )
    elif "featured blog" in cat:
        message = (
            "Featured blog pitch draft: SupportRD can be positioned as a tech-enabled natural-hair solutions website with ARIA, "
            "Profile Hair Prep, FAQ support, product guidance, and trusted checkout routes. "
            f"Feature resource: {funnel_url}"
        )
    elif "blog post" in cat:
        message = (
            "Free blog post draft: a practical article about dry hair, breakage, product confusion, and how SupportRD routes "
            f"people into ARIA/Profile help and product guidance. Resource: {funnel_url}"
        )
    elif "salon store" in cat or "salon page" in cat:
        message = (
            "Salon comment/post draft: friendly after-care guidance for salon clients who still need help choosing products "
            f"or understanding hair issues after an appointment. Approved resource: {funnel_url}"
        )
    elif "hair store" in cat:
        message = (
            "Hair store comment/post draft: help shoppers understand dryness, breakage, shine, and product choices while "
            f"routing approved readers to SupportRD product guidance. Approved resource: {funnel_url}"
        )
    elif "family" in cat:
        message = (
            "Free family hair help: SupportRD helps parents, students, and working families understand dryness, breakage, "
            "growth routines, and product guidance in one place. "
            f"Use ARIA/Profile Hair Prep at {funnel_url} when the post is approved."
        )
    elif "community college" in cat:
        message = (
            "SupportRD.com Get your Hair Right: a friendly hair-confidence resource for community college entrance, "
            "orientation, advising, career fairs, and first-job preparation. "
            f"Approved post route: {funnel_url}"
        )
    elif "community" in cat:
        message = (
            "SupportRD community draft: free natural-hair guidance, product education, ARIA help, and Profile Hair Prep "
            f"for people looking for real hair solutions. Owner approval required before posting {funnel_url}."
        )
    elif "college" in cat or "career" in cat:
        message = (
            "SupportRD Caribbean Get Away: get your hair right before interviews, school, work, or your next opportunity. "
            f"Try Profile Hair Prep and ARIA hair guidance at {funnel_url}."
        )
    elif "radio" in cat:
        message = f"SupportRD.com - Suave Natural Hair Solution. Caribbean Hair Solutions from Dominican Republic, STI. Join us at {funnel_url}."
    elif "keyword" in cat:
        message = (
            "Best Tech Hair Website 2026 candidate: SupportRD combines AI hair analysis, voice assistants, Shopify catalog, "
            f"live Diary, FAQ Lounge, and Studio tools around natural-hair solutions. Visit {funnel_url}."
        )
    elif "social" in cat:
        message = (
            "Helpful draft only: If someone asks about dry hair, breakage, or product guidance, offer a short answer first. "
            f"Only include {funnel_url} when links are welcome and the account owner approves."
        )
    else:
        message = (
            f"{hook}. SupportRD brings AI hair guidance, Caribbean hair solutions, Profile prep, FAQ Lounge, "
            f"and product links together. Learn more at {funnel_url}."
        )
    return {
        "headline": item.get("title", "SupportRD outreach"),
        "target": item.get("target", "public audience"),
        "message": message,
        "cta": funnel_url,
    }


BASE_SCORE_TERMS = [
    ("salon", 18),
    ("hair store", 18),
    ("college", 14),
    ("career", 14),
    ("radio", 12),
    ("newspaper", 12),
    ("rating", 12),
    ("keyword", 16),
    ("google", 10),
    ("video", 10),
    ("guest post", 14),
    ("blog", 14),
    ("comment", 16),
    ("family", 13),
    ("community", 13),
    ("student", 12),
]

FOCUS_SCORE_TERMS = [
    ("comment", 28),
    ("story", 26),
    ("family", 26),
    ("letter", 24),
    ("post", 18),
    ("community", 16),
    ("faq lounge", 16),
    ("social video", 14),
]


def score(item):
    text = json.dumps(item).lower()
    total = 40
    for term, points in BASE_SCORE_TERMS:
        if term in text:
            total += points
    if FOCUS_MODE == "comments_story_family":
        for term, points in FOCUS_SCORE_TERMS:
            if term in text:
                total += points
        if not is_focus_item(item):
            total -= 8
    return min(100, total)


def is_focus_item(item):
    text = json.dumps(item, sort_keys=True).lower()
    return any(term in text for term in FOCUS_TERMS)


def focus_rank(item):
    if FOCUS_MODE != "comments_story_family":
        return 0
    text = json.dumps(item, sort_keys=True).lower()
    rank = 0
    for term, points in [
        ("comment", 70),
        ("story", 62),
        ("family", 60),
        ("letter", 60),
        ("post", 42),
        ("social video", 38),
        ("faq lounge", 34),
        ("career", 22),
        ("college", 22),
        ("community", 20),
    ]:
        if term in text:
            rank += points
    if "blog" in text and "comment" not in text and "story" not in text:
        rank -= 18
    if "email" in text or "partner request" in text:
        rank -= 10
    return max(0, rank)


def focus_reason_for(item):
    if FOCUS_MODE != "comments_story_family":
        return "General growth queue."
    text = json.dumps(item, sort_keys=True).lower()
    if "comment" in text:
        return "Comment-first focus: build useful owner-reviewed replies before chasing new pitch drafts."
    if "story" in text or "letter" in text:
        return "Story/family-letter focus: create human posts that explain SupportRD clearly."
    if "family" in text or "community" in text:
        return "Family/community focus: write safe posts for school, work, and local support contexts."
    return "Secondary item kept behind the comment and story/family queue."


def focus_bucket_for(item):
    text = json.dumps(item, sort_keys=True).lower()
    if "comment" in text or "reply" in text:
        return "comments"
    if "story" in text or "letter" in text or "caption" in text:
        return "stories_letters"
    if "family" in text or "community" in text or "parent" in text:
        return "family_posts"
    if "career" in text or "college" in text or "student" in text:
        return "career_college"
    if "hair store" in text or "salon" in text or "beauty supply" in text:
        return "store_salon"
    return "support_queue"


def focus_live_payload(movement_rows):
    views = [
        {
            "id": "comments",
            "label": "Live Comment Replies",
            "description": "Helpful owner-reviewed replies for hair videos, natural-hair discussions, college/career pages, stores, and salons.",
            "items": [],
        },
        {
            "id": "stories_letters",
            "label": "Story + Family Letters",
            "description": "Personal story posts, family letters, and captions that explain why SupportRD exists.",
            "items": [],
        },
        {
            "id": "family_posts",
            "label": "Family + Community Posts",
            "description": "Free family, parent/student, Charlotte, and neighborhood-safe post drafts.",
            "items": [],
        },
        {
            "id": "career_college",
            "label": "Career + College Posts",
            "description": "Job-readiness, college, community-college, advising, and career fair post/comment drafts.",
            "items": [],
        },
        {
            "id": "store_salon",
            "label": "Hair Store + Salon Posts",
            "description": "Store, beauty supply, stylist, salon after-care, and product education comment/post drafts.",
            "items": [],
        },
        {
            "id": "support_queue",
            "label": "Support Queue",
            "description": "Lower-priority support drafts kept behind the comment and story/family queue.",
            "items": [],
        },
    ]
    by_id = {view["id"]: view for view in views}
    for movement in movement_rows:
        bucket = focus_bucket_for(movement)
        by_id.get(bucket, by_id["support_queue"])["items"].append(movement)
    for view in views:
        view["count"] = len(view["items"])
        view["items"] = view["items"][:8]
        scores = [int(item.get("focus_rank") or item.get("attention_score") or item.get("score") or 0) for item in view["items"]]
        view["read"] = round(sum(scores) / len(scores)) if scores else 0
    top_items = movement_rows[:12]
    return {
        "mode": FOCUS_MODE,
        "updated_at": utc(),
        "headline": "Comments, story posts, family letters, and community-safe posts",
        "active_count": len([item for item in movement_rows if item.get("priority_lane") == "comments_story_family"]),
        "views": views,
        "top_results": top_items,
        "live_note": "These are live owner-review drafts. Nothing is posted, emailed, submitted, or commented automatically.",
    }


def followup_intent_for(item, context=""):
    text = f"{json.dumps(item, sort_keys=True)} {context}".lower()
    if any(term in text for term in ["question", "asking", "how", "what", "routine", "?"]):
        return {
            "intent": "answer_question",
            "tone": "helpful and direct",
            "strategy": "Answer the exact question first, then offer SupportRD as an optional resource only if links are welcome.",
        }
    if any(term in text for term in ["price", "cost", "buy", "purchase", "product", "shop"]):
        return {
            "intent": "product_guidance",
            "tone": "clear and non-pushy",
            "strategy": "Explain the hair concern, point to product guidance, and avoid pressure.",
        }
    if any(term in text for term in ["family", "parent", "student", "college", "career", "work"]):
        return {
            "intent": "family_career_support",
            "tone": "warm and confidence-building",
            "strategy": "Connect hair help to school, work, interviews, and everyday confidence.",
        }
    if any(term in text for term in ["salon", "stylist", "hair store", "beauty supply"]):
        return {
            "intent": "store_or_salon_aftercare",
            "tone": "respectful partner support",
            "strategy": "Support the existing salon/store relationship and offer after-care guidance.",
        }
    return {
        "intent": "continue_conversation",
        "tone": "human, useful, and permission-based",
        "strategy": "Follow up with value, keep it short, and wait for a real response before another reply.",
    }


def followup_draft_for(item, context=""):
    item = item or {}
    category = (item.get("category") or "SupportRD follow-up").lower()
    title = item.get("title") or "SupportRD follow-up"
    context = (context or "").strip()
    intent = followup_intent_for(item, context)
    promo_hook_line = " / ".join(SUPPORT_RD_PROMO_HOOKS)
    context_line = f" I saw this context: {context}" if context else ""
    funnel_url = comment_funnel_url(f"followup-{category}", category)
    if "comment" in category or "social video" in category:
        opening = "That makes sense. A simple first step is to look at what the hair is doing before adding more products."
        value = "For dryness or breakage, SupportRD can lead with New Hair AI!, the New Hair Scanner, and New Hair Analysis so the person gets a real read before choosing products."
        cta = f"If helpful links are welcome here, SupportRD can help check the concern and choose a route: {funnel_url}"
    elif "story" in category or "letter" in category or "family" in category:
        opening = "I built SupportRD around real family moments where people need hair help before school, work, events, or a big next step."
        value = "The point is not to overwhelm people; it is to give them a clear place to ask, scan, learn, and choose what fits, including New Hair AI Premiums and the linked Dominican Republic product path when it matches their concern."
        cta = f"When this is approved for posting, send people to {funnel_url} for ARIA, Profile Hair Prep, FAQ support, and products."
    elif "career" in category or "college" in category:
        opening = "Hair confidence matters when someone is walking into class, an interview, a first shift, or a career fair."
        value = "SupportRD gives a simple natural-hair support path with New Hair AI!, New Hair Scanner, and New Hair Analysis for people trying to get ready without guessing."
        cta = f"If the page allows helpful resources, share {funnel_url} after review."
    elif "salon" in category or "hair store" in category:
        opening = "This can work as after-care support, not a replacement for the stylist or store."
        value = "SupportRD helps customers understand dryness, breakage, growth routines, and product choices after they leave the chair or aisle, with Exclusive suburbs Hair AI and a linked Dominican Republic product route when relevant."
        cta = f"If approved, route them to {funnel_url} as the support resource."
    else:
        opening = "I wanted to follow up with something useful instead of just dropping a link."
        value = "SupportRD is built to help people understand natural-hair concerns and find the right support path through New Hair AI!, New Hair Scanner, New Hair Analysis, and premium/product routes."
        cta = f"If it is welcome here, {funnel_url} is the resource."
    return {
        "source_key": item.get("key") or str(item.get("id") or "manual-followup"),
        "source_id": item.get("id"),
        "category": item.get("category") or "follow-up",
        "title": f"Follow-up: {title}",
        "context": context,
        "intent": intent["intent"],
        "tone": intent["tone"],
        "strategy": intent["strategy"],
        "promo_hooks": SUPPORT_RD_PROMO_HOOKS,
        "promo_hook_line": promo_hook_line,
        "draft": f"{opening}{context_line}\n\n{value}\n\n{cta}",
        "cta": funnel_url,
        "approval_boundary": "Explicit approval path: approve the draft first; external websites/social accounts still require a connected permitted channel before any automated action.",
        "agent_action": "analyze_context -> infer_intent -> draft_followup -> queue_owner_review",
        "created_at": utc(),
    }


def followup_rows(limit=40):
    conn = db()
    try:
        rs = conn.execute(
            "SELECT * FROM outreach_followups ORDER BY id DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    finally:
        conn.close()
    out = []
    for row in rs:
        obj = json.loads(row["followup_json"])
        obj.update({
            "id": row["id"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })
        out.append(obj)
    return out


def insert_followup(item, context="", force=False):
    source_key = (item or {}).get("key") or str((item or {}).get("id") or "manual-followup")
    if not force:
        for existing in followup_rows(80):
            if existing.get("source_key") == source_key:
                return existing
    payload = followup_draft_for(item, context)
    now = utc()
    conn = db()
    try:
        cur = conn.execute(
            "INSERT INTO outreach_followups (source_key, followup_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (
                payload["source_key"],
                json.dumps(payload, sort_keys=True),
                "queued_for_owner_review",
                now,
                now,
            ),
        )
        conn.commit()
        payload["id"] = cur.lastrowid
        payload["status"] = "queued_for_owner_review"
        payload["updated_at"] = now
    finally:
        conn.close()
    return payload


def find_item_for_followup(payload):
    key = payload.get("key") or payload.get("source_key")
    source_id = payload.get("id") or payload.get("source_id")
    available = rows()
    if key:
        for item in available:
            if item.get("key") == key:
                return item
    if source_id:
        for item in available:
            if str(item.get("id")) == str(source_id):
                return item
    return available[0] if available else normalize_item({
        "category": "approved comment draft",
        "title": "Manual SupportRD follow-up",
        "target": "approved owner-review channel",
        "hook": "Helpful SupportRD follow-up.",
    })


def placement_lane_for(item):
    text = json.dumps(item, sort_keys=True).lower()
    priority = [
        "community_college",
        "featured_blog",
        "social_video",
        "store_salon",
        "blog_post",
        "attention_diversity",
        "career",
        "college",
        "family_community",
    ]
    by_id = {lane["id"]: lane for lane in ATTENTION_LANES}
    for lane_id in priority:
        lane = by_id.get(lane_id)
        if lane and any(keyword in text for keyword in lane["keywords"]):
            return lane
    return ATTENTION_LANES[0]


def attention_route_details_for(item):
    text = json.dumps(item, sort_keys=True).lower()
    lane = placement_lane_for(item)
    routes = [
        {
            "id": "base",
            "label": "Base outreach read",
            "points": 40,
            "active": True,
            "detail": "Every queued movement starts with a baseline opportunity score.",
        }
    ]
    for term, points in BASE_SCORE_TERMS:
        if term in text:
            routes.append({
                "id": f"term_{_slug(term)}",
                "label": f"{term} keyword",
                "points": points,
                "active": True,
                "detail": f"The movement text contains {term}, so it earns route relevance.",
            })
    if FOCUS_MODE == "comments_story_family":
        for term, points in FOCUS_SCORE_TERMS:
            if term in text:
                routes.append({
                    "id": f"focus_{_slug(term)}",
                    "label": f"focus: {term}",
                    "points": points,
                    "active": True,
                    "detail": "Current bot focus prioritizes comments, stories, family letters, posts, and community-safe movement.",
                })
        if not is_focus_item(item):
            routes.append({
                "id": "focus_penalty",
                "label": "not in focus lane",
                "points": -8,
                "active": True,
                "detail": "The item is not part of the current comment/story/family focus, so attention is cooled.",
            })
    if lane["id"] == "attention_diversity":
        routes.append({
            "id": "attention_diversity_bonus",
            "label": "attention diversity",
            "points": 8,
            "active": True,
            "detail": "Unique low-competition placements get an extra push when ordinary attention is weak.",
        })
    if "comment" in text or "post" in text:
        routes.append({
            "id": "comment_post_bonus",
            "label": "comment/post action",
            "points": 5,
            "active": True,
            "detail": "Comments and posts are closer to public attention than passive research.",
        })
    raw_total = sum(int(route["points"]) for route in routes)
    score_value = min(100, max(0, raw_total))
    return {
        "score": score_value,
        "raw_total": raw_total,
        "capped": raw_total != score_value,
        "cap": 100,
        "status": attention_status(score_value),
        "lane": lane["label"],
        "lane_id": lane["id"],
        "summary": "Attention Core is a capped quality/attention-read score, not a visitor count.",
        "routes": routes,
    }


def attention_score_for(item):
    return int(attention_route_details_for(item)["score"])


def attention_status(value):
    threshold = BOT_SETTINGS["attention_low_threshold"]
    if value < threshold:
        return "low_attention_diversify"
    if value < 78:
        return "warming_attention"
    return "strong_attention"


WEBSITE_TARGETS = {
    "community_college": [
        {"label": "Central Piedmont", "domain": "cpcc.edu", "url": "https://www.cpcc.edu/", "purpose": "Community college entrance, advising, and career-readiness review route."},
        {"label": "Student Success Hub", "domain": "community college boards", "url": "https://www.cpcc.edu/student-experience", "purpose": "Student support placement research; owner submits only where officially allowed."},
    ],
    "career": [
        {"label": "NCWorks", "domain": "ncworks.gov", "url": "https://www.ncworks.gov/", "purpose": "Career/workforce resource review route."},
        {"label": "Charlotte Works", "domain": "charlotteworks.com", "url": "https://www.charlotteworks.com/", "purpose": "Local workforce and job-readiness outreach review route."},
        {"label": "LinkedIn", "domain": "linkedin.com", "url": "https://www.linkedin.com/", "purpose": "Owned-account career post draft destination; no auto-posting."},
    ],
    "college": [
        {"label": "UNC Charlotte", "domain": "charlotte.edu", "url": "https://www.charlotte.edu/", "purpose": "Campus/student-life research route for approved ad or bulletin options."},
        {"label": "Handshake", "domain": "joinhandshake.com", "url": "https://joinhandshake.com/", "purpose": "Career-center/student job route research."},
        {"label": "LinkedIn", "domain": "linkedin.com", "url": "https://www.linkedin.com/", "purpose": "Approved student/career story post route."},
    ],
    "social_video": [
        {"label": "YouTube", "domain": "youtube.com", "url": "https://www.youtube.com/", "purpose": "Hair video comment or Shorts idea review route."},
        {"label": "TikTok", "domain": "tiktok.com", "url": "https://www.tiktok.com/", "purpose": "Hair video-feed comment draft route; owner/account approval required."},
        {"label": "Instagram", "domain": "instagram.com", "url": "https://www.instagram.com/", "purpose": "Reels/story draft review route; no account action without approval."},
    ],
    "blog_post": [
        {"label": "Medium", "domain": "medium.com", "url": "https://medium.com/", "purpose": "Free article draft or publication research route."},
        {"label": "Substack", "domain": "substack.com", "url": "https://substack.com/", "purpose": "Newsletter/blog post draft route."},
        {"label": "WordPress", "domain": "wordpress.com", "url": "https://wordpress.com/", "purpose": "Blog article draft route for owner-approved publishing."},
    ],
    "featured_blog": [
        {"label": "Patch", "domain": "patch.com", "url": "https://patch.com/", "purpose": "Local feature/news pitch research route."},
        {"label": "Product Hunt", "domain": "producthunt.com", "url": "https://www.producthunt.com/", "purpose": "Tech-product listing/review research route."},
        {"label": "HARO/Featured", "domain": "featured.com", "url": "https://www.featured.com/", "purpose": "Expert/source pitch research route."},
    ],
    "store_salon": [
        {"label": "Yelp", "domain": "yelp.com", "url": "https://www.yelp.com/", "purpose": "Salon/store discovery route; outreach stays owner-reviewed."},
        {"label": "Google Business", "domain": "google.com/business", "url": "https://www.google.com/business/", "purpose": "Business listing/review research route, no fake reviews."},
        {"label": "SupportRD Catalog", "domain": "shop.supportrd.com", "url": "https://shop.supportrd.com/", "purpose": "Owned product education and catalog route."},
    ],
    "family_community": [
        {"label": "Nextdoor", "domain": "nextdoor.com", "url": "https://nextdoor.com/", "purpose": "Local/community post draft route with owner approval."},
        {"label": "Eventbrite", "domain": "eventbrite.com", "url": "https://www.eventbrite.com/", "purpose": "Community event and vendor-board research route."},
        {"label": "SupportRD FAQ Lounge", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/FAQ", "purpose": "Owned community discussion route."},
    ],
    "attention_diversity": [
        {"label": "Meetup", "domain": "meetup.com", "url": "https://www.meetup.com/", "purpose": "Local group/event research route when attention is low."},
        {"label": "Eventbrite", "domain": "eventbrite.com", "url": "https://www.eventbrite.com/", "purpose": "Community event placement research route."},
        {"label": "SupportRD Growth Hub", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/growth-hub", "purpose": "Owned proof/authority route."},
    ],
}


def _slug(value):
    text = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "support-rd"))
    while "--" in text:
        text = text.replace("--", "-")
    return text.strip("-")[:80] or "support-rd"


def comment_funnel_url(campaign="comment-wave", lane_id="comment"):
    base = f"{SUPPORT_URL.rstrip('/')}/{COMMENT_FUNNEL_PATH.strip('/')}"
    params = (
        "utm_source=supportrd_bot"
        "&utm_medium=comment_wave"
        "&sr_bot=1"
        f"&utm_campaign={_slug(campaign)}"
        f"&sr_lane={_slug(lane_id or 'comment')}"
    )
    return f"{base}?{params}"


def website_target_for(item, lane=None):
    lane = lane or placement_lane_for(item)
    lane_id = lane.get("id", "career")
    targets = WEBSITE_TARGETS.get(lane_id) or WEBSITE_TARGETS["career"]
    basis = str(item.get("key") or item.get("title") or item.get("category") or "")
    index = sum(ord(ch) for ch in basis) % len(targets)
    target = dict(targets[index])
    campaign = _slug(f"{lane_id}-{item.get('title') or item.get('category')}")
    domain = str(target.get("domain") or "").lower()
    owned_surface = domain == "supportrd.com" or domain.endswith(".supportrd.com")
    target.update({
        "lane_id": lane_id,
        "lane": lane.get("label", "Career comment/post"),
        "status": "owned_surface_live" if owned_surface else "queued_for_owner_review",
        "action": "open_owned_surface" if owned_surface else "open_review_target",
        "tracking_url": comment_funnel_url(campaign, lane_id),
        "conversion_route": "hair_problem_intake",
        "conversion_goal": "hair issue, product interest, account signup, or catalog checkout",
        "campaign": campaign,
        "permission_note": (
            "SupportRD-owned/internal surface. In auto-owned mode, the bot can publish internally here."
            if owned_surface else
            "Research/draft target only. The bot does not post, comment, email, submit, or use accounts without owner approval."
        ),
    })
    return target


def settings_payload():
    owned_enabled = SUPPORTRD_POSTING_MODE in OWNED_POSTING_MODES
    allowed_work = list(BOT_SETTINGS.get("allowed_work", []))
    if owned_enabled:
        allowed_work.append("owned_support_rd_publish")
    blocked_without_channel = [
        "external_social_post",
        "external_comment",
        "external_email",
        "external_form_submit",
        "third_party_account_action",
    ]
    return {
        **BOT_SETTINGS,
        "draft_mode_only": not owned_enabled,
        "posting_mode": SUPPORTRD_POSTING_MODE,
        "owned_posting_enabled": owned_enabled,
        "owned_auto_approval": owned_enabled,
        "permission_open_targets_enabled": PERMISSION_OPEN_TARGETS_ENABLED,
        "auto_approval_scope": "SupportRD-owned/internal surfaces only",
        "permission_open_scope": "Public listing/submission/free-post targets are prioritized as ready targets, but third-party posting still requires a permitted connected channel.",
        "comment_funnel_route": f"{SUPPORT_URL.rstrip('/')}/{COMMENT_FUNNEL_PATH.strip('/')}",
        "comment_funnel_goal": "Move comment/story readers into the hair-problem intake so bot traffic can be measured against real customer intent.",
        "allowed_work": allowed_work,
        "blocked_without_connected_channel": blocked_without_channel,
        "focus_mode": FOCUS_MODE,
        "focus_priority": "comments, story posts, family letters, community-safe posts",
        "focus_terms": FOCUS_TERMS,
        "promo_hooks": SUPPORT_RD_PROMO_HOOKS,
        "explicit_approval_path": [
            "bot drafts follow-up",
            "owner approval is automatic for SupportRD-owned surfaces when posting mode is enabled",
            "owned SupportRD surfaces can publish internally",
            "permission-open external targets move to ready queue",
            "external websites/social accounts remain approved-ready until a permitted account/API is connected",
        ],
        "website_targets": WEBSITE_TARGETS,
        "placement_lanes": [
            {
                "id": lane["id"],
                "label": lane["label"],
                "description": lane["description"],
                "diversify_targets": lane["diversify_targets"],
            }
            for lane in ATTENTION_LANES
        ],
        "safety": "The bot may draft, queue, diagram, log, and publish internally to SupportRD-owned surfaces when posting mode is enabled. External websites/social accounts still require a permitted connected channel.",
    }


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


def movement_for(item):
    cat = (item.get("category") or "opportunity").lower()
    lane = placement_lane_for(item)
    attention_routes = attention_route_details_for(item)
    attention = int(attention_routes["score"])
    website_target = website_target_for(item, lane)
    if "letter" in cat or "story" in cat:
        movement = "Draft story/family letter/post -> make it human, useful, and permission-based -> queue owner review before any platform action."
        next_action = "Create more story posts, family letters, and owned-channel captions."
    elif "featured blog" in cat:
        movement = "Draft featured blog placement pitch -> package SupportRD proof points -> queue editor/review submission for owner approval."
        next_action = "Create more featured blog and editor spotlight pitch drafts."
    elif "blog post" in cat:
        movement = "Draft free blog article/post -> match to contributor submission page -> queue manual submission."
        next_action = "Create more free blog post drafts for natural-hair websites."
    elif "blog" in cat or "guest" in cat:
        movement = "Find permission-based contributor page -> draft article pitch -> queue manual submit -> wait for reply -> follow-up draft if no response."
        next_action = "Create another blog/post request draft while the older request waits."
    elif "salon store" in cat or ("salon" in cat and ("comment" in cat or "post" in cat)):
        movement = "Draft salon page comment/post -> focus on after-care help -> queue for owner approval before any salon account or comment action."
        next_action = "Create more salon store comment/post drafts for approved salon pages."
    elif "salon" in cat:
        movement = "Build salon target list -> draft partnership email -> prepare ARIA/Profile QR offer -> manual review before any email."
        next_action = "Add more salon partner request drafts by neighborhood and service type."
    elif "hair store" in cat and ("comment" in cat or "post" in cat):
        movement = "Draft hair store page comment/post -> help shoppers understand product choices -> queue for approval before posting."
        next_action = "Create more hair store comment/post drafts for approved store pages."
    elif "hair store" in cat or "beauty supply" in cat or "directory" in cat:
        movement = "Find listing or store contact path -> draft counter-card/listing request -> queue for owner approval."
        next_action = "Create more directory and beauty-store listing requests."
    elif "community college" in cat:
        movement = "Draft community-college entrance post/comment -> route to official student success/career/ad channels -> manual submit only."
        next_action = "Generate more community college entrance and career fair post/comment drafts."
    elif "career" in cat:
        movement = "Prepare career-safe post/comment copy -> route to official workforce/career channels -> manual submit only."
        next_action = "Generate more career page post/comment drafts."
    elif "college" in cat or "student" in cat:
        movement = "Prepare student-safe post/comment copy -> route to official bulletin/student ad channels -> manual submit only."
        next_action = "Generate more college page post/comment drafts."
    elif "radio" in cat or "podcast" in cat:
        movement = "Draft short PSA/shoutout -> find community station submission page -> owner approval before sending."
        next_action = "Make more radio/podcast shoutout request drafts."
    elif "social video" in cat:
        movement = "Draft short value-first video-feed comment -> keep it platform-safe -> queue for approval before any account action."
        next_action = "Create more regular social video feed comment drafts for hair-related conversations."
    elif "creator" in cat or "video" in cat or "faq clip" in cat:
        movement = "Draft short-form content idea -> match to creator/owned channel -> queue clip/collab request."
        next_action = "Generate more creator and short-video pitches."
    elif "rating" in cat or "newspaper" in cat or "review" in cat:
        movement = "Draft review/rating pitch -> collect relevant proof points -> queue publication request."
        next_action = "Create more best-tech-hair-site review pitches."
    elif "comment" in cat:
        movement = "Prepare value-first comment draft -> check that the thread/channel allows links -> queue for owner approval before posting."
        next_action = "Generate more comment drafts for approved hair, college, family, and community conversations."
    elif "family" in cat:
        movement = "Draft free family hair-help post -> keep tone helpful and non-pushy -> queue for approved owned/community channel."
        next_action = "Create more family-friendly posts for school, work, and daily hair prep."
    elif "community" in cat:
        movement = "Draft local/community help post -> confirm group rules and account permission -> queue without posting."
        next_action = "Create more local community and public board drafts."
    elif "social" in cat or "story" in cat:
        movement = "Draft value-first social/story copy -> keep it for approved owned accounts or manual posting."
        next_action = "Generate more story/comment drafts without auto-posting."
    elif "ad" in cat or "keyword" in cat:
        movement = "Build ad/search-entry copy -> route to approved campaign or page update -> measure clicks and account upgrades."
        next_action = "Create more ad and keyword movement drafts."
    else:
        movement = "Research opportunity -> draft copy -> queue review -> do not transmit until approved."
        next_action = "Keep generating safe queued opportunities."
    return {
        "id": item.get("id"),
        "key": item.get("key"),
        "category": item.get("category", "opportunity"),
        "title": item.get("title", "SupportRD outreach"),
        "target": item.get("target", "public audience"),
        "status": item.get("status", "queued"),
        "score": item.get("score", 0),
        "placement_lane": lane["label"],
        "placement_detail": lane["description"],
        "attention_score": attention,
        "attention_status": attention_status(attention),
        "attention_routes": attention_routes,
        "diversify_when_low": attention < BOT_SETTINGS["attention_low_threshold"],
        "diversity_targets": lane["diversify_targets"],
        "website_target": website_target,
        "focus_mode": FOCUS_MODE,
        "focus_rank": focus_rank(item),
        "focus_reason": focus_reason_for(item),
        "priority_lane": "comments_story_family" if FOCUS_MODE == "comments_story_family" else "general_growth",
        "movement": movement,
        "next_action": next_action,
        "draft": (item.get("copy") or {}).get("message") or item.get("hook") or "",
        "approval_boundary": "Draft only. Manual approval required before posting, emailing, submitting, commenting, or using an account.",
        "updated_at": item.get("updated_at") or item.get("created_at") or utc(),
    }


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


def expand_wave(force_unique=False):
    cycle = datetime.now(timezone.utc).strftime("%Y%m%d")
    batch = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    prefix = f"manual-{batch}" if force_unique else f"daily-{cycle}"
    made = []
    seeds = COMMENT_STORY_FAMILY_SEEDS if FOCUS_MODE == "comments_story_family" else EXPANSION_SEEDS
    wave_name = "comment-story-family-focus" if FOCUS_MODE == "comments_story_family" else "daily-growth-expansion"
    for index, item in enumerate(seeds, start=1):
        category = item.get("category") or "opportunity"
        title = item.get("title") or "SupportRD growth request"
        wave_item = {
            **item,
            "key": f"{prefix}:{index}:{category}:{title}".lower().replace(" ", "-")[:150],
            "cycle": cycle,
            "wave": f"manual-{wave_name}" if force_unique else wave_name,
        }
        made.append(upsert_opportunity(wave_item))
    return made


def rows(status=None):
    seed()
    conn = db()
    try:
        if status:
            rs = conn.execute(
                "SELECT * FROM outreach_opportunities WHERE status=? ORDER BY score DESC, id DESC LIMIT 250",
                (status,),
            ).fetchall()
        else:
            rs = conn.execute(
                "SELECT * FROM outreach_opportunities ORDER BY score DESC, id DESC LIMIT 250"
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
    out.sort(key=lambda item: (focus_rank(item), item.get("score", 0), item.get("updated_at", "")), reverse=True)
    return out


def engine_tick():
    seed()
    expanded = expand_wave()
    current = rows()
    followups = []
    for item in current[:3]:
        if is_focus_item(item):
            followups.append(insert_followup(item))
    log_event("heartbeat", {
        "agent_ref": BOT_AGENT_REF,
        "total": len(current),
        "expanded": len(expanded),
        "followups": len(followups),
        "queued": len([item for item in current if item.get("status") == "queued"]),
        "note": "Backend outreach engine drafts intelligent follow-ups and waits for explicit owner approval before any action.",
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


@outreach_engine_bp.route("/api/outreach/expand", methods=["POST"])
def api_expand():
    require_admin()
    seed()
    expanded = expand_wave(force_unique=True)
    log_event("expanded", {"count": len(expanded), "note": "Created more request drafts. Nothing was sent."})
    return jsonify({"ok": True, "expanded": len(expanded), "opportunities": expanded})


@outreach_engine_bp.route("/api/outreach/followups", methods=["GET", "POST"])
def api_followups():
    require_admin()
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        item = find_item_for_followup(payload)
        followup = insert_followup(item, payload.get("context") or payload.get("reply_context") or "", force=True)
        log_event("followup_queued", {
            "id": followup.get("id"),
            "source_key": followup.get("source_key"),
            "intent": followup.get("intent"),
            "note": "Follow-up drafted on behalf of owner; approval is required before action.",
        })
        return jsonify({"ok": True, "followup": followup, "approval_required": True})
    return jsonify({
        "ok": True,
        "followups": followup_rows(),
        "approval_path": settings_payload().get("explicit_approval_path"),
    })


@outreach_engine_bp.route("/api/outreach/followups/<int:followup_id>/approve", methods=["POST"])
def api_approve_followup(followup_id):
    require_admin()
    now = utc()
    conn = db()
    try:
        row = conn.execute("SELECT * FROM outreach_followups WHERE id=?", (followup_id,)).fetchone()
        if not row:
            abort(404)
        payload = json.loads(row["followup_json"])
        payload["approved_at"] = now
        payload["approved_by"] = "Main Developer Anthony"
        payload["approved_action"] = "ready_for_owner_or_connected_channel"
        payload["publish_status"] = "not_auto_published_external_account_required"
        conn.execute(
            "UPDATE outreach_followups SET followup_json=?, status='approved_ready', updated_at=? WHERE id=?",
            (json.dumps(payload, sort_keys=True), now, followup_id),
        )
        conn.commit()
    finally:
        conn.close()
    log_event("followup_approved", {
        "id": followup_id,
        "note": "Explicit approval recorded. External websites/social accounts still require permitted connected channel before automated action.",
    })
    return jsonify({
        "ok": True,
        "id": followup_id,
        "status": "approved_ready",
        "action_status": "ready_for_owner_or_connected_channel",
    })


@outreach_engine_bp.route("/api/outreach/movements")
def movements():
    report_rows = rows(request.args.get("status"))
    movement_rows = [movement_for(item) for item in report_rows]
    followups = followup_rows()
    return jsonify({
        "ok": True,
        "botVisible": False,
        "backendMode": True,
        "runsConstantly": ENGINE_ENABLED,
        "intervalSeconds": ENGINE_INTERVAL_SECONDS,
        "agent_ref": BOT_AGENT_REF,
        "count": len(movement_rows),
        "movements": movement_rows[:80],
        "focusLive": focus_live_payload(movement_rows[:80]),
        "followups": followups[:40],
        "settings": settings_payload(),
        "safety": "Explicit approval path enabled. Drafts are queued for approval; external websites/social accounts require a permitted connected channel before automated action.",
    })


@outreach_engine_bp.route("/api/outreach/settings")
def api_settings():
    return jsonify({"ok": True, "settings": settings_payload()})


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
        "settings": settings_payload(),
        "summary": {
            "total": len(report_rows),
            "categories": cats,
            "statuses": statuses,
            "topScore": max([item.get("score", 0) for item in report_rows] or [0]),
        },
        "movements": [movement_for(item) for item in report_rows[:80]],
        "focusLive": focus_live_payload([movement_for(item) for item in report_rows[:80]]),
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
