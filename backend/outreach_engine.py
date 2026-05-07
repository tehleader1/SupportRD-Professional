from flask import Blueprint, Response, abort, jsonify, request
import json
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

outreach_engine_bp = Blueprint("outreach_engine", __name__)

DB_PATH = os.environ.get("OUTREACH_DB_PATH", os.environ.get("GLOBAL_SWEEP_DB_PATH", "global_sweep.db"))
TRAFFIC_DB_PATH = os.environ.get("CREDIT_DB_PATH", os.environ.get("CLAIM_DB_PATH", "users.db"))
SUPPORT_URL = os.environ.get("SUPPORT_RD_PUBLIC_URL", "https://supportrd.com")
PUBLIC_SUPPORT_LINK = "https://supportrd.com"
BOT_AGENT_REF = os.environ.get("SUPPORT_RD_BOT_AGENT_REF", "agt_69f2460cc584819192e4a3a276e8b004")
ENGINE_ENABLED = os.environ.get("OUTREACH_ENGINE_ENABLED", "true").lower() == "true"
ENGINE_INTERVAL_SECONDS = int(os.environ.get("OUTREACH_ENGINE_INTERVAL_SECONDS", "900"))
SWARM_ENABLED = os.environ.get("OUTREACH_BOT_SWARM_ENABLED", "true").strip().lower() != "false"
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
CONNECT_API_URL = (
    os.environ.get("SUPPORTRD_CONNECT_API_URL")
    or os.environ.get("OUTREACH_CONNECT_API_URL")
    or os.environ.get("GLOBALTRACKER_CONNECT_API_URL")
    or ""
).strip()
CONNECT_API_TOKEN = (
    os.environ.get("SUPPORTRD_CONNECT_API_TOKEN")
    or os.environ.get("OUTREACH_CONNECT_API_TOKEN")
    or os.environ.get("GLOBALTRACKER_CONNECT_API_TOKEN")
    or ""
).strip()
CONNECT_API_TIMEOUT_SECONDS = int(os.environ.get("OUTREACH_CONNECT_API_TIMEOUT_SECONDS", "12"))
CONNECTOR_ENV_ALIASES = {
    "connect_api": {
        "url": ["SUPPORTRD_CONNECT_API_URL", "OUTREACH_CONNECT_API_URL", "GLOBALTRACKER_CONNECT_API_URL"],
        "token": ["SUPPORTRD_CONNECT_API_TOKEN", "OUTREACH_CONNECT_API_TOKEN", "GLOBALTRACKER_CONNECT_API_TOKEN"],
        "label": "Generic connected submit API",
    },
    "social_platform_api": {
        "url": ["SUPPORTRD_SOCIAL_PLATFORM_API_URL", "SOCIAL_PLATFORM_API_URL", "SUPPORTRD_COMMENT_POST_API_URL"],
        "token": ["SUPPORTRD_SOCIAL_PLATFORM_API_TOKEN", "SOCIAL_PLATFORM_API_TOKEN", "SUPPORTRD_COMMENT_POST_API_TOKEN"],
        "label": "Social/comment platform connector",
    },
    "publisher_api": {
        "url": ["SUPPORTRD_PUBLISHER_API_URL", "PUBLISHER_API_URL", "SUPPORTRD_BLOG_POST_API_URL"],
        "token": ["SUPPORTRD_PUBLISHER_API_TOKEN", "PUBLISHER_API_TOKEN", "SUPPORTRD_BLOG_POST_API_TOKEN"],
        "label": "Publisher/blog connector",
    },
    "email_or_form_api": {
        "url": ["SUPPORTRD_EMAIL_FORM_API_URL", "EMAIL_OR_FORM_API_URL", "SUPPORTRD_OUTREACH_EMAIL_API_URL"],
        "token": ["SUPPORTRD_EMAIL_FORM_API_TOKEN", "EMAIL_OR_FORM_API_TOKEN", "SUPPORTRD_OUTREACH_EMAIL_API_TOKEN"],
        "label": "Email/form outreach connector",
    },
    "event_listing_api": {
        "url": ["SUPPORTRD_EVENT_LISTING_API_URL", "EVENT_LISTING_API_URL"],
        "token": ["SUPPORTRD_EVENT_LISTING_API_TOKEN", "EVENT_LISTING_API_TOKEN"],
        "label": "Event/listing connector",
    },
    "business_listing_api": {
        "url": ["SUPPORTRD_BUSINESS_LISTING_API_URL", "BUSINESS_LISTING_API_URL"],
        "token": ["SUPPORTRD_BUSINESS_LISTING_API_TOKEN", "BUSINESS_LISTING_API_TOKEN"],
        "label": "Business listing connector",
    },
    "wordpress_api": {
        "url": ["SUPPORTRD_WORDPRESS_API_URL", "WORDPRESS_API_URL"],
        "token": ["SUPPORTRD_WORDPRESS_API_TOKEN", "WORDPRESS_API_TOKEN"],
        "label": "WordPress connector",
    },
}
RANDOM_DISCOVERY_TARGETS_ENABLED = os.environ.get("SUPPORTRD_RANDOM_DISCOVERY_TARGETS", "true").strip().lower() != "false"
RANDOM_DISCOVERY_WINDOW_SECONDS = max(60, int(os.environ.get("SUPPORTRD_RANDOM_DISCOVERY_WINDOW_SECONDS", "300")))
FOCUS_TERMS = [
    "comment",
    "story",
    "family",
    "letter",
    "post",
    "community",
    "bulk",
    "vendor",
    "shampoo",
    "salon vendor",
    "santiago",
    "dominican",
    "investor",
    "lasersmarket",
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
SUPPORTRD_BULK_VENDOR_ROUTES = [
    "Santiago Dominican Republic: shampoo distributors, beauty supply vendors, salon owners, and resale partners",
    "International salon vendor lane: Caribbean, Latin America, US diaspora salons, beauty supply stores, and shampoo vendors",
    "Bulk-first offer: vendor restock, salon resale, client after-care bundles, and product education QR routing",
]
SUPPORTRD_WEBSITE_HEALTH_WATCH = [
    "Traffic quality: separate real salon/vendor leads from bot traffic, spam form bursts, and scraper visits",
    "Account safety: no third-party posting unless a permitted connector or owner account is approved",
    "Site integrity: watch for broken checkout/product links, strange redirects, copied pages, and missing images",
    "Security watch: flag suspicious login patterns, unknown webhook payloads, fake payment requests, and API token gaps",
]
LASERSMARKET_PREMIUM_SIGNAL_ROUTE = (
    "LasersMarket Premium $25,000 signal review: direct calls welcome at 980-230-6202 for local stock, "
    "forex, crypto, and options investors; research-only, no guaranteed returns, no auto-trading."
)

SEO_GUIDELINE_FOCUS = "google_microsoft_health_hair_care"
SEO_GUIDELINE_SOURCES = [
    {
        "provider": "Google Search Central",
        "label": "Search Essentials",
        "url": "https://developers.google.com/search/docs/essentials",
    },
    {
        "provider": "Google Search Central",
        "label": "Helpful, reliable, people-first content",
        "url": "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    },
    {
        "provider": "Google Search Central",
        "label": "Spam policies",
        "url": "https://developers.google.com/search/docs/essentials/spam-policies",
    },
    {
        "provider": "Google Search Central",
        "label": "Structured data guidelines",
        "url": "https://developers.google.com/search/docs/appearance/structured-data/sd-policies",
    },
    {
        "provider": "Microsoft Bing",
        "label": "Bing Webmaster Guidelines",
        "url": "https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a",
    },
    {
        "provider": "Microsoft Bing",
        "label": "How Bing delivers search results",
        "url": "https://support.microsoft.com/en-us/bing/how-bing-delivers-search-results",
    },
]
SEO_HEALTH_HAIR_RULES = [
    "Create helpful, reliable, people-first hair-care content before keyword targets.",
    "Use real customer language in titles, headings, alt text, link text, and page copy.",
    "Keep SupportRD links crawlable and route readers to the exact useful page, not a doorway page.",
    "Do not keyword-stuff, hide text, auto-spin thin pages, scrape content, fake reviews, or fake authority.",
    "For hair/scalp/health-style topics, avoid diagnosis, cure, guaranteed growth, or medical-treatment claims.",
    "Phrase ARIA/Profile analysis as support and guidance; recommend licensed professional care for medical symptoms.",
    "Use structured data only for visible, truthful page content, prices, products, reviews, and policies.",
    "Prioritize Bing relevance, quality, credibility, freshness, location/language fit, engagement, and page speed.",
    "Show transparency: SupportRD purpose, product route, refund/shipping expectations, support contact, and founder/company context.",
    "Use exactly https://supportrd.com when the public link is appropriate and permitted.",
]
SEO_BOT_INSTRUCTION = (
    "Google/Microsoft SEO health-hair mode is active: write people-first natural-hair guidance, "
    "answer the exact concern, use clear searchable words naturally, keep claims truthful, avoid diagnosis/cure promises, "
    "avoid spam/keyword stuffing/fake authority, and route approved readers to exactly https://supportrd.com."
)


def seo_guidelines_payload(compact=False):
    rules = SEO_HEALTH_HAIR_RULES[:4] if compact else SEO_HEALTH_HAIR_RULES
    sources = [
        {
            "provider": source["provider"],
            "label": source["label"],
            "url": source["url"],
        }
        for source in SEO_GUIDELINE_SOURCES
    ]
    return {
        "active": True,
        "focus": SEO_GUIDELINE_FOCUS,
        "status": "loaded_into_backend_bot",
        "bot_instruction": SEO_BOT_INSTRUCTION,
        "rules": rules,
        "sources": sources,
        "health_hair_claim_boundary": "SupportRD can provide hair-care guidance and product education, not medical diagnosis, cures, or guaranteed results.",
    }

SEEDS = [
    {"category": "free blog post", "title": "Natural hair repair guest article", "target": "beauty blogs", "hook": "SupportRD Caribbean Hair Solutions hair repair routine"},
    {"category": "guest post", "title": "Dry hair and breakage guide", "target": "hair care blogs and local business blogs", "hook": "How SupportRD routes hair concerns to product guidance and real support"},
    {"category": "salon outreach", "title": "Salon partnership email", "target": "salons and stylists", "hook": "ARIA hair prep plus Shopify catalog for clients"},
    {"category": "hair store outreach", "title": "Beauty supply partnership", "target": "hair stores", "hook": "SupportRD product line and AI hair guidance"},
    {"category": "bulk shampoo vendor outreach", "title": "Santiago shampoo vendor bulk route", "target": "shampoo vendors, beauty supply distributors, and hair salon vendors around Santiago Dominican Republic", "hook": "SupportRD bulk shampoo/catalog route for salon resale, vendor restock, and client after-care bundles"},
    {"category": "international salon vendor outreach", "title": "International salon vendor bulk route", "target": "hair salon vendors and shampoo distributors internationally", "hook": "Bulk SupportRD product education, vendor restock, and salon client support for Caribbean, Latin America, US, and diaspora markets"},
    {"category": "market investor call route", "title": "LasersMarket premium signal review call", "target": "local stock, forex, crypto, and options investors", "hook": LASERSMARKET_PREMIUM_SIGNAL_ROUTE},
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
    {"category": "bulk shampoo vendor request", "title": "Santiago bulk shampoo vendor request", "target": "Santiago Dominican Republic shampoo vendors, distributors, salon suppliers, and beauty supply counters", "hook": "Offer SupportRD bulk restock and product-education bundles for salon resale and client after-care"},
    {"category": "santiago salon vendor request", "title": "Santiago salon vendor route", "target": "hair salons, stylists, and salon supply vendors in Santiago Dominican Republic", "hook": "SupportRD bulk product route with ARIA/Profile education for Dominican Republic salon clients"},
    {"category": "international shampoo distributor request", "title": "International shampoo distributor route", "target": "Caribbean, Latin America, US, and international shampoo distributors and salon vendors", "hook": "SupportRD bulk vendor restock, resale, and client-support route"},
    {"category": "premium signal route draft", "title": "LasersMarket premium signal review call", "target": "local stock, forex, crypto, and options investors", "hook": LASERSMARKET_PREMIUM_SIGNAL_ROUTE},
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
        "id": "vendor_bulk",
        "label": "Bulk shampoo / salon vendor",
        "description": "Bulk shampoo vendors, salon suppliers, beauty supply distributors, and Santiago Dominican Republic vendor routes.",
        "keywords": ["bulk", "vendor", "shampoo", "santiago", "dominican", "distributor", "salon supplier", "beauty supply"],
        "diversify_targets": ["Santiago salon vendors", "Dominican Republic distributors", "international shampoo vendors", "salon resale partners"],
    },
    {
        "id": "market_investor",
        "label": "LasersMarket premium investor call",
        "description": "Local stock, forex, crypto, and options investor lead route for LasersMarket premium signal review calls.",
        "keywords": ["lasersmarket", "premium signal", "investor", "forex", "crypto", "options", "stock", "signals"],
        "diversify_targets": ["local investor meetups", "trading education groups", "crypto communities", "options scanner leads"],
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
    "swarm_enabled": SWARM_ENABLED,
    "seo_guideline_mode": SEO_GUIDELINE_FOCUS,
    "seo_guideline_status": "active",
    "behalf_mode": "intelligent_followup_drafts_with_explicit_approval",
    "attention_low_threshold": 62,
    "attention_goal": "Hone in on owner-reviewed comments, story posts, family letters, and community-safe posts while diversifying placements when attention is weak.",
    "public_link_policy": "When a SupportRD link belongs in public copy, use exactly https://supportrd.com. Answer the person first, then place the clean domain as the next step.",
    "anthony_voice": "Useful, direct, founder-led, natural-hair support first; mention New Hair AI, scanner, analysis, ARIA/Profile help, products, family/career confidence, and Caribbean/Dominican Republic product roots only when relevant.",
    "seo_content_instruction": SEO_BOT_INSTRUCTION,
    "allowed_work": ["research", "draft", "queue", "log", "diagram", "owner_review"],
    "blocked_without_approval": ["post", "comment", "email", "submit", "use_account", "message"],
}

BOT_SWARM_WORKERS = [
    {
        "id": "owned_public_publisher",
        "name": "Public Owned Publisher",
        "role": "Turns approved SupportRD drafts into public, crawlable posts on SupportRD-owned pages.",
        "lane": "owned_support_rd",
        "terms": ["faq lounge", "owned", "support_rd", "support queue", "family", "story", "comment"],
        "cadence": "1 ready public owned post per safe approval cycle",
        "can_auto_publish": True,
        "guardrail": "Only publishes on SupportRD-owned public surfaces or connected pages you control.",
    },
    {
        "id": "comment_helper",
        "name": "Comment Helper",
        "role": "Builds value-first hair replies for approved comments and social video conversations.",
        "lane": "social_platform_api",
        "terms": ["comment", "social video", "youtube", "instagram", "tiktok", "reels", "shorts"],
        "cadence": "draft many, submit only through permitted connected channel",
        "can_auto_publish": False,
        "guardrail": "No random-site autoposting, no ban evasion, no account action without a permitted connector.",
    },
    {
        "id": "family_story_writer",
        "name": "Family Story Writer",
        "role": "Writes founder-led family, community, and personal story posts in Anthony's SupportRD voice.",
        "lane": "owned_support_rd",
        "terms": ["family", "story", "letter", "personal", "facebook", "caption", "community"],
        "cadence": "keeps story angles fresh across owned/public channels",
        "can_auto_publish": True,
        "guardrail": "Uses SupportRD images and owner-approved personal photos only.",
    },
    {
        "id": "blog_pitcher",
        "name": "Blog Pitcher",
        "role": "Prepares free blog posts, guest article pitches, featured placements, and editor-ready drafts.",
        "lane": "publisher_api",
        "terms": ["blog", "guest", "featured", "newspaper", "rating", "review", "publisher"],
        "cadence": "builds unique pitch packets instead of repeating the same request",
        "can_auto_publish": False,
        "guardrail": "Submits only to allowed contributor/publication routes through connected API or owner review.",
    },
    {
        "id": "salon_store_partner",
        "name": "Salon Store Partner",
        "role": "Builds salon, stylist, beauty-supply, and hair-store partnership messages.",
        "lane": "email_or_form_api",
        "terms": ["salon", "hair store", "beauty supply", "stylist", "store"],
        "cadence": "rotates local, product education, after-care, and QR-support angles",
        "can_auto_publish": False,
        "guardrail": "No unsolicited blasting; uses permitted forms, emails, or owner-approved outreach.",
    },
    {
        "id": "college_career_advocate",
        "name": "College Career Advocate",
        "role": "Creates college, community-college, career, workforce, and student-ready hair confidence posts.",
        "lane": "email_or_form_api",
        "terms": ["college", "community college", "career", "student", "workforce", "job", "interview"],
        "cadence": "spreads message diversity across school, career, family, and workplace angles",
        "can_auto_publish": False,
        "guardrail": "Uses official student-success, bulletin, career, or connected channels only.",
    },
    {
        "id": "attention_router",
        "name": "Attention Router",
        "role": "Measures attention lanes and moves weak traffic into more unique low-competition placements.",
        "lane": "connect_api",
        "terms": ["attention", "diversity", "library", "nonprofit", "event", "q&a", "vendor"],
        "cadence": "continuously diversifies when attention is weak",
        "can_auto_publish": False,
        "guardrail": "Routes opportunities; does not bypass platform rate limits or moderation.",
    },
]


def public_swarm_worker(worker, traffic_math=None):
    traffic_math = traffic_math or {}
    return {
        "id": worker.get("id"),
        "name": worker.get("name"),
        "role": worker.get("role"),
        "lane": worker.get("lane"),
        "cadence": worker.get("cadence"),
        "can_auto_publish": bool(worker.get("can_auto_publish")),
        "guardrail": worker.get("guardrail"),
        "seo_guideline_status": "active_google_microsoft_health_hair",
        "seo_instruction": SEO_BOT_INSTRUCTION,
        "traffic_math_view": swarm_traffic_view_for(worker, traffic_math) if traffic_math else {},
    }


def swarm_worker_for(item, lane=None):
    if not SWARM_ENABLED:
        return public_swarm_worker(BOT_SWARM_WORKERS[-1])
    lane = lane or {}
    text = " ".join([
        str(item.get("category") or ""),
        str(item.get("title") or ""),
        str(item.get("target") or ""),
        str(item.get("hook") or ""),
        str(lane.get("id") or ""),
        str(lane.get("label") or ""),
    ]).lower()
    for worker in BOT_SWARM_WORKERS:
        if any(term in text for term in worker.get("terms", [])):
            return public_swarm_worker(worker)
    return public_swarm_worker(BOT_SWARM_WORKERS[-1])


def swarm_payload(movement_rows=None, traffic_math=None):
    movement_rows = movement_rows or []
    traffic_math = traffic_math or bot_traffic_math_payload()
    active_counts = {worker["id"]: 0 for worker in BOT_SWARM_WORKERS}
    for movement in movement_rows:
        worker = movement.get("swarm_worker") or {}
        worker_id = worker.get("id")
        if worker_id in active_counts:
            active_counts[worker_id] += 1
    workers = []
    for worker in BOT_SWARM_WORKERS:
        public = public_swarm_worker(worker, traffic_math)
        public["active_movements"] = active_counts.get(worker["id"], 0)
        workers.append(public)
    return {
        "enabled": SWARM_ENABLED,
        "name": "SupportRD Safe Growth Swarm",
        "strategy": "Duplicate the work into specialist drafting/routing lanes, not duplicate accounts or spam velocity.",
        "public_owned_surface_policy": "SupportRD-owned surfaces are public/crawlable when posted, such as FAQ Lounge, hair-problems, Growth Hub, and product/support pages.",
        "auto_publish_scope": "Only SupportRD-owned public surfaces can auto-publish when posting mode is enabled; outside platforms require a permitted connector.",
        "anti_ban_policy": "No account rotation, proxy tricks, captcha bypassing, speed hacks, fake engagement, or random-site autoposting.",
        "seo_guidelines": seo_guidelines_payload(),
        "seo_instruction": SEO_BOT_INSTRUCTION,
        "traffic_math": traffic_math,
        "traffic_instruction": traffic_instruction_for_bot(traffic_math),
        "workers": workers,
    }

_scheduler_started = False
_scheduler_lock = threading.Lock()


def utc():
    return datetime.now(timezone.utc).isoformat()


def _traffic_float(value):
    try:
        if isinstance(value, str):
            value = value.replace(",", "").replace("%", "").strip()
        return float(value or 0)
    except:
        return 0.0


def _traffic_int(value):
    return int(round(_traffic_float(value)))


def _traffic_label_percent(text, labels):
    text = str(text or "")
    compact = re.sub(r"\s+", " ", text)
    for label in labels:
        found = re.search(rf"{label}\s*[:\t ]+(-?(?:\d+(?:\.\d+)?|\.\d+))\s*%", compact, re.IGNORECASE)
        if found:
            return _traffic_float(found.group(1))
    return 0.0


def _traffic_parse_metrics(report_text):
    text = str(report_text or "")
    compact = re.sub(r"\s+", " ", text)
    lower = compact.lower()
    metrics = {}
    conversion = _traffic_label_percent(compact, [r"conversion rate", r"converted sessions?"])
    bounce = _traffic_label_percent(compact, [r"bounce rate"])
    cart = _traffic_label_percent(compact, [r"added to cart rate", r"add to cart rate", r"cart rate"])
    if conversion:
        metrics["conversion_rate_percent"] = conversion
    if bounce:
        metrics["bounce_rate_percent"] = bounce
    if cart:
        metrics["added_to_cart_rate_percent"] = cart
    duration = re.search(r"average session duration\s*[:\t ]+(\d+(?:\.\d+)?)\s*seconds?", compact, re.IGNORECASE)
    if duration:
        metrics["average_session_duration_seconds"] = _traffic_float(duration.group(1))
    product = re.search(r"product[-\s]?interest(?:\s+metric|\s+signals?)?\s*[:\t ]+(\d[\d,]*)", compact, re.IGNORECASE)
    if product:
        metrics["product_interest_count"] = _traffic_int(product.group(1))
    percent_values = [_traffic_float(item) for item in re.findall(r"(-?(?:\d+(?:\.\d+)?|\.\d+))\s*%", compact)]
    if percent_values and "conversion_rate_percent" not in metrics:
        metrics["conversion_rate_percent"] = percent_values[0]
    if len(percent_values) > 1 and "bounce_rate_percent" not in metrics:
        metrics["bounce_rate_percent"] = percent_values[1]
    if len(percent_values) > 2 and "added_to_cart_rate_percent" not in metrics:
        metrics["added_to_cart_rate_percent"] = percent_values[2]
    numbers = [_traffic_float(item) for item in re.findall(r"(?<![\w.])-?(?:\d[\d,]*(?:\.\d+)?|\.\d+)(?![\w.])", compact)]
    if numbers and ("online store visitors" in lower or "conversion rate" in lower or "bounce rate" in lower):
        # Shopify copied report summaries usually arrive as labels followed by one row of values.
        metrics.setdefault("total_sessions", _traffic_int(numbers[0]))
        if len(numbers) > 1:
            metrics.setdefault("total_online_store_visitors", _traffic_int(numbers[1]))
    if "product interest" in lower and len(numbers) >= 3:
        metrics["product_interest_count"] = _traffic_int(numbers[-1])
    return metrics


def _traffic_window_days(query="", report_text="", series=None):
    series = series or []
    if len(series) > 1:
        return max(1, len(series))
    combined = f"{query or ''} {report_text or ''}"
    found = re.search(r"startOfDay\(-(\d+)d\)", combined, re.IGNORECASE)
    if found:
        return max(1, _traffic_int(found.group(1)))
    found = re.search(r"(\d{4}-\d{2}-\d{2})\s*(?:-|to|through)\s*(\d{4}-\d{2}-\d{2})", combined, re.IGNORECASE)
    if found:
        try:
            start = datetime.fromisoformat(found.group(1))
            end = datetime.fromisoformat(found.group(2))
            return max(1, (end - start).days + 1)
        except:
            pass
    return 7


def _traffic_interval_minutes(minutes):
    value = _traffic_float(minutes)
    if not value:
        return "waiting"
    if value < 1:
        return f"{max(1, round(value * 60))} sec"
    if value < 90:
        return f"{round(value)} min"
    hours = value / 60
    if hours < 48:
        return f"{hours:.1f} hr" if hours < 10 else f"{hours:.0f} hr"
    return f"{hours / 24:.1f} days"


def _traffic_arrival_estimate(total_visitors=0, total_sessions=0, metrics=None, query="", report_text="", series=None):
    metrics = metrics or {}
    series = series or []
    visitors = int(total_visitors or metrics.get("total_online_store_visitors") or 0)
    sessions = int(total_sessions or metrics.get("total_sessions") or 0)
    window_days = _traffic_window_days(query=query, report_text=report_text, series=series)
    total_minutes = max(1, window_days * 24 * 60)
    total_hours = total_minutes / 60
    conversion_rate = _traffic_float(metrics.get("conversion_rate_percent"))
    bounce_rate = _traffic_float(metrics.get("bounce_rate_percent"))
    cart_rate = _traffic_float(metrics.get("added_to_cart_rate_percent"))
    average_duration = _traffic_float(metrics.get("average_session_duration_seconds"))
    product_interest_count = int(metrics.get("product_interest_count") or 0)
    expected_conversions = sessions * (conversion_rate / 100) if conversion_rate else 0
    expected_add_to_carts = sessions * (cart_rate / 100) if cart_rate else 0
    engaged_sessions = sessions * max(0, 1 - (bounce_rate / 100)) if bounce_rate else 0
    active_seconds = sessions * average_duration if average_duration else 0
    visitor_interval = total_minutes / visitors if visitors else 0
    product_interval = total_minutes / product_interest_count if product_interest_count else 0
    cart_interval_hours = total_hours / expected_add_to_carts if expected_add_to_carts else 0
    conversion_interval_hours = total_hours / expected_conversions if expected_conversions else 0
    engaged_interval = total_minutes / engaged_sessions if engaged_sessions else 0
    return {
        "ok": bool(visitors or sessions),
        "source": "shopify_arrival_math_for_bot",
        "window_days": window_days,
        "visitors": visitors,
        "sessions": sessions,
        "visitor_interval_minutes": round(visitor_interval, 2) if visitor_interval else 0,
        "visitor_interval_label": _traffic_interval_minutes(visitor_interval),
        "product_interest_count": product_interest_count,
        "product_interest_interval_minutes": round(product_interval, 2) if product_interval else 0,
        "product_interest_interval_label": _traffic_interval_minutes(product_interval),
        "added_to_cart_rate_percent": round(cart_rate, 4) if cart_rate else 0,
        "expected_add_to_carts": round(expected_add_to_carts, 2) if expected_add_to_carts else 0,
        "add_to_cart_interval_hours": round(cart_interval_hours, 2) if cart_interval_hours else 0,
        "add_to_cart_interval_label": _traffic_interval_minutes(cart_interval_hours * 60),
        "conversion_rate_percent": round(conversion_rate, 4) if conversion_rate else 0,
        "expected_conversions": round(expected_conversions, 2) if expected_conversions else 0,
        "conversion_interval_hours": round(conversion_interval_hours, 2) if conversion_interval_hours else 0,
        "conversion_interval_label": _traffic_interval_minutes(conversion_interval_hours * 60),
        "bounce_rate_percent": round(bounce_rate, 2) if bounce_rate else 0,
        "engaged_sessions": int(round(engaged_sessions)) if engaged_sessions else 0,
        "engaged_interval_minutes": round(engaged_interval, 2) if engaged_interval else 0,
        "engaged_interval_label": _traffic_interval_minutes(engaged_interval),
        "average_session_duration_seconds": round(average_duration, 2) if average_duration else 0,
        "average_active_sessions": round(active_seconds / (total_minutes * 60), 3) if active_seconds else 0,
        "bot_read": "Use this as a baseline clock, not an exact live visitor count.",
    }


def _traffic_latest_manual_report():
    try:
        conn = sqlite3.connect(TRAFFIC_DB_PATH)
        row = conn.execute(
            "SELECT report_query, report_text, parsed_json, total_online_store_visitors, total_sessions, created_at "
            "FROM shopify_manual_session_reports ORDER BY id DESC LIMIT 1"
        ).fetchone()
        conn.close()
    except:
        row = None
    if not row:
        return {"ok": False, "source": "manual_shopify_report_missing", "arrival_estimate": _traffic_arrival_estimate()}
    try:
        series = json.loads(row[2] or "[]")
    except:
        series = []
    metrics = _traffic_parse_metrics(row[1] or "")
    total_visitors = int(row[3] or metrics.get("total_online_store_visitors") or sum(int(item.get("online_store_visitors") or 0) for item in series))
    total_sessions = int(row[4] or metrics.get("total_sessions") or sum(int(item.get("sessions") or 0) for item in series))
    return {
        "ok": True,
        "source": "manual_shopify_sessions_report",
        "updated_at": row[5] or "",
        "total_online_store_visitors": total_visitors,
        "total_sessions": total_sessions,
        "metrics": metrics,
        "arrival_estimate": _traffic_arrival_estimate(total_visitors, total_sessions, metrics, row[0] or "", row[1] or "", series),
    }


def _traffic_live_window(window_minutes=5):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=max(1, int(window_minutes or 5)))).isoformat()
    try:
        conn = sqlite3.connect(TRAFFIC_DB_PATH)
        cur = conn.cursor()
        dashboard_filter = "(event_name = 'globaltracker_dashboard_view' OR source = 'supportrd_globaltracker')"
        real_filter = f"created_at >= ? AND NOT {dashboard_filter}"
        events = int((cur.execute(f"SELECT COUNT(*) FROM shopify_traffic_events WHERE {real_filter}", (cutoff,)).fetchone() or [0])[0] or 0)
        visitors = int((cur.execute(f"SELECT COUNT(DISTINCT visitor_key) FROM shopify_traffic_events WHERE {real_filter}", (cutoff,)).fetchone() or [0])[0] or 0)
        bot_visitors = int((cur.execute("SELECT COUNT(DISTINCT visitor_key) FROM bot_return_visits WHERE created_at >= ?", (cutoff,)).fetchone() or [0])[0] or 0)
        dashboard_events = int((cur.execute(f"SELECT COUNT(*) FROM shopify_traffic_events WHERE created_at >= ? AND {dashboard_filter}", (cutoff,)).fetchone() or [0])[0] or 0)
        conn.close()
    except:
        events = visitors = bot_visitors = dashboard_events = 0
    return {
        "window_minutes": int(window_minutes or 5),
        "events": events,
        "visitors": visitors,
        "bot_visitors": bot_visitors,
        "dashboard_events": dashboard_events,
    }


