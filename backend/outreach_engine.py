from flask import Blueprint, jsonify, request
import os, json, sqlite3
from datetime import datetime, timezone

outreach_engine_bp = Blueprint('outreach_engine', __name__)
DB_PATH = os.environ.get('OUTREACH_DB_PATH', os.environ.get('GLOBAL_SWEEP_DB_PATH', 'global_sweep.db'))
SUPPORT_URL = os.environ.get('SUPPORT_RD_PUBLIC_URL', 'https://supportrd.com')
BOT_AGENT_REF = os.environ.get('SUPPORT_RD_BOT_AGENT_REF', 'agt_69f2460cc584819192e4a3a276e8b004')

SEEDS = [
  {'category':'free blog post','title':'Natural hair repair guest article','target':'beauty blogs','hook':'SupportRD Caribbean Hair Solutions hair repair routine'},
  {'category':'salon outreach','title':'Salon partnership email','target':'salons and stylists','hook':'ARIA hair prep plus Shopify catalog for clients'},
  {'category':'hair store outreach','title':'Beauty supply partnership','target':'hair stores','hook':'SupportRD product line and AI hair guidance'},
  {'category':'video post idea','title':'10-second hair damage short','target':'TikTok/YouTube/Instagram style content','hook':'How to fix dry damaged hair before it gets worse'},
  {'category':'family story post','title':'Personal SupportRD family story','target':'Facebook-style personal feed','hook':'Why SupportRD was built for real hair problems'},
  {'category':'radio shoutout','title':'SupportRD radio shoutout','target':'community radio','hook':'SupportRD.com Suave Natural Hair Solution Join Us'},
  {'category':'ranked keyword','title':'Best tech hair website 2026','target':'Google/Bing keyword cluster','hook':'AI hair analysis, voice assistant, Shopify catalog, live Diary and Studio'},
  {'category':'career website','title':'Workplace ready hair ad','target':'career centers','hook':'Get your hair right before interviews and work'},
  {'category':'community college placement','title':'Community college hair confidence ad','target':'student bulletin boards','hook':'SupportRD Caribbean Get Away - get your hair right'},
  {'category':'newspaper/rating channel','title':'Best tech hair website review pitch','target':'newspapers and review/rating sites','hook':'Review SupportRD as a tech hair website'}
]

def utc(): return datetime.now(timezone.utc).isoformat()
def db():
    conn=sqlite3.connect(DB_PATH); conn.row_factory=sqlite3.Row
    conn.execute('CREATE TABLE IF NOT EXISTS outreach_opportunities (id INTEGER PRIMARY KEY AUTOINCREMENT, opportunity_json TEXT NOT NULL, status TEXT DEFAULT "queued", score INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)')
    conn.commit(); return conn

def copy_for(item):
    cat=item.get('category','opportunity'); hook=item.get('hook','SupportRD Caribbean Hair Solutions')
    if 'salon' in cat or 'hair store' in cat:
        msg=f"Hello, I am reaching out from SupportRD Caribbean Hair Solutions. We help people prepare and improve their hair routine using ARIA voice guidance, Profile Hair Prep, and a Shopify hair product catalog. Would you be open to a collaboration or listing? {SUPPORT_URL}"
    elif 'college' in cat or 'career' in cat:
        msg=f"SupportRD Caribbean Get Away: get your hair right before interviews, school, work, or your next opportunity. Try Profile Hair Prep and ARIA hair guidance at {SUPPORT_URL}."
    elif 'radio' in cat:
        msg=f"SupportRD.com — Suave Natural Hair Solution. Caribbean Hair Solutions from Dominican Republic, STI. Join us at {SUPPORT_URL}."
    elif 'keyword' in cat:
        msg=f"Best Tech Hair Website 2026: SupportRD combines AI hair analysis, voice assistants, Shopify catalog, live Diary, FAQ Lounge, and Studio tools. Visit {SUPPORT_URL}."
    else:
        msg=f"{hook}. SupportRD brings AI hair guidance, Caribbean hair solutions, live Diary, Profile prep, FAQ Lounge, and product links together. Learn more at {SUPPORT_URL}."
    return {'headline':item.get('title','SupportRD outreach'), 'target':item.get('target','public audience'), 'message':msg, 'cta':SUPPORT_URL}

def score(item):
    text=json.dumps(item).lower(); s=40
    for term,pts in [('salon',18),('hair store',18),('college',14),('career',14),('radio',12),('newspaper',12),('keyword',16),('google',16),('bing',16),('microsoft',16),('video',10)]:
        if term in text: s+=pts
    return min(100,s)

def seed():
    conn=db(); n=conn.execute('SELECT COUNT(*) n FROM outreach_opportunities').fetchone()['n']
    if not n:
        now=utc()
        for item in SEEDS:
            item={**item,'copy':copy_for(item),'permission':'manual approval required','agent_ref':BOT_AGENT_REF}
            conn.execute('INSERT INTO outreach_opportunities (opportunity_json,status,score,created_at,updated_at) VALUES (?,?,?,?,?)',(json.dumps(item,sort_keys=True),'queued',score(item),now,now))
        conn.commit()
    conn.close()

def rows(status=None):
    seed(); conn=db()
    if status: rs=conn.execute('SELECT * FROM outreach_opportunities WHERE status=? ORDER BY score DESC,id DESC LIMIT 100',(status,)).fetchall()
    else: rs=conn.execute('SELECT * FROM outreach_opportunities ORDER BY score DESC,id DESC LIMIT 100').fetchall()
    conn.close(); out=[]
    for r in rs:
        obj=json.loads(r['opportunity_json']); obj.update({'id':r['id'],'status':r['status'],'score':r['score'],'created_at':r['created_at'],'updated_at':r['updated_at']}); out.append(obj)
    return out

@outreach_engine_bp.route('/api/outreach/opportunities', methods=['GET','POST'])
def opportunities():
    if request.method=='POST':
        item=request.get_json(silent=True) or {}; item['copy']=item.get('copy') or copy_for(item); item['permission']='manual approval required'; item['agent_ref']=BOT_AGENT_REF
        conn=db(); now=utc(); cur=conn.execute('INSERT INTO outreach_opportunities (opportunity_json,status,score,created_at,updated_at) VALUES (?,?,?,?,?)',(json.dumps(item,sort_keys=True),'queued',score(item),now,now)); conn.commit(); conn.close()
        return jsonify({'ok':True,'id':cur.lastrowid,'score':score(item)})
    r=rows(request.args.get('status'))
    return jsonify({'ok':True,'botVisible':False,'agent_ref':BOT_AGENT_REF,'count':len(r),'opportunities':r})

@outreach_engine_bp.route('/api/outreach/approve/<int:opp_id>', methods=['POST'])
def approve(opp_id):
    conn=db(); conn.execute('UPDATE outreach_opportunities SET status="approved", updated_at=? WHERE id=?',(utc(),opp_id)); conn.commit(); conn.close()
    return jsonify({'ok':True,'id':opp_id,'status':'approved'})

@outreach_engine_bp.route('/api/outreach/report')
def report():
    r=rows(); cats={}
    for x in r: cats[x.get('category','other')]=cats.get(x.get('category','other'),0)+1
    return jsonify({'ok':True,'botVisible':False,'backendMode':True,'agent_ref':BOT_AGENT_REF,'summary':{'total':len(r),'categories':cats,'topScore':max([x.get('score',0) for x in r] or [0])},'queued':[x for x in r if x.get('status')=='queued'][:50],'approved':[x for x in r if x.get('status')=='approved'][:50]})
