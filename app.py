import os
import re
import json
import uuid
import time
import socket
import subprocess
import threading
import urllib.request
from functools import wraps
from flask import Flask, render_template, request, jsonify, send_from_directory, Response, session
from werkzeug.utils import secure_filename
import qrcode
import qrcode.image.svg
from pdf_parser import parse_syllabus_pdf

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "bme_welfare_portal_secret_key_202310505_v1")
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

ADMIN_USERNAME = "202310505"
ADMIN_PASSWORD = "qnrudeo^^A"

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({
                "success": False,
                "error": "수정 또는 추가 작업을 수행하려면 로그인이 필요합니다.",
                "require_login": True
            }), 401
        return f(*args, **kwargs)
    return decorated_function

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

COURSES_FILE = os.path.join(DATA_DIR, "courses.json")
SCHEDULES_FILE = os.path.join(DATA_DIR, "schedules.json")
CATEGORIES_FILE = os.path.join(DATA_DIR, "categories.json")
SITES_FILE = os.path.join(DATA_DIR, "sites.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'pdf'}

DEFAULT_CATEGORIES = [
    {"id": "cat-course", "name": "수강 과목", "color": "blue", "is_system": True},
    {"id": "cat-academic", "name": "학사일정", "color": "orange", "is_system": True},
    {"id": "cat-task", "name": "과제 / 시험", "color": "rose", "is_system": False},
    {"id": "cat-research", "name": "연구 / 세미나", "color": "emerald", "is_system": False},
    {"id": "cat-club", "name": "동아리", "color": "purple", "is_system": False},
    {"id": "cat-personal", "name": "개인 일정", "color": "amber", "is_system": False},
    {"id": "cat-etc", "name": "기타", "color": "cyan", "is_system": False}
]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------------------------------------------------------------
# Data Load / Save Helpers
# -----------------------------------------------------------------------------
def load_courses():
    if not os.path.exists(COURSES_FILE):
        return []
    try:
        with open(COURSES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading courses: {e}")
        return []

def save_courses(courses):
    try:
        with open(COURSES_FILE, 'w', encoding='utf-8') as f:
            json.dump(courses, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving courses: {e}")
        return False

def load_schedules():
    if not os.path.exists(SCHEDULES_FILE):
        return []
    try:
        with open(SCHEDULES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading schedules: {e}")
        return []

def save_schedules(schedules):
    try:
        with open(SCHEDULES_FILE, 'w', encoding='utf-8') as f:
            json.dump(schedules, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving schedules: {e}")
        return False

def load_categories():
    if not os.path.exists(CATEGORIES_FILE) or os.path.getsize(CATEGORIES_FILE) == 0:
        save_categories(DEFAULT_CATEGORIES)
        return DEFAULT_CATEGORIES
    try:
        with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading categories: {e}")
        return DEFAULT_CATEGORIES

def save_categories(categories):
    try:
        with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(categories, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving categories: {e}")
        return False

# Initialize categories if missing
if not os.path.exists(CATEGORIES_FILE):
    save_categories(DEFAULT_CATEGORIES)

DEFAULT_SITE_CATEGORIES = [
    {"id": "lms", "title": "LMS (온라인 강의실)", "color": "text-blue-400"},
    {"id": "pknu", "title": "부경대 포털 및 홈페이지", "color": "text-cyan-400"},
    {"id": "dept", "title": "학과별 홈페이지", "color": "text-rose-400"},
    {"id": "research", "title": "연구 관련", "color": "text-emerald-400"}
]

DEFAULT_SITES = [
    {"id": "pknu-lms", "title": "부경대 LMS", "url": "https://lms.pknu.ac.kr/ilos/main/main_form.acl", "category": "lms"},
    {"id": "inu-huss", "title": "인천대 HUSS", "url": "https://lms.hussis.ac.kr/login/index.php", "category": "lms"},
    {"id": "hansapyung", "title": "한국사이버평생교육원", "url": "https://www.hakjum.com/index.asp", "category": "lms"},
    {"id": "pknu-main", "title": "부경대 대표홈페이지", "url": "https://www.pknu.ac.kr/main", "category": "pknu"},
    {"id": "pknu-portal", "title": "부경대 종합포털", "url": "https://portal.pknu.ac.kr/", "category": "pknu"},
    {"id": "pknu-library", "title": "부경대 도서관", "url": "https://libweb.pknu.ac.kr/", "category": "pknu"},
    {"id": "pknu-welfare", "title": "사회복지학전공", "url": "https://icms.pknu.ac.kr/ps1/1", "category": "dept"},
    {"id": "pknu-bme", "title": "의공학전공", "url": "https://bme.pknu.ac.kr/bme/1", "category": "dept"},
    {"id": "pknu-huss-dept", "title": "HUSS 사업단", "url": "https://icms.pknu.ac.kr/huss/1", "category": "dept"},
    {"id": "google-scholar", "title": "Google Scholar", "url": "https://scholar.google.com/?hl=ko", "category": "research"},
    {"id": "dbpia", "title": "DBpia", "url": "https://www.dbpia.co.kr/", "category": "research"},
    {"id": "pknu-biophysics", "title": "계산생물물리학 연구실", "url": "https://icms.pknu.ac.kr/biophysics/1", "category": "research"}
]

def load_sites_data():
    if not os.path.exists(SITES_FILE) or os.path.getsize(SITES_FILE) == 0:
        initial = {"categories": DEFAULT_SITE_CATEGORIES, "sites": DEFAULT_SITES}
        save_sites_data(initial)
        return initial
    try:
        with open(SITES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, dict):
                data = {"categories": DEFAULT_SITE_CATEGORIES, "sites": DEFAULT_SITES}
            if "categories" not in data:
                data["categories"] = DEFAULT_SITE_CATEGORIES
            if "sites" not in data:
                data["sites"] = DEFAULT_SITES
            return data
    except Exception as e:
        print(f"Error loading sites data: {e}")
        return {"categories": DEFAULT_SITE_CATEGORIES, "sites": DEFAULT_SITES}

def save_sites_data(data):
    try:
        with open(SITES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving sites data: {e}")
        return False

# Initialize sites.json if missing
if not os.path.exists(SITES_FILE):
    save_sites_data({"categories": DEFAULT_SITE_CATEGORIES, "sites": DEFAULT_SITES})


# -----------------------------------------------------------------------------
# Web Page & Static Routes
# -----------------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)

# -----------------------------------------------------------------------------
# Monitorix Proxy & Image Caching
# -----------------------------------------------------------------------------
_last_cgi_trigger_time = {}

def trigger_monitorix_cgi(range_val='1day'):
    now = time.time()
    last_time = _last_cgi_trigger_time.get(range_val, 0)
    # Trigger at most once every 15 seconds per range
    if now - last_time > 15:
        _last_cgi_trigger_time[range_val] = now
        cgi_url = f"http://210.125.111.159:9090/monitorix-cgi/monitorix.cgi?mode=localhost&graph=all&when={range_val}&color=black"
        try:
            req = urllib.request.Request(cgi_url, headers={'User-Agent': 'Mozilla/5.0'})
            urllib.request.urlopen(req, timeout=4)
        except Exception as e:
            print(f"CGI trigger notice ({range_val}): {e}")

@app.route('/api/monitorix/graph')
def proxy_monitorix_graph():
    """
    Proxies Monitorix graph images through Flask backend.
    Parameters:
      - type: lmsens, nvidia, disk
      - sub: 1, 2, 01, etc.
      - range: 1day, 1week, 1month, 1year
      - z: 0 (normal) or 1 (high-res z)
    """
    gtype = request.args.get('type', 'lmsens')
    sub = request.args.get('sub', '1')
    range_val = request.args.get('range', '1day')
    is_z = request.args.get('z', '0') in ['1', 'true', 'z']
    z_str = 'z' if is_z else ''

    # Build canonical filename e.g. lmsens1.1day.png or nvidia1z.1day.png or disk01.1day.png
    # Ensure correct sub number formatting for disk (01, 02, 03) vs others (1, 2, 3)
    if gtype == 'disk' and not sub.startswith('0') and len(sub) == 1:
        sub = f"0{sub}"

    filename = f"{gtype}{sub}{z_str}.{range_val}.png"
    target_url = f"http://210.125.111.159:9090/monitorix/imgs/{filename}"
    cache_path = os.path.join(CACHE_DIR, filename)

    # 1. Trigger Monitorix RRDtool generation if needed
    trigger_monitorix_cgi(range_val)

    # 2. Try fetching fresh image from Monitorix
    img_data = None
    try:
        req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                img_data = resp.read()
                # Save to disk cache
                with open(cache_path, 'wb') as f:
                    f.write(img_data)
    except Exception as e:
        print(f"Monitorix image fetch warning for {filename}: {e}")

    # 3. If remote fetch failed, use cached image if available
    if not img_data and os.path.exists(cache_path):
        try:
            with open(cache_path, 'rb') as f:
                img_data = f.read()
        except Exception:
            pass

    if img_data:
        return Response(img_data, mimetype='image/png', headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        })

    # Return empty 1x1 transparent PNG if completely unavailable
    empty_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    return Response(empty_png, status=503, mimetype='image/png')

@app.route('/api/monitorix/check')
def check_monitorix():
    target = "http://210.125.111.159:9090/monitorix/imgs/lmsens1.1day.png"
    try:
        req = urllib.request.Request(target, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            return jsonify({"online": resp.status == 200})
    except Exception as e:
        return jsonify({"online": False, "error": str(e)})

# -----------------------------------------------------------------------------
# Authentication APIs
# -----------------------------------------------------------------------------
@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['logged_in'] = True
        session['username'] = username
        return jsonify({
            "success": True,
            "message": "로그인에 성공하였습니다.",
            "username": username
        })
    else:
        return jsonify({
            "success": False,
            "error": "아이디 또는 비밀번호가 일치하지 않습니다."
        }), 401

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    return jsonify({"success": True, "message": "로그아웃되었습니다."})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    is_logged = bool(session.get('logged_in', False))
    return jsonify({
        "success": True,
        "logged_in": is_logged,
        "username": session.get('username') if is_logged else None
    })

# -----------------------------------------------------------------------------
# System Network & Device Connection APIs (Local IP & Cloudflare Public Tunnel)
# -----------------------------------------------------------------------------
PUBLIC_TUNNEL_URL = None
TUNNEL_PROCESS = None

def get_host_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "210.125.111.157"

def start_cloudflare_tunnel():
    global PUBLIC_TUNNEL_URL, TUNNEL_PROCESS
    cloudflared_bin = os.path.join(BASE_DIR, 'cloudflared.exe')
    if not os.path.exists(cloudflared_bin):
        print("[Tunnel] cloudflared.exe not found. Running in local-only mode.", flush=True)
        return

    try:
        print("[Tunnel] Starting Cloudflare Tunnel for public external access...", flush=True)
        TUNNEL_PROCESS = subprocess.Popen(
            [cloudflared_bin, 'tunnel', '--protocol', 'http2', '--url', 'http://127.0.0.1:5000'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        for line in TUNNEL_PROCESS.stdout:
            if not PUBLIC_TUNNEL_URL:
                match = re.search(r'(https://[a-zA-Z0-9-]+\.trycloudflare\.com)', line)
                if match:
                    PUBLIC_TUNNEL_URL = match.group(1)
                    print(f"\n========================================================", flush=True)
                    print(f" [PUBLIC ACCESS URL] Anyone can access with this link:", flush=True)
                    print(f" {PUBLIC_TUNNEL_URL}", flush=True)
                    print(f"========================================================\n", flush=True)
                    public_file = os.path.join(BASE_DIR, 'PUBLIC_URL.txt')
                    with open(public_file, 'w', encoding='utf-8') as f:
                        f.write(PUBLIC_TUNNEL_URL)
    except Exception as e:
        print(f"[Tunnel] Error starting Cloudflare Tunnel: {e}", flush=True)

def init_tunnel_daemon():
    # Only start tunnel in the main worker process when Flask reloader is active
    if app.debug and os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        return

    # Terminate any stale cloudflared processes
    try:
        subprocess.run(['taskkill', '/F', '/IM', 'cloudflared.exe'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    threading.Thread(target=start_cloudflare_tunnel, daemon=True).start()

try:
    init_tunnel_daemon()
except Exception as e:
    print(f"[Tunnel] Thread launch warning: {e}", flush=True)

@app.route('/api/system/network', methods=['GET'])
def get_system_network():
    ip = get_host_ip()
    port = 5000
    local_url = f"http://{ip}:{port}"
    target_url = PUBLIC_TUNNEL_URL or local_url
    return jsonify({
        "success": True,
        "local_ip": ip,
        "port": port,
        "local_url": local_url,
        "public_url": PUBLIC_TUNNEL_URL,
        "url": target_url
    })

@app.route('/api/system/qrcode', methods=['GET'])
def get_system_qrcode():
    ip = get_host_ip()
    port = 5000
    local_url = f"http://{ip}:{port}"
    type_param = request.args.get('type')
    url_param = request.args.get('url')
    
    if url_param:
        target_url = url_param
    elif type_param == 'local':
        target_url = local_url
    else:
        target_url = PUBLIC_TUNNEL_URL or local_url
        
    try:
        factory = qrcode.image.svg.SvgPathImage
        img = qrcode.make(target_url, image_factory=factory, box_size=10, border=2)
        svg_xml = img.to_string()
        return Response(svg_xml, mimetype='image/svg+xml')
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# -----------------------------------------------------------------------------
# Course APIs
# -----------------------------------------------------------------------------
@app.route('/api/courses', methods=['GET'])
def get_courses():
    courses = load_courses()
    return jsonify({"success": True, "courses": courses})

@app.route('/api/courses', methods=['POST'])
@login_required
def add_course():
    data = request.json or {}
    courses = load_courses()
    
    course_id = data.get("id") or str(uuid.uuid4())
    new_course = {
        "id": course_id,
        "title": data.get("title", "신규 강의"),
        "professor": data.get("professor", "미지정"),
        "classroom": data.get("classroom", "미지정"),
        "class_time": data.get("class_time", "미지정"),
        "color": data.get("color", "blue"),
        "icon": data.get("icon", "📚"),
        "grading": data.get("grading", {"summary": "미지정"}),
        "weekly": data.get("weekly", []),
        "pdf_filename": data.get("pdf_filename", "")
    }
    
    exists = False
    for idx, c in enumerate(courses):
        if c["id"] == course_id:
            courses[idx] = new_course
            exists = True
            break
            
    if not exists:
        courses.append(new_course)
        
    save_courses(courses)
    return jsonify({"success": True, "course": new_course})

@app.route('/api/courses/<course_id>', methods=['PUT'])
@login_required
def update_course(course_id):
    data = request.json or {}
    courses = load_courses()
    for idx, c in enumerate(courses):
        if c["id"] == course_id:
            c["title"] = data.get("title", c["title"])
            c["professor"] = data.get("professor", c["professor"])
            c["classroom"] = data.get("classroom", c["classroom"])
            c["class_time"] = data.get("class_time", c["class_time"])
            if "color" in data:
                c["color"] = data["color"]
            if "icon" in data:
                c["icon"] = data["icon"]
            if "grading" in data:
                c["grading"] = data["grading"]
            if "weekly" in data:
                c["weekly"] = data["weekly"]
            save_courses(courses)
            return jsonify({"success": True, "course": c})
    return jsonify({"success": False, "error": "강의를 찾을 수 없습니다."}), 404

@app.route('/api/courses/<course_id>', methods=['DELETE'])
@login_required
def delete_course(course_id):
    courses = load_courses()
    new_courses = [c for c in courses if c["id"] != course_id]
    save_courses(new_courses)
    return jsonify({"success": True})

@app.route('/api/courses/<course_id>/grading-memo', methods=['POST'])
@login_required
def save_grading_memo(course_id):
    data = request.json or {}
    category = data.get("category", "").strip()
    memo = data.get("memo", "").strip()
    if not category:
        return jsonify({"success": False, "error": "평가 항목 이름이 필요합니다."}), 400

    courses = load_courses()
    target_course = None
    for c in courses:
        if c["id"] == course_id:
            target_course = c
            break

    if not target_course:
        return jsonify({"success": False, "error": "해당 강의를 찾을 수 없습니다."}), 404

    if "grading" not in target_course or not isinstance(target_course["grading"], dict):
        target_course["grading"] = {}
    if "notes" not in target_course["grading"] or not isinstance(target_course["grading"]["notes"], dict):
        target_course["grading"]["notes"] = {}

    target_course["grading"]["notes"][category] = memo
    save_courses(courses)
    return jsonify({"success": True, "notes": target_course["grading"]["notes"]})

def safe_filename(filename):
    clean = re.sub(r'[\\/:\*\?"<>\|\x00]', '_', filename).strip()
    return clean if clean else "syllabus.pdf"

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_syllabus():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "업로드된 파일이 없습니다."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "선택된 파일이 없습니다."}), 400
        
    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "PDF 파일만 업로드 가능합니다."}), 400
        
    raw_name = file.filename
    clean_name = safe_filename(raw_name)
    saved_filename = f"{uuid.uuid4().hex[:8]}_{clean_name}"
        
    save_path = os.path.join(UPLOADS_DIR, saved_filename)
    file.save(save_path)
    
    try:
        parsed_data = parse_syllabus_pdf(save_path, original_filename=raw_name)
        parsed_data["id"] = str(uuid.uuid4())
        parsed_data["pdf_filename"] = saved_filename
        parsed_data["color"] = "blue"
        return jsonify({
            "success": True,
            "data": parsed_data,
            "pdf_url": f"/uploads/{saved_filename}"
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"PDF 분석 오류: {str(e)}"}), 500

# -----------------------------------------------------------------------------
# Schedule & Event APIs
# -----------------------------------------------------------------------------
@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    schedules = load_schedules()
    return jsonify({"success": True, "schedules": schedules})

@app.route('/api/schedules', methods=['POST'])
@login_required
def add_schedule():
    data = request.json or {}
    schedules = load_schedules()
    
    event_id = data.get("id") or str(uuid.uuid4())
    new_event = {
        "id": event_id,
        "title": data.get("title", "새 일정"),
        "category_id": data.get("category_id", "cat-personal"),
        "date": data.get("date", ""),
        "end_date": data.get("end_date", ""),
        "start_time": data.get("start_time", ""),
        "end_time": data.get("end_time", ""),
        "is_all_day": data.get("is_all_day", False),
        "memo": data.get("memo", ""),
        "color": data.get("color", "blue"),
        "created_at": time.time()
    }
    
    # Check if exists
    exists = False
    for idx, ev in enumerate(schedules):
        if ev["id"] == event_id:
            schedules[idx] = new_event
            exists = True
            break
            
    if not exists:
        schedules.append(new_event)
        
    save_schedules(schedules)
    return jsonify({"success": True, "schedule": new_event})

@app.route('/api/schedules/<event_id>', methods=['PUT'])
@login_required
def update_schedule(event_id):
    data = request.json or {}
    schedules = load_schedules()
    for idx, ev in enumerate(schedules):
        if ev["id"] == event_id:
            ev["title"] = data.get("title", ev["title"])
            ev["category_id"] = data.get("category_id", ev.get("category_id", "cat-personal"))
            ev["date"] = data.get("date", ev.get("date", ""))
            ev["end_date"] = data.get("end_date", ev.get("end_date", ""))
            ev["start_time"] = data.get("start_time", ev.get("start_time", ""))
            ev["end_time"] = data.get("end_time", ev.get("end_time", ""))
            ev["is_all_day"] = data.get("is_all_day", ev.get("is_all_day", False))
            ev["memo"] = data.get("memo", ev.get("memo", ""))
            ev["color"] = data.get("color", ev.get("color", "blue"))
            save_schedules(schedules)
            return jsonify({"success": True, "schedule": ev})
    return jsonify({"success": False, "error": "일정을 찾을 수 없습니다."}), 404

@app.route('/api/schedules/<event_id>', methods=['DELETE'])
@login_required
def delete_schedule(event_id):
    schedules = load_schedules()
    new_schedules = [ev for ev in schedules if ev["id"] != event_id]
    save_schedules(new_schedules)
    return jsonify({"success": True})

# -----------------------------------------------------------------------------
# Category APIs
# -----------------------------------------------------------------------------
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = load_categories()
    return jsonify({"success": True, "categories": categories})

@app.route('/api/categories', methods=['POST'])
@login_required
def add_category():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"success": False, "error": "카테고리 이름을 입력해주세요."}), 400
        
    categories = load_categories()
    cat_id = data.get("id") or f"cat_{uuid.uuid4().hex[:6]}"
    new_cat = {
        "id": cat_id,
        "name": name,
        "color": data.get("color", "indigo"),
        "is_system": False
    }
    
    # Check if exists
    for idx, cat in enumerate(categories):
        if cat["id"] == cat_id:
            categories[idx] = new_cat
            save_categories(categories)
            return jsonify({"success": True, "category": new_cat})
            
    categories.append(new_cat)
    save_categories(categories)
    return jsonify({"success": True, "category": new_cat})

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
@login_required
def delete_category(cat_id):
    categories = load_categories()
    target = next((c for c in categories if c["id"] == cat_id), None)
    if not target:
        return jsonify({"success": False, "error": "카테고리를 찾을 수 없습니다."}), 404
    if target.get("is_system"):
        return jsonify({"success": False, "error": "기본 시스템 카테고리는 삭제할 수 없습니다."}), 400
        
    new_categories = [c for c in categories if c["id"] != cat_id]
    save_categories(new_categories)
    return jsonify({"success": True})

# -----------------------------------------------------------------------------
# Site Bookmarks & Custom Categories APIs
# -----------------------------------------------------------------------------
@app.route('/api/sites', methods=['GET'])
def get_sites():
    data = load_sites_data()
    return jsonify({
        "success": True,
        "categories": data.get("categories", []),
        "sites": data.get("sites", [])
    })

@app.route('/api/sites', methods=['POST'])
@login_required
def add_or_update_site():
    req_data = request.json or {}
    title = str(req_data.get("title", "")).strip()
    url = str(req_data.get("url", "")).strip()
    category = str(req_data.get("category", "")).strip()

    if not title:
        return jsonify({"success": False, "error": "사이트 이름을 입력해주세요."}), 400
    if not url:
        return jsonify({"success": False, "error": "사이트 주소(URL)를 입력해주세요."}), 400

    if not (url.startswith("http://") or url.startswith("https://")):
        url = "https://" + url

    sites_data = load_sites_data()
    categories = sites_data.get("categories", [])
    sites = sites_data.get("sites", [])

    if not category:
        category = categories[0]["id"] if categories else "custom"

    site_id = req_data.get("id") or f"site_{uuid.uuid4().hex[:8]}"
    new_site = {
        "id": site_id,
        "title": title,
        "url": url,
        "category": category
    }

    found = False
    for idx, s in enumerate(sites):
        if s["id"] == site_id:
            sites[idx] = new_site
            found = True
            break
    if not found:
        sites.append(new_site)

    sites_data["sites"] = sites
    save_sites_data(sites_data)
    return jsonify({"success": True, "site": new_site})

@app.route('/api/sites/<site_id>', methods=['DELETE'])
@login_required
def delete_site(site_id):
    sites_data = load_sites_data()
    sites = sites_data.get("sites", [])
    new_sites = [s for s in sites if s["id"] != site_id]
    sites_data["sites"] = new_sites
    save_sites_data(sites_data)
    return jsonify({"success": True})

@app.route('/api/sites/categories', methods=['POST'])
@login_required
def add_or_update_site_category():
    req_data = request.json or {}
    title = str(req_data.get("title", "")).strip()
    color = str(req_data.get("color", "text-blue-400")).strip()

    if not title:
        return jsonify({"success": False, "error": "카테고리 이름을 입력해주세요."}), 400

    sites_data = load_sites_data()
    categories = sites_data.get("categories", [])

    cat_id = req_data.get("id") or f"cat_site_{uuid.uuid4().hex[:6]}"
    new_cat = {
        "id": cat_id,
        "title": title,
        "color": color
    }

    found = False
    for idx, c in enumerate(categories):
        if c["id"] == cat_id:
            categories[idx] = new_cat
            found = True
            break
    if not found:
        categories.append(new_cat)

    sites_data["categories"] = categories
    save_sites_data(sites_data)
    return jsonify({"success": True, "category": new_cat})

@app.route('/api/sites/categories/<cat_id>', methods=['DELETE'])
@login_required
def delete_site_category(cat_id):
    sites_data = load_sites_data()
    categories = sites_data.get("categories", [])
    sites = sites_data.get("sites", [])

    new_cats = [c for c in categories if c["id"] != cat_id]
    new_sites = [s for s in sites if s.get("category") != cat_id]

    sites_data["categories"] = new_cats
    sites_data["sites"] = new_sites
    save_sites_data(sites_data)
    return jsonify({"success": True})


# -----------------------------------------------------------------------------
# Academic Calendar APIs & Sync Engine (PKNU LMS)
# -----------------------------------------------------------------------------
def parse_academic_calendar_from_html(html):
    tables = list(re.finditer(r'<table[^>]*>(.*?)</table>', html, re.DOTALL | re.IGNORECASE))
    current_year = 2026
    events = []

    for idx, match in enumerate(tables):
        t_content = match.group(1)
        start_idx = match.start()
        header_context = html[max(0, start_idx-250):start_idx]
        header_clean = re.sub(r'<[^>]+>', ' ', header_context)

        year_m = re.search(r'(\d{4})\s*년?', header_clean)
        if year_m:
            current_year = int(year_m.group(1))

        month_m = re.search(r'(\d{1,2})\s*월', header_clean)
        current_month = int(month_m.group(1)) if month_m else (idx % 12 + 1)

        rows = re.findall(r'<th class="schedule">(.*?)</th>\s*<td[^>]*>(.*?)</td>', t_content, re.DOTALL)
        for date_raw, content_raw in rows:
            d_text = re.sub(r'<[^>]+>', ' ', date_raw).strip()
            c_text = re.sub(r'<[^>]+>', ' ', content_raw).strip()
            if not c_text or not d_text:
                continue

            if '~' in d_text:
                parts = d_text.split('~')
                start_part = parts[0].strip()
                end_part = parts[1].strip()
                sm = re.search(r'(\d{1,2})\.\s*(\d{1,2})', start_part)
                em = re.search(r'(\d{1,2})\.\s*(\d{1,2})', end_part)
                if sm and em:
                    s_month, s_day = int(sm.group(1)), int(sm.group(2))
                    e_month, e_day = int(em.group(1)), int(em.group(2))
                    s_year = current_year
                    if s_month == 12 and current_month <= 2:
                        s_year = current_year - 1
                    e_year = current_year
                    if e_month < s_month and s_month == 12:
                        e_year = s_year + 1
                    elif e_month < current_month:
                        e_year = current_year + 1
                    start_date = f"{s_year:04d}-{s_month:02d}-{s_day:02d}"
                    end_date = f"{e_year:04d}-{e_month:02d}-{e_day:02d}"
                else:
                    continue
            else:
                sm = re.search(r'(\d{1,2})\.\s*(\d{1,2})', d_text)
                if sm:
                    s_month, s_day = int(sm.group(1)), int(sm.group(2))
                    s_year = current_year
                    start_date = f"{s_year:04d}-{s_month:02d}-{s_day:02d}"
                    end_date = None
                else:
                    continue

            events.append({
                "title": c_text,
                "date": start_date,
                "end_date": end_date,
                "is_all_day": True,
                "category_id": "cat-academic",
                "color": "orange",
                "memo": f"국립부경대학교 학사일정 ({d_text})"
            })

    unique_events = []
    seen = set()
    for ev in events:
        key = (ev["title"], ev["date"], ev.get("end_date"))
        if key not in seen:
            seen.add(key)
            ev["id"] = f"academic_{abs(hash(key)) % 100000000:08d}"
            ev["is_academic"] = True
            unique_events.append(ev)

    return unique_events

def sync_academic_calendar():
    html = None
    url = 'https://lms.pknu.ac.kr/ilos/st/schedule/academic_calendar_list_form.acl'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
    except Exception as e:
        print(f"LMS live fetch notice: {e}")

    cache_path = os.path.join(DATA_DIR, 'academic_calendar_cache.html')
    if html:
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                f.write(html)
        except Exception:
            pass
    elif os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                html = f.read()
        except Exception:
            pass

    if not html:
        return []

    academic_events = parse_academic_calendar_from_html(html)
    if not academic_events:
        return []

    schedules = load_schedules()
    non_academic = [s for s in schedules if s.get('category_id') != 'cat-academic' and not s.get('is_academic')]
    updated_schedules = non_academic + academic_events
    save_schedules(updated_schedules)
    return academic_events

@app.route('/api/academic/sync', methods=['POST'])
def api_sync_academic():
    try:
        events = sync_academic_calendar()
        return jsonify({"success": True, "count": len(events), "events": events})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Initialize academic calendar if missing in schedules.json
try:
    _cur_scheds = load_schedules()
    if not any(s.get('category_id') == 'cat-academic' for s in _cur_scheds):
        print("Auto-syncing academic calendar on startup...")
        sync_academic_calendar()
except Exception as e:
    print(f"Auto-sync warning: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'true').lower() in ('true', '1', 't')
    print("==================================================")
    print(f" Personal Portal & Dashboard Started (Port {port})")
    print(f" Local URL: http://127.0.0.1:{port}")
    print("==================================================")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