def bot_traffic_math_payload():
    manual = _traffic_latest_manual_report()
    windows = [_traffic_live_window(minutes) for minutes in (5, 15, 60, 1440)]
    five = windows[0]
    score = min(100, int(five["events"] * 8 + five["visitors"] * 15 + five["bot_visitors"] * 32))
    arrival = manual.get("arrival_estimate") or _traffic_arrival_estimate()
    bounce = _traffic_float(arrival.get("bounce_rate_percent"))
    weak_point = "engagement"
    if bounce >= 85:
        weak_point = "bounce reduction"
    elif not five.get("visitors"):
        weak_point = "click-through"
    elif _traffic_float(arrival.get("expected_add_to_carts")) < 1:
        weak_point = "cart intent"
    return {
        "ok": bool(manual.get("ok") or five.get("events") or five.get("visitors")),
        "source": "bot_traffic_math_and_live_pixel_reader",
        "manual_report": manual,
        "arrival_estimate": arrival,
        "live_windows": windows,
        "wave_score": score,
        "wave_hot": score >= 42 or five["visitors"] >= 3 or five["events"] >= 6,
        "weak_point": weak_point,
        "bot_summary": (
            f"{arrival.get('visitors', 0)} visitors over {arrival.get('window_days', 0)} days; "
            f"visitor clock {arrival.get('visitor_interval_label', 'waiting')}; "
            f"product interest {arrival.get('product_interest_interval_label', 'waiting')}; "
            f"cart intent {arrival.get('add_to_cart_interval_label', 'waiting')}; "
            f"buyer clock {arrival.get('conversion_interval_label', 'waiting')}; "
            f"bounce {arrival.get('bounce_rate_percent', 0)}%."
        ),
        "updated_at": utc(),
    }


