# SupportRD Clean Production Repo

This is the blank-slate production package for the rebuilt SupportRD system.

What is included:
- one Flask entrypoint: `app.py`
- the live rebuilt shell in `static/index.html`
- the live rebuilt runtime in `static/app.v20260320h.js`
- the rebuild modules in `static/rebuild`
- the Studio subsystem in `static/studio`
- the minimum Python support modules used by `app.py`

What is intentionally not included:
- backup Flask entry files
- incoming handoff bundles
- Shopify extension workspace
- old repo notes/spec drafts
- alternate deployment guesses

Render settings:
- build command: `pip install -r requirements.txt`
- start command: `gunicorn app:app`

Recommended deploy flow:
1. Deploy this repo by itself.
2. Confirm `https://supportrd.com/` serves the rebuilt shell.
3. Verify Studio, Diary, FAQ Lounge, Profile, Payments, Map Change, and Market Reader.
4. Add optimized map assets only after the clean deployment is stable.
