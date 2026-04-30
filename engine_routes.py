from flask import Blueprint,request,jsonify
from hair_ai_engine import analyze_hair
from salon_finder import find_salons
import os
import re
import json
import time
import sqlite3
import hashlib
import threading
from datetime import datetime, timezone
import requests

engine = Blueprint("engine",__name__)

#################################################
# HAIR SCAN AI
#################################################

@engine.route("/api/hair-scan",methods=["POST"])
def hair_scan():

    result=analyze_hair()

    return jsonify(result)

#################################################
# SALON FINDER
#################################################

@engine.route("/api/salons",methods=["POST"])
def salons():

    lat=request.json.get("lat")
    lon=request.json.get("lon")

    results=find_salons(lat,lon)

    return jsonify(results)

#################################################
# GLOBAL SWEEP BACKEND TRACKER
#################################################

SWEEP_DB=os.environ.get("GLOBAL_SWEEP_DB_PATH","global_sweep.db")
SWEEP_INTERVAL_SECONDS=int(os.environ.get("GLOBAL_SWEEP_INTERVAL_SECONDS","600"))
SWEEP_ENABLED=os.environ.get("GLOBAL_SWEEP_ENABLED","true").lower()=="true"
SHOPIFY_STORE=os.environ.get("SHOPIFY_STORE","")
SHOPIFY_ADMIN_TOKEN=os.environ.get("SHOPIFY_ADMIN_TOKEN","")
_scheduler_started=False
_scheduler_lock=threading.Lock()

def _utc():
    return datetime.now(timezone.utc).isoformat()

def _db():
    conn=sqlite3.connect(SWEEP_DB,check_same_thread=False)
    conn.row_factory=sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS personal_tracker_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_json TEXT NOT NULL, created_at TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS shopify_tracker_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_json TEXT NOT NULL, created_at TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS global_sweep_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, run_json TEXT NOT NULL, created_at TEXT NOT NULL)")
    conn.commit()
    return conn

def _normalize(value):
    return re.sub(r"/$","",re.sub(r"^https?://","",str(value or "").strip().lower()))

def _safe_json(row):
    try:return json.loads(row or "{}")
    except Exception:return {}

def _flatten(payload):
    if not payload:return []
    if isinstance(payload,list):return payload
    for key in ("items","rows","events","sessions","matches","orders","customers","checkouts"):
        if isinstance(payload,dict) and isinstance(payload.get(key),list):return payload.get(key)
    return [payload] if isinstance(payload,dict) else []

def _tokens(item):
    keys=["id","event_id","eventId","session_id","sessionId","visitor_id","visitorId","customer_id","customerId","order_id","orderId","checkout_id","checkoutId","cart_token","cartToken","email","phone","product_id","productId","variant_id","variantId","sku","handle","product_handle","productHandle","url","path","landing_page","landingPage","source","campaign","utm_campaign","city","region","country","ip_hash","ipHash","account","username","tag"]
    out=set()
    if not isinstance(item,dict):return out
    for key in keys:
        val=item.get(key)
        if val not in (None,""):
            out.add(f"{key}:{_normalize(val)}")
    for parent in ("product","customer","client","account"):
        child=item.get(parent)
        if isinstance(child,dict):
            for key in ("id","email","phone","handle","sku","title","tag"):
                val=child.get(key)
                if val not in (None,""):
                    out.add(f"{parent}.{key}:{_normalize(val)}")
    return out

def _store_domain():
    raw=(SHOPIFY_STORE or "").strip()
    raw=re.sub(r"^https?://","",raw).strip("/")
    if raw=="shop.supportrd.com" or raw.endswith("supportrd.com"):
        return "supportdr-com.myshopify.com"
    if raw and "." not in raw:
        return raw+".myshopify.com"
    return raw

def _fetch_shopify_orders():
    domain=_store_domain()
    if not domain or not SHOPIFY_ADMIN_TOKEN:
        return []
    url=f"https://{domain}/admin/api/2025-10/graphql.json"
    query='''query { orders(first: 25, sortKey: CREATED_AT, reverse: true) { edges { node { id name createdAt email phone totalPriceSet { shopMoney { amount currencyCode } } customer { id email phone } lineItems(first: 20) { edges { node { title sku variant { id sku product { id handle title } } } } } } } } }'''
    try:
        res=requests.post(url,json={"query":query},headers={"X-Shopify-Access-Token":SHOPIFY_ADMIN_TOKEN,"Content-Type":"application/json"},timeout=12)
        res.raise_for_status()
        data=res.json().get("data",{}).get("orders",{}).get("edges",[])
    except Exception:
        return []
    rows=[]
    for edge in data:
        node=edge.get("node",{})
        base={"order_id":node.get("id"),"order_name":node.get("name"),"created_at":node.get("createdAt"),"email":node.get("email"),"phone":node.get("phone"),"customer":node.get("customer") or {},"total":(((node.get("totalPriceSet") or {}).get("shopMoney") or {}).get("amount"))}
        for li in (((node.get("lineItems") or {}).get("edges")) or []):
            item=li.get("node",{})
            variant=item.get("variant") or {}
            product=variant.get("product") or {}
            rows.append({**base,"title":item.get("title"),"sku":item.get("sku") or variant.get("sku"),"variant_id":variant.get("id"),"product_id":product.get("id"),"product":{"id":product.get("id"),"handle":product.get("handle"),"title":product.get("title"),"sku":variant.get("sku")}})
        if not (((node.get("lineItems") or {}).get("edges")) or []):
            rows.append(base)
    return rows