def traffic_instruction_for_bot(traffic_math):
    traffic_math = traffic_math or {}
    arrival = traffic_math.get("arrival_estimate") or {}
    weak = traffic_math.get("weak_point") or "engagement"
    if weak == "bounce reduction":
        return "Traffic math says bounce is high. Bot should write clearer first-line value, exact supportrd.com link, and a hair-problem reason to stay."
    if weak == "click-through":
        return "Traffic math says attention is not turning into live visitors yet. Bot should make posts more specific, local, and action-based around supportrd.com."
    if weak == "cart intent":
        return "Traffic math says visitors need stronger product/cart reasons. Bot should mention product help, scanner, premium guidance, and exact next click."
    if arrival.get("expected_conversions"):
        return "Traffic math has a buyer clock. Bot should protect what works and push clearer checkout/account upgrade routes."
    return "Use traffic math as the bot baseline and update copy after each live wave."


def dojj_website_health_payload():
    return {
        "name": "SupportRD Dojj traffic + website health",
        "bot": "separate_supportrd_outreach_bot",
        "bulk_treatment": SUPPORTRD_BULK_VENDOR_ROUTES,
        "premium_cross_route": LASERSMARKET_PREMIUM_SIGNAL_ROUTE,
        "website_health": SUPPORTRD_WEBSITE_HEALTH_WATCH,
        "hacker_watch_status": "watch_and_flag",
        "blocked_without_owner": [
            "external account posting",
            "third-party form submission",
            "unknown webhook payload execution",
            "wallet/payment request",
            "API token exposure",
        ],
        "dojj_instruction": (
            "Push traffic into approved vendor leads, track lead source and buyer type, "
            "watch suspicious site behavior, and log every result into Dojj."
        ),
        "updated_at": utc(),
    }


