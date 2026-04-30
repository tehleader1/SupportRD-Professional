# Codex Handoff For SupportRD Growth Assistant

This file is the missing handoff for Codex so the project picks up the SupportRD Growth Assistant role and the latest growth-related site work.

## What Codex Should Know

SupportRD is not just a general app shell.

The main business goal is to grow `supportrd.com` as a natural-hair solutions website with:
- stronger homepage structure
- better search visibility
- clearer product paths
- ethical outreach systems
- reusable campaign/story planning

The assistant should work across:
- homepage and information architecture
- SEO landing pages
- internal links
- trust and conversion clarity
- guest-post and directory prep
- salon, creator, and student/community outreach planning
- story and caption creation

## What Was Added In This Pass

### Backend-only outreach engine
- `backend/outreach_engine.py`
- `/api/outreach/report`
- `/api/outreach/opportunities`
- `/api/outreach/approve/<id>`
- `/api/outreach/reject/<id>`
- `/api/outreach/tick`
- `/admin/outreach-control` protected by `OUTREACH_ADMIN_TOKEN` or local-only access

### Homepage changes
- added homepage metadata and basic structured data
- added a search-focused structure section
- removed public Growth Assistant links so the bot stays off the visible website

### Backend changes
- added `/api/growth-assistant`
- added backend-only outreach opportunity generation, queueing, approval, rejection, and logging
- removed growth pages from public sitemap

## Current Behavior Of The Growth Assistant Page

The backend engine:
- runs in backend mode
- seeds and refreshes outreach opportunities
- logs heartbeat/status events
- supports draft categories for blogs, guest posts, videos, stories, social comment drafts, salon/hair-store outreach, radio, college/career placements, keyword clusters, and review pitches
- exposes a hidden protected admin control panel for review

Important:
- it is not visible on the public website UI
- it is not an autonomous internet bot
- sending, posting, publishing, commenting, or emailing still requires explicit approval and proper account connections

## What Codex Should Do Next

Recommended next implementation order:
1. tighten homepage copy so hair solutions clearly lead the page
2. add more focused search-entry pages tied to real hair concerns and buying intent
3. add a lightweight lead-tracking or outreach queue surface
4. add story-builder inputs for SupportRD images and personal photos
5. connect approved outreach actions only after the user supplies credentials and consent

## What Codex Should Not Assume

Do not assume:
- Google can be told to rank the site directly
- growth should use spam or mass social posting
- public contacts can be emailed automatically without review
- posting to personal or friends' feeds is acceptable without consent

## Quick Start Prompt For Codex

Use this project as the SupportRD Growth Assistant. Inspect the homepage, backend-only outreach engine, `/api/outreach/report`, and `/api/growth-assistant` endpoint first. Keep SupportRD centered on natural-hair solutions, improve structure and search clarity, and suggest the highest-leverage next implementation step before making broad changes.