def _read_table(table):
    conn=_db()
    rows=[_safe_json(r["event_json"]) for r in conn.execute(f"SELECT event_json FROM {table} ORDER BY id DESC LIMIT 500").fetchall()]
    conn.close()
    return rows

def _insert(table,payload):
    rows=_flatten(payload)
    conn=_db()
    for row in rows:
        conn.execute(f"INSERT INTO {table} (event_json,created_at) VALUES (?,?)",(json.dumps(row,sort_keys=True),_utc()))
    conn.commit();conn.close()
    return len(rows)

def _score(personal,shopify):
    matches=[]
    for pi,p in enumerate(personal):
        pt=_tokens(p)
        if not pt:continue
        for si,s in enumerate(shopify):
            st=_tokens(s)
            exact=sorted(list(pt.intersection(st)))
            if exact:
                matches.append({"personalIndex":pi,"shopifyIndex":si,"exact":exact,"score":len(exact),"personal":p,"shopify":s,"at":_utc()})
    return sorted(matches,key=lambda x:x["score"],reverse=True)[:100]

def _mask_token(token):
    raw=str(token or "")
    if ":" not in raw:return raw[:48]+("..." if len(raw)>48 else "")
    key,value=raw.split(":",1)
    low=key.lower()
    if "email" in low:
        domain=value.split("@")[-1] if "@" in value else "email"
        return f"{key}:***@{domain}"
    if "phone" in low:
        return f"{key}:***{value[-4:]}"
    if "ip" in low:
        return f"{key}:masked"
    if any(part in low for part in ("customer","visitor","session","checkout","cart")) or low=="id":
        return f"{key}:...{value[-6:]}"
    return raw[:52]+("..." if len(raw)>52 else "")

def _public_sweep(result):
    public=dict(result or {})
    public["matches"]=[
        {
            "personalIndex":match.get("personalIndex",0),
            "shopifyIndex":match.get("shopifyIndex",0),
            "score":match.get("score",0),
            "exact":[_mask_token(token) for token in (match.get("exact") or [])],
            "at":match.get("at") or _utc()
        }
        for match in (public.get("matches") or [])
    ]
    public["privacy"]="Public tracker response masks identity tokens and omits raw personal/shopify rows."
    return public

def run_sweep():
    personal=_read_table("personal_tracker_events")
    shopify_live=_fetch_shopify_orders()
    if shopify_live:
        _insert("shopify_tracker_events",shopify_live)
    shopify=_read_table("shopify_tracker_events")
    matches=_score(personal,shopify)
    result={"ok":True,"lastRun":_utc(),"nextRun":datetime.fromtimestamp(time.time()+SWEEP_INTERVAL_SECONDS,timezone.utc).isoformat(),"intervalSeconds":SWEEP_INTERVAL_SECONDS,"personalCount":len(personal),"shopifyCount":len(shopify),"matchCount":len(matches),"matches":matches[:100],"shopifyAdminConnected":bool(SHOPIFY_ADMIN_TOKEN and _store_domain())}
    conn=_db();conn.execute("INSERT INTO global_sweep_runs (run_json,created_at) VALUES (?,?)",(json.dumps(result,sort_keys=True),_utc()));conn.commit();conn.close()
    return result

def _latest_sweep():
    conn=_db();row=conn.execute("SELECT run_json FROM global_sweep_runs ORDER BY id DESC LIMIT 1").fetchone();conn.close()
    return _safe_json(row["run_json"]) if row else {"ok":True,"lastRun":"","nextRun":"","intervalSeconds":SWEEP_INTERVAL_SECONDS,"personalCount":0,"shopifyCount":0,"matchCount":0,"matches":[],"shopifyAdminConnected":bool(SHOPIFY_ADMIN_TOKEN and _store_domain())}

def _loop():
    while True:
        try:run_sweep()
        except Exception:pass
        time.sleep(SWEEP_INTERVAL_SECONDS)

def start_global_sweep_scheduler():
    global _scheduler_started
    if not SWEEP_ENABLED:return False
    with _scheduler_lock:
        if _scheduler_started:return True
        thread=threading.Thread(target=_loop,daemon=True,name="support-rd-global-sweep")
        thread.start();_scheduler_started=True
        return True

@engine.route("/api/tracker/personal",methods=["GET","POST"])
def api_personal_tracker():
    if request.method=="POST":
        payload=request.get_json(silent=True) or {}
        return jsonify({"ok":True,"stored":_insert("personal_tracker_events",payload)})
    return jsonify({"ok":True,"items":_read_table("personal_tracker_events")})

@engine.route("/api/shopify/tracker",methods=["GET","POST"])
def api_shopify_tracker():
    if request.method=="POST":
        payload=request.get_json(silent=True) or {}
        return jsonify({"ok":True,"stored":_insert("shopify_tracker_events",payload)})
    rows=_fetch_shopify_orders()
    if rows:_insert("shopify_tracker_events",rows)
    return jsonify({"ok":True,"items":_read_table("shopify_tracker_events"),"admin_connected":bool(SHOPIFY_ADMIN_TOKEN and _store_domain())})

@engine.route("/api/global-sweep/run",methods=["GET","POST"])
def api_global_sweep_run():
    return jsonify(_public_sweep(run_sweep()))

@engine.route("/api/global-sweep/status",methods=["GET"])
def api_global_sweep_status():
    latest=_latest_sweep()
    if not latest.get("lastRun"):
        latest=run_sweep()
    return jsonify(_public_sweep(latest))

start_global_sweep_scheduler()