def swarm_traffic_view_for(worker, traffic_math):
    traffic_math = traffic_math or {}
    arrival = traffic_math.get("arrival_estimate") or {}
    worker_id = worker.get("id") or ""
    base = {
        "baseline": traffic_math.get("bot_summary") or "Waiting for Shopify traffic math.",
        "weak_point": traffic_math.get("weak_point") or "engagement",
        "wave_score": traffic_math.get("wave_score", 0),
        "instruction": traffic_instruction_for_bot(traffic_math),
    }
    if worker_id in {"comment_helper", "family_story_writer"}:
        base["worker_focus"] = "Turn attention into clicks by making every safe comment/story mention supportrd.com naturally and give one reason to open it."
    elif worker_id in {"college_career_advocate", "salon_store_partner"}:
        base["worker_focus"] = "Reduce bounce with practical audience-specific value: career-ready hair, salon after-care, or product guidance."
    elif worker_id == "attention_router":
        base["worker_focus"] = "If live visitors stay low, diversify away from repeated channels and route to lower-competition public placements."
    else:
        base["worker_focus"] = "Use the report-window math to tighten the message before pushing more volume."
    base["visitor_interval"] = arrival.get("visitor_interval_label") or "waiting"
    base["product_interest_interval"] = arrival.get("product_interest_interval_label") or "waiting"
    base["cart_interval"] = arrival.get("add_to_cart_interval_label") or "waiting"
    base["buyer_interval"] = arrival.get("conversion_interval_label") or "waiting"
    base["bounce_rate_percent"] = arrival.get("bounce_rate_percent", 0)
    return base


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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS outreach_connected_submissions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "source_type TEXT NOT NULL,"
        "source_id TEXT,"
        "provider TEXT NOT NULL,"
        "target_json TEXT NOT NULL,"
        "draft_json TEXT NOT NULL,"
        "status TEXT NOT NULL,"
        "response_json TEXT NOT NULL,"
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
    public_link = PUBLIC_SUPPORT_LINK
    internal_tracking_url = comment_funnel_url(f"draft-{cat}", cat)
    voice_line = (
        "Use Anthony's SupportRD voice: helpful first, real natural-hair support, New Hair AI, "
        "New Hair Scanner, New Hair Analysis, ARIA/Profile guidance, family/career confidence, "
        "and a clean next step to SupportRD.com. Follow the Google/Microsoft SEO health-hair rules: "
        "people-first help, truthful product guidance, no diagnosis or cure promises, no keyword stuffing, "
        "and no fake authority."
    )
    if any(term in cat for term in ["bulk shampoo", "salon vendor", "shampoo vendor", "distributor"]):
        message = (
            "Bulk vendor outreach draft: SupportRD is preparing shampoo/vendor and salon resale routes "
            "for Santiago Dominican Republic, international salon vendors, beauty supply distributors, and hair-care resellers. "
            "The offer is bulk restock, client after-care bundles, product education QR routing, and owner-reviewed follow-up. "
            f"Approved vendor proof route: {public_link}"
        )
    elif "lasersmarket" in cat or "premium signal" in cat or "investor" in cat:
        message = (
            f"{LASERSMARKET_PREMIUM_SIGNAL_ROUTE} Keep this as a compliant call-review lane: no guaranteed returns, "
            "no personalized financial advice, no automatic trades, and no private-stock claims."
        )
    elif ("salon" in cat or "hair store" in cat) and "comment" not in cat and "post" not in cat:
        message = (
            "Hello, I am preparing partnership outreach for SupportRD Caribbean Hair Solutions. "
            "SupportRD helps people with natural-hair concerns using ARIA guidance, Profile Hair Prep, and a Shopify product catalog. "
            f"Would this be a fit for a reviewed listing, collaboration, or customer resource? {public_link}"
        )
    elif "social video" in cat:
        message = (
            "Social video feed comment draft: keep it short and useful under hair videos where people ask about dryness, "
            "breakage, growth, styling, or products. Do not post unless the account owner approves and the platform rules allow it. "
            f"Approved resource link: {public_link}"
        )
    elif "comment" in cat and not any(term in cat for term in ["community college", "career", "college", "featured blog", "blog post", "salon", "hair store", "social video"]):
        message = (
            "Draft comment for approved threads only: start by answering the person's hair question with practical help, "
            "avoid pressure, and include SupportRD only when the community rules allow links and the owner approves. "
            "Rotate the SupportRD hooks when relevant: New Hair AI!, New Hair AI Premiums, New Hair Scanner, "
            "New Hair Analysis, Exclusive suburbs Hair AI, and the linked Dominican Republic product. "
            f"Resource if approved: {public_link}"
        )
    elif "featured blog" in cat:
        message = (
            "Featured blog pitch draft: SupportRD can be positioned as a tech-enabled natural-hair solutions website with ARIA, "
            "Profile Hair Prep, FAQ support, product guidance, and trusted checkout routes. "
            f"Feature resource: {public_link}"
        )
    elif "blog post" in cat:
        message = (
            "Free blog post draft: a practical article about dry hair, breakage, product confusion, and how SupportRD routes "
            f"people into ARIA/Profile help and product guidance. Resource: {public_link}"
        )
    elif "salon store" in cat or "salon page" in cat:
        message = (
            "Salon comment/post draft: friendly after-care guidance for salon clients who still need help choosing products "
            f"or understanding hair issues after an appointment. Approved resource: {public_link}"
        )
    elif "hair store" in cat:
        message = (
            "Hair store comment/post draft: help shoppers understand dryness, breakage, shine, and product choices while "
            f"routing approved readers to SupportRD product guidance. Approved resource: {public_link}"
        )
    elif "family" in cat:
        message = (
            "Free family hair help: SupportRD helps parents, students, and working families understand dryness, breakage, "
            "growth routines, and product guidance in one place. "
            f"Use ARIA/Profile Hair Prep at {public_link} when the post is approved."
        )
    elif "community college" in cat:
        message = (
            "SupportRD.com Get your Hair Right: a friendly hair-confidence resource for community college entrance, "
            "orientation, advising, career fairs, and first-job preparation. "
            f"Approved post route: {public_link}"
        )
    elif "community" in cat:
        message = (
            "SupportRD community draft: free natural-hair guidance, product education, ARIA help, and Profile Hair Prep "
            f"for people looking for real hair solutions. Owner approval required before posting {public_link}."
        )
    elif "college" in cat or "career" in cat:
        message = (
            "SupportRD Caribbean Get Away: get your hair right before interviews, school, work, or your next opportunity. "
            f"Try Profile Hair Prep and ARIA hair guidance at {public_link}."
        )
    elif "radio" in cat:
        message = f"SupportRD.com - Suave Natural Hair Solution. Caribbean Hair Solutions from Dominican Republic, STI. Join us at {public_link}."
    elif "keyword" in cat:
        message = (
            "Best Tech Hair Website 2026 candidate: SupportRD combines AI hair analysis, voice assistants, Shopify catalog, "
            f"live Diary, FAQ Lounge, and Studio tools around natural-hair solutions. Visit {public_link}."
        )
    elif "social" in cat:
        message = (
            "Helpful draft only: If someone asks about dry hair, breakage, or product guidance, offer a short answer first. "
            f"Only include {public_link} when links are welcome and the account owner approves."
        )
    else:
        message = (
            f"{hook}. SupportRD brings AI hair guidance, Caribbean hair solutions, Profile prep, FAQ Lounge, "
            f"and product links together. Learn more at {public_link}."
        )
    return {
        "headline": item.get("title", "SupportRD outreach"),
        "target": item.get("target", "public audience"),
        "message": message,
        "voice_instruction": voice_line,
        "seo_guideline_status": "active_google_microsoft_health_hair",
        "seo_guardrail": SEO_BOT_INSTRUCTION,
        "seo_sources": [source["label"] for source in SEO_GUIDELINE_SOURCES],
        "cta": public_link,
        "public_url": public_link,
        "internal_tracking_url": internal_tracking_url,
    }


BASE_SCORE_TERMS = [
    ("santiago", 22),
    ("dominican", 20),
    ("shampoo vendor", 22),
    ("salon vendor", 20),
    ("bulk", 18),
    ("vendor", 16),
    ("lasersmarket", 18),
    ("investor", 14),
    ("forex", 10),
    ("crypto", 10),
    ("options", 10),
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
        "live_note": "These are live owner-review drafts. Auto-click only runs on SupportRD-owned public surfaces or permitted connected channels; unconnected outside targets stay queued.",
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
    if any(term in text for term in ["bulk", "vendor", "shampoo", "santiago", "dominican", "distributor"]):
        return {
            "intent": "bulk_vendor_route",
            "tone": "professional, bilingual-friendly, and direct",
            "strategy": "Lead with bulk restock, salon resale, client after-care bundles, and Santiago/international vendor fit.",
        }
    if any(term in text for term in ["lasersmarket", "investor", "forex", "crypto", "options", "stock"]):
        return {
            "intent": "premium_signal_call_route",
            "tone": "careful and compliance-first",
            "strategy": "Invite a direct research-review call while avoiding guaranteed returns, personal financial advice, and auto-trading claims.",
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
    public_link = PUBLIC_SUPPORT_LINK
    internal_tracking_url = comment_funnel_url(f"followup-{category}", category)
    if "comment" in category or "social video" in category:
        opening = "That makes sense. A simple first step is to look at what the hair is doing before adding more products."
        value = "For dryness or breakage, SupportRD can lead with New Hair AI!, the New Hair Scanner, and New Hair Analysis so the person gets a real read before choosing products."
        cta = f"If helpful links are welcome here, SupportRD can help check the concern and choose a route: {public_link}"
    elif any(term in category for term in ["bulk", "vendor", "shampoo", "santiago", "dominican", "distributor"]):
        opening = "I am preparing a bulk SupportRD vendor route for shampoo suppliers, salon vendors, beauty supply distributors, and resale partners."
        value = "The priority is Santiago Dominican Republic first, then international salon/vendor channels that can move product through restock, resale, client after-care bundles, and product education."
        cta = f"If this is approved for outreach, send the vendor to {public_link} and log the buyer type, case quantity, delivery lane, and follow-up owner."
    elif "lasersmarket" in category or "premium signal" in category or "investor" in category:
        opening = "LasersMarket premium signal review is a direct-call research lane, not a guarantee or an auto-trade system."
        value = "The route can speak to local stock, forex, crypto, and options investors while keeping the claim clean: educational scanner, owner review, direct call, and no guaranteed returns."
        cta = "If approved, route the call to 980-230-6202 and log the market, risk question, budget boundary, and follow-up result."
    elif "story" in category or "letter" in category or "family" in category:
        opening = "I built SupportRD around real family moments where people need hair help before school, work, events, or a big next step."
        value = "The point is not to overwhelm people; it is to give them a clear place to ask, scan, learn, and choose what fits, including New Hair AI Premiums and the linked Dominican Republic product path when it matches their concern."
        cta = f"When this is approved for posting, send people to {public_link} for ARIA, Profile Hair Prep, FAQ support, and products."
    elif "career" in category or "college" in category:
        opening = "Hair confidence matters when someone is walking into class, an interview, a first shift, or a career fair."
        value = "SupportRD gives a simple natural-hair support path with New Hair AI!, New Hair Scanner, and New Hair Analysis for people trying to get ready without guessing."
        cta = f"If the page allows helpful resources, share {public_link} after review."
    elif "salon" in category or "hair store" in category:
        opening = "This can work as after-care support, not a replacement for the stylist or store."
        value = "SupportRD helps customers understand dryness, breakage, growth routines, and product choices after they leave the chair or aisle, with Exclusive suburbs Hair AI and a linked Dominican Republic product route when relevant."
        cta = f"If approved, route them to {public_link} as the support resource."
    else:
        opening = "I wanted to follow up with something useful instead of just dropping a link."
        value = "SupportRD is built to help people understand natural-hair concerns and find the right support path through New Hair AI!, New Hair Scanner, New Hair Analysis, and premium/product routes."
        cta = f"If it is welcome here, {public_link} is the resource."
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
        "cta": public_link,
        "public_url": public_link,
        "internal_tracking_url": internal_tracking_url,
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
        "vendor_bulk",
        "market_investor",
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
    "vendor_bulk": [
        {"label": "Santiago vendor search", "domain": "google.com", "url": "https://www.google.com/search?q=shampoo+vendors+Santiago+Dominican+Republic", "purpose": "Find Santiago shampoo vendors, beauty supply distributors, salon suppliers, and bulk restock partners."},
        {"label": "Dominican salon supplier search", "domain": "google.com", "url": "https://www.google.com/search?q=salon+supplier+Santiago+Republica+Dominicana", "purpose": "International Spanish/English vendor discovery for owner-reviewed outreach."},
        {"label": "SupportRD bulk catalog", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/growth-hub", "purpose": "Owned vendor proof route for bulk shampoo, salon resale, and client after-care packages."},
    ],
    "market_investor": [
        {"label": "LasersMarket premium scanner", "domain": "lasersmarket.com", "url": "https://lasersmarket.com/#lmOptionsScenarioPanel", "purpose": "Research-only premium signal review lane; direct calls welcome, no guaranteed returns."},
        {"label": "Local investor event search", "domain": "google.com", "url": "https://www.google.com/search?q=Charlotte+stock+forex+crypto+options+investor+meetup", "purpose": "Local investor attention research for compliant owner-reviewed calls."},
        {"label": "LinkedIn investor route", "domain": "linkedin.com", "url": "https://www.linkedin.com/", "purpose": "Manual professional-network outreach for investors; no spam, no guaranteed performance claims."},
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

RANDOM_DISCOVERY_TARGETS = {
    "community_college": [
        {"label": "Central Piedmont", "domain": "cpcc.edu", "url": "https://www.cpcc.edu/", "purpose": "Community college entrance, advising, and career-readiness review route.", "search_query": "community college student success hair confidence resource"},
        {"label": "Community College Daily", "domain": "ccdaily.com", "url": "https://www.ccdaily.com/", "purpose": "Community college news and resource research route.", "search_query": "community college student success guest post"},
        {"label": "Achieving the Dream", "domain": "achievingthedream.org", "url": "https://achievingthedream.org/", "purpose": "Student-success organization research route.", "search_query": "student success resource community college"},
        {"label": "Inside Higher Ed", "domain": "insidehighered.com", "url": "https://www.insidehighered.com/", "purpose": "College/career student support article research route.", "search_query": "student confidence career preparation higher ed"},
    ],
    "career": [
        {"label": "CareerOneStop", "domain": "careeronestop.org", "url": "https://www.careeronestop.org/", "purpose": "Career-readiness resource research route.", "search_query": "career readiness resource submit community"},
        {"label": "NCWorks", "domain": "ncworks.gov", "url": "https://www.ncworks.gov/", "purpose": "Career/workforce resource review route.", "search_query": "NCWorks community resource contact"},
        {"label": "Charlotte Works", "domain": "charlotteworks.com", "url": "https://www.charlotteworks.com/", "purpose": "Local workforce and job-readiness outreach review route.", "search_query": "Charlotte workforce community resource"},
        {"label": "LinkedIn", "domain": "linkedin.com", "url": "https://www.linkedin.com/", "purpose": "Owned-account career post draft destination; official account/API required.", "search_query": "hair confidence career post LinkedIn"},
    ],
    "college": [
        {"label": "Handshake", "domain": "joinhandshake.com", "url": "https://joinhandshake.com/", "purpose": "Career-center/student job route research.", "search_query": "student career center resource posting"},
        {"label": "UNC Charlotte", "domain": "charlotte.edu", "url": "https://www.charlotte.edu/", "purpose": "Campus/student-life research route for approved ad or bulletin options.", "search_query": "UNC Charlotte student resource contact"},
        {"label": "CampusGroups", "domain": "campusgroups.com", "url": "https://www.campusgroups.com/", "purpose": "Student club and campus organization discovery route.", "search_query": "college student club hair confidence post"},
        {"label": "Student Life Network", "domain": "studentlifenetwork.com", "url": "https://studentlifenetwork.com/", "purpose": "Student-life content and opportunity research route.", "search_query": "student life hair confidence career prep"},
    ],
    "social_video": [
        {"label": "YouTube Search", "domain": "youtube.com", "url": "https://www.youtube.com/results?search_query=natural+hair+dryness+breakage", "purpose": "Random hair video comment research route; account/API approval required.", "search_query": "natural hair dryness breakage"},
        {"label": "TikTok Search", "domain": "tiktok.com", "url": "https://www.tiktok.com/search?q=natural%20hair%20breakage", "purpose": "Random social video-feed research route; official account/API approval required.", "search_query": "natural hair breakage"},
        {"label": "Instagram Explore", "domain": "instagram.com", "url": "https://www.instagram.com/explore/search/keyword/?q=natural%20hair", "purpose": "Random Reels/comment discovery route; official account/API approval required.", "search_query": "natural hair reels dryness"},
        {"label": "Pinterest Search", "domain": "pinterest.com", "url": "https://www.pinterest.com/search/pins/?q=natural%20hair%20routine", "purpose": "Visual hair routine discovery route.", "search_query": "natural hair routine"},
    ],
    "blog_post": [
        {"label": "Medium", "domain": "medium.com", "url": "https://medium.com/", "purpose": "Free article draft or publication research route.", "search_query": "natural hair write for us blog"},
        {"label": "WordPress Discover", "domain": "wordpress.com", "url": "https://wordpress.com/read/search?q=natural%20hair", "purpose": "Random blog/comment discovery route for owner-reviewed publishing.", "search_query": "natural hair blog comment"},
        {"label": "Substack Search", "domain": "substack.com", "url": "https://substack.com/search/natural%20hair", "purpose": "Newsletter/blog post draft discovery route.", "search_query": "natural hair newsletter guest post"},
        {"label": "Blogger Search", "domain": "blogger.com", "url": "https://www.google.com/search?q=site%3Ablogspot.com+natural+hair+dryness", "purpose": "Blogspot natural-hair discussion discovery route.", "search_query": "site:blogspot.com natural hair dryness"},
    ],
    "featured_blog": [
        {"label": "Patch", "domain": "patch.com", "url": "https://patch.com/", "purpose": "Local feature/news pitch research route.", "search_query": "Patch local business feature submission"},
        {"label": "Featured", "domain": "featured.com", "url": "https://www.featured.com/", "purpose": "Expert/source pitch research route.", "search_query": "expert source natural hair technology"},
        {"label": "Product Hunt", "domain": "producthunt.com", "url": "https://www.producthunt.com/", "purpose": "Tech-product listing/review research route.", "search_query": "AI hair website product launch"},
        {"label": "SourceBottle", "domain": "sourcebottle.com", "url": "https://www.sourcebottle.com/", "purpose": "Media/source opportunity discovery route.", "search_query": "beauty technology source request"},
    ],
    "store_salon": [
        {"label": "Yelp Charlotte Salons", "domain": "yelp.com", "url": "https://www.yelp.com/search?find_desc=natural+hair+salon&find_loc=Charlotte%2C+NC", "purpose": "Random salon/store discovery route; owner-reviewed outreach only.", "search_query": "natural hair salon Charlotte contact"},
        {"label": "Google Business Search", "domain": "google.com/business", "url": "https://www.google.com/search?q=natural+hair+salon+Charlotte+NC", "purpose": "Salon/store discovery route, no fake reviews.", "search_query": "natural hair salon Charlotte NC"},
        {"label": "StyleSeat", "domain": "styleseat.com", "url": "https://www.styleseat.com/", "purpose": "Stylist discovery and after-care outreach research route.", "search_query": "natural hair stylist aftercare"},
        {"label": "SupportRD Catalog", "domain": "shop.supportrd.com", "url": "https://shop.supportrd.com/", "purpose": "Owned product education and catalog route.", "search_query": "SupportRD product education"},
    ],
    "vendor_bulk": [
        {"label": "Santiago shampoo vendors", "domain": "google.com", "url": "https://www.google.com/search?q=shampoo+vendors+Santiago+Dominican+Republic", "purpose": "Bulk shampoo vendor discovery around Santiago Dominican Republic.", "search_query": "shampoo vendors Santiago Dominican Republic"},
        {"label": "Dominican beauty supply distributors", "domain": "google.com", "url": "https://www.google.com/search?q=beauty+supply+distributor+Santiago+Republica+Dominicana", "purpose": "Beauty supply and distributor discovery for bulk SupportRD route.", "search_query": "beauty supply distributor Santiago Republica Dominicana"},
        {"label": "Facebook vendor group search", "domain": "facebook.com", "url": "https://www.facebook.com/search/groups/?q=salon%20Santiago%20Republica%20Dominicana", "purpose": "Manual group discovery only; no account action without approval.", "search_query": "salon vendor Santiago Dominican Republic group"},
        {"label": "SupportRD bulk proof", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/growth-hub", "purpose": "Owned vendor proof route.", "search_query": "SupportRD bulk salon vendor"},
    ],
    "market_investor": [
        {"label": "LasersMarket premium scanner", "domain": "lasersmarket.com", "url": "https://lasersmarket.com/#lmOptionsScenarioPanel", "purpose": "Premium signal review call route; research-only and owner-reviewed.", "search_query": "LasersMarket premium signal review"},
        {"label": "Charlotte investor meetup search", "domain": "google.com", "url": "https://www.google.com/search?q=Charlotte+stock+forex+crypto+options+investor+meetup", "purpose": "Local investor audience discovery for direct calls.", "search_query": "Charlotte stock forex crypto options investor meetup"},
        {"label": "Eventbrite investor events", "domain": "eventbrite.com", "url": "https://www.eventbrite.com/d/nc--charlotte/investing/", "purpose": "Local investing event research.", "search_query": "Charlotte investing event"},
        {"label": "LinkedIn investor route", "domain": "linkedin.com", "url": "https://www.linkedin.com/", "purpose": "Professional manual outreach only, no performance promises.", "search_query": "local options traders investors"},
    ],
    "family_community": [
        {"label": "Nextdoor", "domain": "nextdoor.com", "url": "https://nextdoor.com/", "purpose": "Local/community post draft route with owner approval.", "search_query": "family hair help community post"},
        {"label": "Eventbrite Charlotte", "domain": "eventbrite.com", "url": "https://www.eventbrite.com/d/nc--charlotte/community--events/", "purpose": "Community event and vendor-board research route.", "search_query": "Charlotte community event vendor natural hair"},
        {"label": "Facebook Groups Search", "domain": "facebook.com", "url": "https://www.facebook.com/search/groups/?q=natural%20hair%20charlotte", "purpose": "Owned/approved group research route; no account action without permission.", "search_query": "natural hair Charlotte group"},
        {"label": "SupportRD FAQ Lounge", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/FAQ", "purpose": "Owned community discussion route.", "search_query": "SupportRD FAQ Lounge"},
    ],
    "attention_diversity": [
        {"label": "Meetup Charlotte", "domain": "meetup.com", "url": "https://www.meetup.com/find/?keywords=natural%20hair&location=us--nc--Charlotte", "purpose": "Local group/event research route when attention is low.", "search_query": "Charlotte natural hair meetup"},
        {"label": "Public Library Events", "domain": "cmlibrary.org", "url": "https://www.cmlibrary.org/events", "purpose": "Public library/community board research route.", "search_query": "library event community resource Charlotte"},
        {"label": "Eventbrite", "domain": "eventbrite.com", "url": "https://www.eventbrite.com/d/nc--charlotte/health--events/", "purpose": "Community event placement research route.", "search_query": "Charlotte wellness community event"},
        {"label": "SupportRD Growth Hub", "domain": "supportrd.com", "url": f"{SUPPORT_URL}/growth-hub", "purpose": "Owned proof/authority route.", "search_query": "SupportRD growth proof"},
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
    discovery_targets = RANDOM_DISCOVERY_TARGETS.get(lane_id) or RANDOM_DISCOVERY_TARGETS["career"]
    static_targets = WEBSITE_TARGETS.get(lane_id) or WEBSITE_TARGETS["career"]
    targets = discovery_targets if RANDOM_DISCOVERY_TARGETS_ENABLED else static_targets
    basis = str(item.get("key") or item.get("title") or item.get("category") or "")
    bucket = int(time.time() // RANDOM_DISCOVERY_WINDOW_SECONDS) if RANDOM_DISCOVERY_TARGETS_ENABLED else 0
    index = (sum(ord(ch) for ch in basis) + bucket) % len(targets)
    target = dict(targets[index])
    campaign = _slug(f"{lane_id}-{item.get('title') or item.get('category')}")
    domain = str(target.get("domain") or "").lower()
    owned_surface = domain == "supportrd.com" or domain.endswith(".supportrd.com")
    target.update({
        "lane_id": lane_id,
        "lane": lane.get("label", "Career comment/post"),
        "target_source": "random_discovery_pool" if RANDOM_DISCOVERY_TARGETS_ENABLED else "static_review_pool",
        "randomized": bool(RANDOM_DISCOVERY_TARGETS_ENABLED),
        "random_window_seconds": RANDOM_DISCOVERY_WINDOW_SECONDS if RANDOM_DISCOVERY_TARGETS_ENABLED else 0,
        "found_at": utc(),
        "found_reason": "Random timed discovery target selected for this approved bot movement." if RANDOM_DISCOVERY_TARGETS_ENABLED else "Static target selected for this review lane.",
        "search_query": target.get("search_query") or f"{lane.get('label', 'SupportRD')} SupportRD natural hair",
        "status": "public_owned_surface_live" if owned_surface else "queued_for_owner_review",
        "action": "open_public_owned_feed" if owned_surface else "open_review_target",
        "tracking_url": PUBLIC_SUPPORT_LINK,
        "public_url": PUBLIC_SUPPORT_LINK,
        "internal_tracking_url": comment_funnel_url(campaign, lane_id),
        "conversion_route": "hair_problem_intake",
        "conversion_goal": "hair issue, product interest, account signup, or catalog checkout",
        "campaign": campaign,
        "permission_note": (
            "SupportRD-owned public surface. In auto-owned mode, the bot can publish a public crawlable SupportRD post here."
            if owned_surface else
            "Research/draft target only. The bot does not post, comment, email, submit, or use accounts without owner approval."
        ),
    })
    return target


def connected_provider_for_target(target):
    domain = str((target or {}).get("domain") or "").lower()
    if domain == "supportrd.com" or domain.endswith(".supportrd.com"):
        return "owned_support_rd"
    if "wordpress" in domain:
        return "wordpress_api"
    if domain in {"linkedin.com", "instagram.com", "youtube.com", "tiktok.com", "nextdoor.com", "facebook.com", "pinterest.com"}:
        return "social_platform_api"
    if any(term in domain for term in ["cpcc.edu", "ncworks.gov", "charlotteworks.com", "charlotte.edu", "joinhandshake.com"]):
        return "email_or_form_api"
    if any(term in domain for term in ["patch.com", "medium.com", "substack.com", "featured.com", "producthunt.com"]):
        return "publisher_api"
    if any(term in domain for term in ["eventbrite.com", "meetup.com"]):
        return "event_listing_api"
    if any(term in domain for term in ["yelp.com", "google.com/business"]):
        return "business_listing_api"
    return "connect_api"


def first_configured_env(names):
    for name in names:
        value = (os.environ.get(name) or "").strip()
        if value:
            return name, value
    return "", ""


def connector_for_provider(provider):
    provider = str(provider or "connect_api").strip().lower()
    if provider == "owned_support_rd":
        return {
            "provider": provider,
            "configured": SUPPORTRD_POSTING_MODE in OWNED_POSTING_MODES,
            "url": "",
            "token": "",
            "mode": "owned_surface",
            "env_source": "SUPPORTRD_POSTING_MODE",
            "token_env_source": "",
            "label": "SupportRD owned feed",
            "required_env_groups": [["SUPPORTRD_POSTING_MODE=auto_owned"]],
        }
    aliases = CONNECTOR_ENV_ALIASES.get(provider, CONNECTOR_ENV_ALIASES["connect_api"])
    url_env, url = first_configured_env(aliases["url"])
    token_env, token = first_configured_env(aliases["token"])
    if url:
        return {
            "provider": provider,
            "configured": True,
            "url": url,
            "token": token,
            "mode": "generic_connect_api_bridge" if provider == "connect_api" else "provider_specific",
            "env_source": url_env,
            "token_env_source": token_env,
            "label": aliases.get("label") or provider,
            "required_env_groups": [aliases["url"], CONNECTOR_ENV_ALIASES["connect_api"]["url"]],
        }
    if CONNECT_API_URL:
        return {
            "provider": provider,
            "configured": True,
            "url": CONNECT_API_URL,
            "token": CONNECT_API_TOKEN,
            "mode": "generic_connect_api_bridge",
            "env_source": "SUPPORTRD_CONNECT_API_URL",
            "token_env_source": "SUPPORTRD_CONNECT_API_TOKEN" if CONNECT_API_TOKEN else "",
            "label": aliases.get("label") or provider,
            "required_env_groups": [aliases["url"], CONNECTOR_ENV_ALIASES["connect_api"]["url"]],
        }
    return {
        "provider": provider,
        "configured": False,
        "url": "",
        "token": "",
        "mode": "missing_connect_api_bridge",
        "env_source": "",
        "token_env_source": "",
        "label": aliases.get("label") or provider,
        "required_env_groups": [aliases["url"], CONNECTOR_ENV_ALIASES["connect_api"]["url"]],
    }


def public_connector_info(provider):
    connector = connector_for_provider(provider)
    return {
        "provider": connector["provider"],
        "configured": connector["configured"],
        "mode": connector["mode"],
        "env_source": connector["env_source"],
        "token_env_source": connector["token_env_source"],
        "url_configured": bool(connector["url"]),
        "token_configured": bool(connector["token"]),
        "label": connector["label"],
        "required_env_groups": connector["required_env_groups"],
    }


def connected_channel_status():
    owned_enabled = SUPPORTRD_POSTING_MODE in OWNED_POSTING_MODES
    generic_connected = bool(CONNECT_API_URL)

    def channel(provider, label, scope, action, missing_status="connect_api_required"):
        connector = public_connector_info(provider)
        if provider == "owned_support_rd":
            status = "connected" if owned_enabled else "set_SUPPORTRD_POSTING_MODE_auto_owned"
        elif connector["configured"]:
            status = connector["mode"]
        else:
            status = missing_status
        return {
            "provider": provider,
            "label": label,
            "connected": owned_enabled if provider == "owned_support_rd" else connector["configured"],
            "status": status,
            "scope": scope,
            "action": action,
            "connector": connector,
        }

    connected_providers = [
        public_connector_info(provider)
        for provider in [
            "connect_api",
            "social_platform_api",
            "publisher_api",
            "email_or_form_api",
            "event_listing_api",
            "business_listing_api",
            "wordpress_api",
        ]
    ]
    return {
        "updated_at": utc(),
        "approval_mode": "owner_clicked_connected_submit",
        "connected_api_configured": generic_connected,
        "connect_api_url_configured": generic_connected,
        "connect_api_token_configured": bool(CONNECT_API_TOKEN),
        "connected_provider_count": len([item for item in connected_providers if item["configured"]]),
        "provider_connectors": connected_providers,
        "setup_env": [
            "SUPPORTRD_CONNECT_API_URL",
            "SUPPORTRD_CONNECT_API_TOKEN",
        ],
        "channels": [
            channel("owned_support_rd", "SupportRD public feed", "FAQ Lounge, Growth Hub, hair-problems, and SupportRD-owned public surfaces.", "publish_public_supportrd"),
            channel("connect_api", "Generic connected submit API", "Owner-approved handoff to your permitted posting/email/social integration.", "POST approved draft payload to SUPPORTRD_CONNECT_API_URL", "missing_connect_api_url"),
            channel("email_or_form_api", "Email/form outreach connector", "Salon, hair store, college, career, blog, or publisher outreach that has an allowed form/email route.", "handoff_to_connect_api"),
            channel("social_platform_api", "Social/comment platform connector", "Only accounts/platforms you own or are authorized to use, through permitted APIs or the connected webhook.", "handoff_to_connect_api", "connect_api_missing_for_social_platform_api"),
            channel("publisher_api", "Publisher/blog connector", "Blog, guest post, featured article, and directory submissions where submission is allowed.", "handoff_to_connect_api"),
            channel("event_listing_api", "Event/listing connector", "Community event posts and allowed listing submissions.", "handoff_to_connect_api"),
            channel("business_listing_api", "Business listing connector", "Business directory, salon, store, and local listing routes where submission is allowed.", "handoff_to_connect_api"),
            channel("wordpress_api", "WordPress connector", "WordPress-owned or approved contributor routes.", "handoff_to_connect_api"),
        ],
        "safety": "Connected API means owner-approved submit handoff. It is not a bypass for platforms that block automation or require account/app approval.",
    }


def submission_rows(limit=30):
    conn = db()
    try:
        rs = conn.execute(
            "SELECT * FROM outreach_connected_submissions ORDER BY id DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    finally:
        conn.close()
    out = []
    for row in rs:
        out.append({
            "id": row["id"],
            "source_type": row["source_type"],
            "source_id": row["source_id"],
            "provider": row["provider"],
            "target": json.loads(row["target_json"]),
            "draft": json.loads(row["draft_json"]),
            "status": row["status"],
            "response": json.loads(row["response_json"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })
    return out


def insert_submission(source_type, source_id, provider, target, draft, status, response):
    now = utc()
    conn = db()
    try:
        cur = conn.execute(
            "INSERT INTO outreach_connected_submissions "
            "(source_type, source_id, provider, target_json, draft_json, status, response_json, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                source_type,
                str(source_id or ""),
                provider,
                json.dumps(target or {}, sort_keys=True),
                json.dumps(draft or {}, sort_keys=True),
                status,
                json.dumps(response or {}, sort_keys=True),
                now,
                now,
            ),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def find_movement_for_submit(payload):
    payload = payload or {}
    key = payload.get("key") or payload.get("source_key")
    source_id = payload.get("id") or payload.get("source_id")
    for item in rows():
        if key and item.get("key") == key:
            return "movement", item.get("id"), movement_for(item)
        if source_id and str(item.get("id")) == str(source_id):
            return "movement", item.get("id"), movement_for(item)
    if payload.get("followup_id"):
        for followup in followup_rows(120):
            if str(followup.get("id")) == str(payload.get("followup_id")):
                return "followup", followup.get("id"), {
                    "id": followup.get("id"),
                    "key": followup.get("source_key"),
                    "category": followup.get("category") or "follow-up",
                    "title": followup.get("title") or "SupportRD follow-up",
                    "target": "connected owner-approved channel",
                    "status": followup.get("status") or "approved_ready",
                    "draft": followup.get("draft") or "",
                    "movement": followup.get("strategy") or "",
                    "next_action": "Submit through connected API when target channel is permitted.",
                    "approval_boundary": followup.get("approval_boundary") or "Owner approved connected handoff only.",
                    "website_target": website_target_for({
                        "key": followup.get("source_key"),
                        "category": followup.get("category") or "follow-up",
                        "title": followup.get("title") or "SupportRD follow-up",
                    }),
                }
    available = rows()
    if available:
        first = available[0]
        return "movement", first.get("id"), movement_for(first)
    default = normalize_item({
        "category": "approved comment draft",
        "title": "Manual connected submit",
        "target": "owner-approved connected API",
        "hook": "SupportRD natural-hair solutions.",
    })
    return "movement", None, movement_for(default)


def submit_through_connected_api(payload):
    source_type, source_id, movement = find_movement_for_submit(payload)
    target = movement.get("website_target") or website_target_for(movement)
    inferred_provider = connected_provider_for_target(target)
    provider = (payload or {}).get("provider") or inferred_provider
    draft = {
        "title": movement.get("title") or "SupportRD growth draft",
        "category": movement.get("category") or "outreach",
        "message": movement.get("draft") or movement.get("movement") or "",
        "movement": movement.get("movement") or "",
        "next_action": movement.get("next_action") or "",
        "tracking_url": PUBLIC_SUPPORT_LINK,
        "public_url": PUBLIC_SUPPORT_LINK,
        "internal_campaign_url": target.get("internal_tracking_url") or comment_funnel_url("connected-submit", target.get("lane_id") or "connect"),
        "approved_by": "Main Developer Anthony",
        "approved_at": utc(),
        "approval_mode": "owner_clicked_connected_submit",
    }
    owned = provider == "owned_support_rd"
    if owned:
        response = {
            "message": "Use the SupportRD owned publish endpoint for this card. The UI can publish it as a public SupportRD-owned post now.",
            "publish_endpoint": "/api/outreach/owned-posts/publish",
            "public_url": "https://supportrd.com/FAQ",
            "surface": "SupportRD FAQ Lounge / Developer Feed",
        }
        submission_id = insert_submission(source_type, source_id, provider, target, draft, "ready_for_owned_publish", response)
        log_event("connected_submit_ready_owned", {"id": submission_id, "source_id": source_id, "provider": provider})
        return {
            "ok": True,
            "submission_id": submission_id,
            "provider": provider,
            "status": "ready_for_owned_publish",
            "target": target,
            "draft": draft,
            "response": response,
        }
    connector = connector_for_provider(provider)
    if not connector["configured"]:
        response = {
            "message": f"{connector['label']} is not configured yet. Add a provider-specific connector or the generic SUPPORTRD_CONNECT_API_URL bridge.",
            "needed_env": ["SUPPORTRD_CONNECT_API_URL", "SUPPORTRD_CONNECT_API_TOKEN"],
            "required_any_of": connector["required_env_groups"],
            "provider_needed": provider,
            "bridge_provider": "connect_api",
            "connector": public_connector_info(provider),
        }
        submission_id = insert_submission(source_type, source_id, provider, target, draft, "connect_api_missing", response)
        log_event("connected_submit_missing_api", {"id": submission_id, "source_id": source_id, "provider": provider})
        return {
            "ok": False,
            "submission_id": submission_id,
            "provider": provider,
            "status": "connect_api_missing",
            "target": target,
            "draft": draft,
            "response": response,
        }

    handoff = {
        "source": "support_rd_outreach_engine",
        "agent_ref": BOT_AGENT_REF,
        "provider": provider,
        "inferred_provider": inferred_provider,
        "submit_mode": "owner_approved_connected_api",
        "target": target,
        "draft": draft,
        "movement": movement,
        "connector": {
            "provider": provider,
            "mode": connector["mode"],
            "env_source": connector["env_source"],
            "token_configured": bool(connector["token"]),
        },
        "safety": "Owner clicked approve-through-connected-API. The receiving connector must obey platform rules and only use permitted accounts/APIs.",
    }
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if connector["token"]:
        headers["Authorization"] = f"Bearer {connector['token']}"
    req = urllib.request.Request(
        connector["url"],
        data=json.dumps(handoff).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=CONNECT_API_TIMEOUT_SECONDS) as res:
            body = res.read(24000).decode("utf-8", "replace")
            response = {
                "http_status": int(getattr(res, "status", 200)),
                "body": body[:2000],
            }
            status = "submitted_to_connected_api"
            ok = 200 <= response["http_status"] < 300
    except urllib.error.HTTPError as exc:
        response = {
            "http_status": int(exc.code),
            "body": exc.read(2000).decode("utf-8", "replace"),
        }
        status = "connected_api_rejected"
        ok = False
    except Exception as exc:
        response = {"error": str(exc)[:400]}
        status = "connected_api_failed"
        ok = False
    submission_id = insert_submission(source_type, source_id, provider, target, draft, status, response)
    log_event("connected_submit", {"id": submission_id, "provider": provider, "status": status, "ok": ok})
    return {
        "ok": ok,
        "submission_id": submission_id,
        "provider": provider,
        "status": status,
        "target": target,
        "draft": draft,
        "response": response,
    }


def settings_payload(traffic_math=None):
    traffic_math = traffic_math or bot_traffic_math_payload()
    seo_guidelines = seo_guidelines_payload()
    owned_enabled = SUPPORTRD_POSTING_MODE in OWNED_POSTING_MODES
    connected_enabled = bool(CONNECT_API_URL)
    allowed_work = list(BOT_SETTINGS.get("allowed_work", []))
    if owned_enabled:
        allowed_work.append("owned_support_rd_publish")
    if connected_enabled:
        allowed_work.append("connected_api_auto_feed")
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
        "connected_auto_submit_enabled": connected_enabled,
        "connected_auto_submit_scope": "Connected provider lanes can be fed through the approved webhook/API bridge when the owner token approves the move.",
        "auto_click_meaning": "Auto-click means: publish to SupportRD-owned public pages or submit through a permitted connected API/form/social/email provider. If no permitted channel is connected, the move stays queued.",
        "auto_approval_scope": "SupportRD-owned public surfaces publish as live public SupportRD posts; connected provider lanes feed the connected API; unconnected third-party targets stay queued.",
        "permission_open_scope": "Public listing/submission/free-post targets are prioritized as ready targets. Third-party posting still requires a permitted connected channel, then the green approval can feed that channel.",
        "public_owned_surface_scope": "FAQ Lounge, hair-problems, Growth Hub, public account/backlink pages, product/support pages, and any SupportRD-owned page can be used as public crawlable posting surfaces.",
        "traffic_math": traffic_math,
        "traffic_math_instruction": traffic_instruction_for_bot(traffic_math),
        "dojj_website_health": dojj_website_health_payload(),
        "seo_guidelines": seo_guidelines,
        "seo_instruction": SEO_BOT_INSTRUCTION,
        "bot_swarm": swarm_payload(traffic_math=traffic_math),
        "random_discovery_targets_enabled": RANDOM_DISCOVERY_TARGETS_ENABLED,
        "random_discovery_window_seconds": RANDOM_DISCOVERY_WINDOW_SECONDS,
        "random_discovery_scope": "Each movement receives a timed random discovery target from the lane pool; the connected API receives that exact found target and comment draft.",
        "comment_funnel_route": f"{SUPPORT_URL.rstrip('/')}/{COMMENT_FUNNEL_PATH.strip('/')}",
        "comment_funnel_goal": "Move comment/story readers into the hair-problem intake so bot traffic can be measured against real customer intent.",
        "allowed_work": allowed_work,
        "blocked_without_connected_channel": blocked_without_channel,
        "connected_submit": connected_channel_status(),
        "focus_mode": FOCUS_MODE,
        "focus_priority": "comments, story posts, family letters, community-safe posts",
        "focus_terms": FOCUS_TERMS,
        "promo_hooks": SUPPORT_RD_PROMO_HOOKS,
        "seo_search_quality_priority": [
            "helpful natural-hair concern pages",
            "clear product/support routes",
            "truthful health-hair guidance without cure claims",
            "crawlable internal links and visible structured data",
            "fresh, credible, founder/company-transparent content",
        ],
        "explicit_approval_path": [
            "bot drafts follow-up",
            "owner token unlocks green approval and auto-click approval",
            "SupportRD-owned surfaces auto-publish as public SupportRD posts when posting mode is enabled",
            "connected provider lanes auto-feed the approved webhook/API bridge",
            "unconnected outside websites/social accounts remain queued until a permitted channel is connected",
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
        "safety": "The bot may draft, queue, diagram, log, publish publicly to SupportRD-owned surfaces, and feed approved connected API lanes. External websites/social accounts still require a permitted connected channel.",
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
        "seo_guideline_status": "active_google_microsoft_health_hair",
    }
    return normalized


def movement_for(item):
    cat = (item.get("category") or "opportunity").lower()
    lane = placement_lane_for(item)
    attention_routes = attention_route_details_for(item)
    attention = int(attention_routes["score"])
    website_target = website_target_for(item, lane)
    provider = connected_provider_for_target(website_target)
    connector = connector_for_provider(provider)
    swarm_worker = swarm_worker_for(item, lane)
    if provider == "owned_support_rd" and connector["configured"]:
        approval_boundary = "Auto-post lane: SupportRD-owned public surface can publish a live SupportRD post when auto-click is on."
    elif connector["configured"]:
        approval_boundary = f"Auto-feed lane: green approval can send this draft through {connector['label']}."
    else:
        approval_boundary = f"Queued lane: {connector['label']} is not connected yet, so this stays as a draft."
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
    elif any(term in cat for term in ["bulk shampoo", "salon vendor", "shampoo vendor", "santiago", "dominican", "distributor"]):
        movement = "Build bulk vendor list -> prioritize Santiago Dominican Republic and international salon suppliers -> draft restock/resale offer -> queue owner review before any email, form, or account action."
        next_action = "Create more Santiago shampoo vendor, beauty supply distributor, and international salon vendor drafts."
    elif "lasersmarket" in cat or "premium signal" in cat or "investor" in cat:
        movement = "Draft LasersMarket premium signal review call route -> target local stock/forex/crypto/options investors -> keep claims research-only -> queue owner call follow-up."
        next_action = "Create more compliant local investor call-route drafts and log every direct-call result."
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
        "swarm_worker": swarm_worker,
        "swarm_status": "public_owned_publish_ready" if provider == "owned_support_rd" else "connected_or_review_route",
        "focus_mode": FOCUS_MODE,
        "focus_rank": focus_rank(item),
        "focus_reason": focus_reason_for(item),
        "priority_lane": "comments_story_family" if FOCUS_MODE == "comments_story_family" else "general_growth",
        "movement": movement,
        "next_action": next_action,
        "draft": (item.get("copy") or {}).get("message") or item.get("hook") or "",
        "seo_guideline_status": "active_google_microsoft_health_hair",
        "seo_guideline_focus": SEO_GUIDELINE_FOCUS,
        "seo_guideline_instruction": SEO_BOT_INSTRUCTION,
        "seo_guidelines": seo_guidelines_payload(compact=True),
        "approval_boundary": approval_boundary,
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
    if SWARM_ENABLED:
        seen = set()
        seeds = []
        for source in (COMMENT_STORY_FAMILY_SEEDS, EXPANSION_SEEDS):
            for seed_item in source:
                dedupe_key = f"{seed_item.get('category')}:{seed_item.get('title')}"
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                seeds.append(seed_item)
        wave_name = "safe-growth-swarm"
    else:
        seeds = COMMENT_STORY_FAMILY_SEEDS if FOCUS_MODE == "comments_story_family" else EXPANSION_SEEDS
        wave_name = "comment-story-family-focus" if FOCUS_MODE == "comments_story_family" else "daily-growth-expansion"
    for index, item in enumerate(seeds, start=1):
        category = item.get("category") or "opportunity"
        title = item.get("title") or "SupportRD growth request"
        worker = swarm_worker_for(item, placement_lane_for(item))
        wave_item = {
            **item,
            "key": f"{prefix}:{index}:{category}:{title}".lower().replace(" ", "-")[:150],
            "cycle": cycle,
            "wave": f"manual-{wave_name}" if force_unique else wave_name,
            "swarm_worker_id": worker.get("id"),
            "swarm_worker_name": worker.get("name"),
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
        "swarm_enabled": SWARM_ENABLED,
        "swarm_workers": len(BOT_SWARM_WORKERS),
        "note": "Backend outreach swarm drafts, routes, and publishes only to public SupportRD-owned surfaces or permitted connected channels.",
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
    log_event("approved", {"id": opp_id, "note": "Approval is ready for SupportRD-owned publish or a permitted connected API lane."})
    return jsonify({"ok": True, "id": opp_id, "status": "approved", "send_status": "approved_ready_for_owned_or_connected_lane"})


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
    traffic_math = bot_traffic_math_payload()
    settings = settings_payload(traffic_math=traffic_math)
    bot_swarm = swarm_payload(movement_rows, traffic_math=traffic_math)
    settings["bot_swarm"] = bot_swarm
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
        "settings": settings,
        "botSwarm": bot_swarm,
        "trafficMath": traffic_math,
        "connectedSubmissions": submission_rows(20),
        "safety": "Auto-click path enabled. SupportRD-owned public surfaces can publish live SupportRD posts; connected provider lanes can feed the approved API bridge; unconnected outside targets stay queued.",
    })


@outreach_engine_bp.route("/api/outreach/settings")
def api_settings():
    return jsonify({"ok": True, "settings": settings_payload()})


@outreach_engine_bp.route("/api/outreach/dojj-health")
def api_dojj_health():
    traffic_math = bot_traffic_math_payload()
    return jsonify({
        "ok": True,
        "service": "supportrd-separate-bot-dojj-traffic-health",
        "bot": "separate_supportrd_outreach_bot",
        "traffic_math": traffic_math,
        "dojj_traffic_health": dojj_website_health_payload(),
        "bulk_priority": [
            "shampoo vendors",
            "hair salon vendors",
            "Santiago Dominican Republic beauty supply buyers",
            "international salon resale partners",
        ],
        "rules": [
            "Push bulk vendor traffic through owned SupportRD routes and owner-approved outreach.",
            "Watch website health for suspicious traffic, fake payment requests, strange redirects, API token gaps, and broken product media.",
            "Do not post to third-party platforms or submit outside forms unless the owner account or approved connector is present.",
            "Log source, buyer type, follow-up owner, and result back into Dojj.",
        ],
        "updated_at": utc(),
    })


@outreach_engine_bp.route("/api/outreach/connect/status")
def api_connect_status():
    return jsonify({
        "ok": True,
        "connected": connected_channel_status(),
        "recent_submissions": submission_rows(20),
    })


@outreach_engine_bp.route("/api/outreach/connect/submit", methods=["POST"])
def api_connect_submit():
    require_admin()
    payload = request.get_json(silent=True) or {}
    result = submit_through_connected_api(payload)
    http_status = 200 if result.get("ok") or result.get("status") == "ready_for_owned_publish" else 409
    return jsonify(result), http_status


@outreach_engine_bp.route("/api/outreach/report")
def report():
    require_admin()
    report_rows = rows()
    movement_rows = [movement_for(item) for item in report_rows[:80]]
    traffic_math = bot_traffic_math_payload()
    settings = settings_payload(traffic_math=traffic_math)
    bot_swarm = swarm_payload(movement_rows, traffic_math=traffic_math)
    settings["bot_swarm"] = bot_swarm
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
        "settings": settings,
        "botSwarm": bot_swarm,
        "trafficMath": traffic_math,
        "dojjTrafficHealth": dojj_website_health_payload(),
        "summary": {
            "total": len(report_rows),
            "categories": cats,
            "statuses": statuses,
            "topScore": max([item.get("score", 0) for item in report_rows] or [0]),
        },
        "movements": movement_rows,
        "focusLive": focus_live_payload(movement_rows),
        "queued": [item for item in report_rows if item.get("status") == "queued"][:50],
        "approved": [item for item in report_rows if item.get("status") == "approved"][:50],
        "safety": "Public SupportRD-owned posts and connected API feeds can run through auto-click; outside websites/social accounts still require a permitted connected channel.",
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
