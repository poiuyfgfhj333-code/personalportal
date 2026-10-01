/**
 * My Portal Dashboard Application Logic
 * Comprehensive Features:
 *  1. Monitorix Proxy & 실시간 그래프 모니터링
 *  2. 4대 분류별 Site 북마크 허브 (전체 및 카테고리별 그룹 렌더링)
 *  3. Course 관리 & 주간 7일 시간표 (연속 교시 단일 박스 병합, 대표 색상 지원, PDF 파싱)
 *  4. Schedule 캘린더 엔진 (월간/주간 뷰, 수강 과목 자동 연동, 일정 & 카테고리 CRUD)
 */

// ============================================================================
// Global State Management
// ============================================================================
const STATE = {
  currentTab: 'home',
  timeRange: '1day',
  subGraphs: {
    lmsens: '1',
    nvidia: '1',
    disk: '01'
  },
  autoRefreshInterval: 30, // seconds
  refreshTimer: null,
  activeCategory: 'all',
  searchQuery: '',
  courses: [],
  activeCourse: null,
  
  // Schedule state
  schedules: [],
  categories: [],
  scheduleViewMode: 'month', // 'month' | 'week'
  currentDate: new Date(),
  selectedScheduleCategories: [],
  activeScheduleEvent: null,
  selectedCourseColor: 'blue',
  selectedCourseIcon: '📚',
  activeIconCategory: 'all',
  selectedEventColor: 'blue',
  selectedNewCatColor: 'purple',
  
  // Sites state
  siteCategories: [],
  sites: [],
  siteEditMode: false,
  selectedSiteCatColor: 'text-blue-400',

  // Authentication state
  isLoggedIn: false,
  currentUser: null,
  pendingAuthAction: null
};

// ============================================================================
// Color Themes & Palettes
// ============================================================================
const PALETTE_COLORS = [
  { id: 'blue', name: '블루', bg: 'bg-blue-600', ring: 'ring-blue-500', hex: '#2563eb' },
  { id: 'indigo', name: '인디고', bg: 'bg-indigo-600', ring: 'ring-indigo-500', hex: '#4f46e5' },
  { id: 'rose', name: '로즈', bg: 'bg-rose-600', ring: 'ring-rose-500', hex: '#e11d48' },
  { id: 'emerald', name: '에메랄드', bg: 'bg-emerald-600', ring: 'ring-emerald-500', hex: '#059669' },
  { id: 'amber', name: '앰버', bg: 'bg-amber-600', ring: 'ring-amber-500', hex: '#d97706' },
  { id: 'purple', name: '퍼플', bg: 'bg-purple-600', ring: 'ring-purple-500', hex: '#9333ea' },
  { id: 'cyan', name: '시안', bg: 'bg-cyan-600', ring: 'ring-cyan-500', hex: '#0891b2' },
  { id: 'orange', name: '오렌지', bg: 'bg-orange-600', ring: 'ring-orange-500', hex: '#ea580c' }
];

const COLOR_THEMES = {
  blue: {
    icon: '💻',
    gradient: 'from-blue-600 to-indigo-600',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    cellBg: 'bg-blue-950/70 border-blue-500/50 text-blue-100 hover:border-blue-400',
    chipBg: 'bg-blue-600/25 text-blue-200 border border-blue-500/40'
  },
  indigo: {
    icon: '📚',
    gradient: 'from-indigo-600 to-purple-600',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/40',
    text: 'text-indigo-400',
    cellBg: 'bg-indigo-950/70 border-indigo-500/50 text-indigo-100 hover:border-indigo-400',
    chipBg: 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40'
  },
  rose: {
    icon: '🧬',
    gradient: 'from-rose-600 to-pink-600',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    cellBg: 'bg-rose-950/70 border-rose-500/50 text-rose-100 hover:border-rose-400',
    chipBg: 'bg-rose-600/25 text-rose-200 border border-rose-500/40'
  },
  emerald: {
    icon: '👥',
    gradient: 'from-emerald-600 to-teal-600',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    cellBg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100 hover:border-emerald-400',
    chipBg: 'bg-emerald-600/25 text-emerald-200 border border-emerald-500/40'
  },
  amber: {
    icon: '⚡',
    gradient: 'from-amber-600 to-yellow-600',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    cellBg: 'bg-amber-950/70 border-amber-500/50 text-amber-100 hover:border-amber-400',
    chipBg: 'bg-amber-600/25 text-amber-200 border border-amber-500/40'
  },
  purple: {
    icon: '✨',
    gradient: 'from-purple-600 to-pink-600',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    cellBg: 'bg-purple-950/70 border-purple-500/50 text-purple-100 hover:border-purple-400',
    chipBg: 'bg-purple-600/25 text-purple-200 border border-purple-500/40'
  },
  cyan: {
    icon: '🌐',
    gradient: 'from-cyan-600 to-blue-600',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    cellBg: 'bg-cyan-950/70 border-cyan-500/50 text-cyan-100 hover:border-cyan-400',
    chipBg: 'bg-cyan-600/25 text-cyan-200 border border-cyan-500/40'
  },
  orange: {
    icon: '🎯',
    gradient: 'from-orange-600 to-amber-600',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    cellBg: 'bg-orange-950/70 border-orange-500/50 text-orange-100 hover:border-orange-400',
    chipBg: 'bg-orange-600/25 text-orange-200 border border-orange-500/40'
  }
};

// ============================================================================
// Tailored Icon Library for Courses
// (의공학, 사회복지, 포용사회, 일반/공학 맞춤형 아이콘)
// ============================================================================
const TAILORED_ICONS = {
  bme: [
    { icon: '🧬', name: 'DNA / 생체유전' },
    { icon: '🔬', name: '현미경 / 분자생물' },
    { icon: '🩺', name: '청진기 / 임상의공' },
    { icon: '🫀', name: '심장 / 생체기관' },
    { icon: '🧪', name: '시험관 / 의공생화학' },
    { icon: '💊', name: '의약품 / 약리학' },
    { icon: '⚡', name: '생체전기신호' },
    { icon: '🦾', name: '생체로봇 / 의지공학' }
  ],
  welfare: [
    { icon: '👥', name: '사회 / 복지' },
    { icon: '🤝', name: '협력 / 사회복지실천' },
    { icon: '🤲', name: '돌봄과 나눔' },
    { icon: '🏡', name: '지역사회복지' },
    { icon: '🪴', name: '사회복지정책' },
    { icon: '👶', name: '아동복지론' },
    { icon: '👵', name: '고령사회와 복지' },
    { icon: '🛡️', name: '사회안전망 / 복지행정' }
  ],
  inclusion: [
    { icon: '🌐', name: '포용사회 / HUSS' },
    { icon: '🕊️', name: '관계심리학 / 평화' },
    { icon: '💡', name: '복지기술혁신' },
    { icon: '🏅', name: '스포츠와 포용' },
    { icon: '🌈', name: '다양성과 공존' },
    { icon: '♿', name: '배리어프리 / 접근성' },
    { icon: '🧩', name: '융합사회' },
    { icon: '⚖️', name: '인권과 사회정의' }
  ],
  general: [
    { icon: '💻', name: '컴퓨터 / 프로그래밍' },
    { icon: '📚', name: '전공학습 / 도서' },
    { icon: '📊', name: '자료구조 / 데이터' },
    { icon: '🖼️', name: '디지털이미지프로세싱' },
    { icon: '📝', name: '필기 / 레포트' },
    { icon: '🎯', name: '학습목표' },
    { icon: '🔍', name: '연구탐색' },
    { icon: '⚙️', name: '공학실습' }
  ]
};

// ============================================================================
// Site Bookmarks Data (4 Distinct Categories)
// ============================================================================
const SITE_CATEGORIES = [
  { id: 'lms', title: 'LMS (온라인 강의실)', color: 'text-blue-400' },
  { id: 'pknu', title: '부경대 포털 및 홈페이지', color: 'text-cyan-400' },
  { id: 'dept', title: '학과별 홈페이지', color: 'text-rose-400' },
  { id: 'research', title: '연구 관련', color: 'text-emerald-400' }
];

const SITES_DATA = [
  // 1. LMS
  { id: 'pknu-lms', title: '부경대 LMS', url: 'https://lms.pknu.ac.kr/ilos/main/main_form.acl', category: 'lms' },
  { id: 'inu-huss', title: '인천대 HUSS', url: 'https://lms.hussis.ac.kr/login/index.php', category: 'lms' },
  { id: 'hansapyung', title: '한국사이버평생교육원', url: 'https://www.hakjum.com/index.asp', category: 'lms' },

  // 2. 부경대 홈페이지
  { id: 'pknu-main', title: '부경대 대표홈페이지', url: 'https://www.pknu.ac.kr/main', category: 'pknu' },
  { id: 'pknu-portal', title: '부경대 종합포털', url: 'https://portal.pknu.ac.kr/', category: 'pknu' },
  { id: 'pknu-library', title: '부경대 도서관', url: 'https://libweb.pknu.ac.kr/', category: 'pknu' },

  // 3. 학과별 홈페이지
  { id: 'pknu-welfare', title: '사회복지학전공', url: 'https://icms.pknu.ac.kr/ps1/1', category: 'dept' },
  { id: 'pknu-bme', title: '의공학전공', url: 'https://bme.pknu.ac.kr/bme/1', category: 'dept' },
  { id: 'pknu-huss-dept', title: 'HUSS 사업단', url: 'https://icms.pknu.ac.kr/huss/1', category: 'dept' },

  // 4. 연구 관련
  { id: 'google-scholar', title: 'Google Scholar', url: 'https://scholar.google.com/?hl=ko', category: 'research' },
  { id: 'dbpia', title: 'DBpia', url: 'https://www.dbpia.co.kr/', category: 'research' },
  { id: 'pknu-biophysics', title: '계산생물물리학 연구실', url: 'https://icms.pknu.ac.kr/biophysics/1', category: 'research' }
];

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  initAutoRefresh();
  renderSites();
  initDropzone();
  initColorPickers();
  
  // Check user authentication status
  await checkAuthStatus();
  
  // Load data asynchronously
  await Promise.all([
    loadSites(),
    loadCourses(),
    loadCategories(),
    loadSchedules()
  ]);
  
  refreshAllGraphs();
  renderSchedule();
});

// ============================================================================
// 1. Navigation & Theme & Mobile
// ============================================================================
function switchTab(tabId) {
  STATE.currentTab = tabId;
  
  // Tab buttons (Desktop)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  // Mobile Bottom Navigation Buttons
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.classList.remove('active', 'text-blue-400');
    btn.classList.add('text-slate-400');
  });
  const activeMobileBtn = document.getElementById(`mobile-tab-${tabId}`);
  if (activeMobileBtn) {
    activeMobileBtn.classList.add('active', 'text-blue-400');
    activeMobileBtn.classList.remove('text-slate-400');
  }

  // Tab content sections
  document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));
  const activeSec = document.getElementById(`section-${tabId}`);
  if (activeSec) {
    activeSec.classList.remove('hidden');
  }

  // Trigger special view updates
  if (tabId === 'schedule') {
    renderSchedule();
  } else if (tabId === 'course') {
    renderTimetable();
  }

  lucide.createIcons();
}

// ----------------------------------------------------------------------------
// Mobile & Public Link Connect Modal (Cloudflare Tunnel & QR Code)
// ----------------------------------------------------------------------------
let cachedNetworkInfo = null;

async function openMobileConnectModal() {
  const modal = document.getElementById('mobile-connect-modal');
  if (!modal) return;

  const inputEl = document.getElementById('mobile-connect-url-input');
  const qrImg = document.getElementById('mobile-connect-qr-img');
  const statusPill = document.getElementById('public-url-status-pill');
  const localIpEl = document.getElementById('local-ip-display');

  modal.classList.remove('hidden');
  lucide.createIcons();

  try {
    const res = await fetch('/api/system/network');
    if (res.ok) {
      const data = await res.json();
      cachedNetworkInfo = data;

      const activeUrl = data.public_url || data.url || data.local_url;
      if (inputEl) {
        inputEl.value = activeUrl;
      }
      if (qrImg) {
        qrImg.src = `/api/system/qrcode?t=${Date.now()}`;
      }
      if (localIpEl && data.local_ip) {
        localIpEl.textContent = `${data.local_ip}:${data.port || 5000}`;
      }
      if (statusPill) {
        if (data.public_url) {
          statusPill.innerHTML = `<i data-lucide="shield-check" class="w-3 h-3 text-emerald-400"></i> <span class="text-emerald-400">보안 HTTPS 연결됨</span>`;
        } else {
          statusPill.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin text-amber-400"></i> <span class="text-amber-400">외부 링크 생성 대기 중</span>`;
        }
        lucide.createIcons();
      }
    }
  } catch (err) {
    console.warn('Network info fetch error:', err);
  }
}

function closeMobileConnectModal() {
  const modal = document.getElementById('mobile-connect-modal');
  if (modal) modal.classList.add('hidden');
}

function copyConnectUrl() {
  const inputEl = document.getElementById('mobile-connect-url-input');
  if (!inputEl) return;

  const url = inputEl.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showCopiedFeedback()).catch(() => fallbackCopy(inputEl));
  } else {
    fallbackCopy(inputEl);
  }
}

function copyLocalUrl() {
  const localUrl = cachedNetworkInfo?.local_url || 'http://210.125.111.157:5000';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(localUrl).then(() => alert(`교내망 접속 주소가 복사되었습니다:\n${localUrl}`)).catch(() => prompt('복사하세요:', localUrl));
  } else {
    prompt('복사하세요:', localUrl);
  }
}

function fallbackCopy(inputEl) {
  inputEl.select();
  document.execCommand('copy');
  showCopiedFeedback();
}

function showCopiedFeedback() {
  const textEl = document.getElementById('text-copy-connect-url');
  const toastMsg = document.getElementById('copy-toast-msg');

  if (textEl) {
    const original = textEl.textContent;
    textEl.textContent = '복사 완료!';
    setTimeout(() => {
      textEl.textContent = original;
    }, 2500);
  }

  if (toastMsg) {
    toastMsg.classList.remove('hidden');
    setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, 4000);
  }
}

// ----------------------------------------------------------------------------
// Mobile Schedule Filter Accordion Toggle
// ----------------------------------------------------------------------------
function toggleMobileFilterAccordion() {
  const body = document.getElementById('mobile-filter-accordion-body');
  const icon = document.getElementById('mobile-filter-accordion-icon');
  if (!body) return;

  const isHidden = body.classList.toggle('hidden');
  if (icon) {
    icon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
    lucide.createIcons();
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
  }
}

function initClock() {
  const clockEl = document.getElementById('live-clock');
  const update = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
  };
  update();
  setInterval(update, 1000);
}

// ============================================================================
// 2. Monitorix Home Tab (Proxy & Cache Integration)
// ============================================================================
function getGraphUrl(type, isHighRes = false) {
  const sub = STATE.subGraphs[type] || '1';
  const range = STATE.timeRange || '1day';
  const z = isHighRes ? '1' : '0';
  const timestamp = Date.now();
  return `/api/monitorix/graph?type=${type}&sub=${sub}&range=${range}&z=${z}&t=${timestamp}`;
}

function refreshAllGraphs() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  const types = ['lmsens', 'nvidia', 'disk'];
  types.forEach(t => {
    const img = document.getElementById(`img-${t}`);
    if (img) {
      img.src = getGraphUrl(t, false);
    }
  });

  const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  document.querySelectorAll('.last-updated').forEach(el => {
    el.textContent = `갱신: ${nowStr}`;
  });

  setTimeout(() => {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  }, 600);
}

function changeTimeRange(range) {
  STATE.timeRange = range;
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const btn = document.getElementById(`range-btn-${range}`);
  if (btn) {
    btn.classList.add('active', 'bg-blue-600', 'text-white');
    btn.classList.remove('text-slate-400');
  }
  refreshAllGraphs();
}

function setSubGraph(type, num) {
  STATE.subGraphs[type] = num;
  
  const parent = document.getElementById(`sub-${type}-${num}`).parentElement;
  parent.querySelectorAll('button').forEach(b => {
    b.classList.remove('bg-blue-600', 'text-white');
    b.classList.add('bg-slate-800', 'text-slate-400');
  });
  const activeB = document.getElementById(`sub-${type}-${num}`);
  if (activeB) {
    activeB.classList.add('bg-blue-600', 'text-white');
    activeB.classList.remove('bg-slate-800', 'text-slate-400');
  }

  const img = document.getElementById(`img-${type}`);
  if (img) img.src = getGraphUrl(type, false);
}

function setAutoRefresh(seconds) {
  STATE.autoRefreshInterval = parseInt(seconds, 10);
  if (STATE.refreshTimer) {
    clearInterval(STATE.refreshTimer);
    STATE.refreshTimer = null;
  }
  if (STATE.autoRefreshInterval > 0) {
    STATE.refreshTimer = setInterval(refreshAllGraphs, STATE.autoRefreshInterval * 1000);
  }
}

function initAutoRefresh() {
  const select = document.getElementById('auto-refresh-select');
  if (select) {
    setAutoRefresh(select.value);
  }
}

function openGraphModal(type) {
  const modal = document.getElementById('graph-modal');
  const modalImg = document.getElementById('graph-modal-img');
  const modalTitle = document.getElementById('graph-modal-title');
  const modalUrl = document.getElementById('graph-modal-url');

  const names = {
    lmsens: 'LM-Sensors and GPU temperatures (고해상도)',
    nvidia: 'NVIDIA temperatures and usage (고해상도)',
    disk: 'Disk drive temperatures and health (고해상도)'
  };

  const highResUrl = getGraphUrl(type, true);
  modalTitle.textContent = names[type] || 'Monitorix 고해상도 그래프';
  modalImg.src = highResUrl;
  modalUrl.textContent = highResUrl;

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeGraphModal() {
  document.getElementById('graph-modal').classList.add('hidden');
}

function handleImgError(img) {
  img.style.opacity = '0.6';
  // Retry once after 1.5s in case Monitorix is generating
  if (!img.dataset.retried) {
    img.dataset.retried = '1';
    setTimeout(() => {
      img.src = img.src.split('&retry=')[0] + `&retry=${Date.now()}`;
    }, 1500);
  }
}

function handleImgLoad(img) {
  img.style.opacity = '1';
  delete img.dataset.retried;
}

// ============================================================================
// 3. Site Tab (Ultra-Compact Hub & Custom Link/Category Management)
// ============================================================================
const SITE_COLOR_PALETTES = [
  { id: 'text-blue-400', name: '블루', class: 'text-blue-400', bg: 'bg-blue-600' },
  { id: 'text-cyan-400', name: '시안', class: 'text-cyan-400', bg: 'bg-cyan-600' },
  { id: 'text-rose-400', name: '로즈', class: 'text-rose-400', bg: 'bg-rose-600' },
  { id: 'text-emerald-400', name: '에메랄드', class: 'text-emerald-400', bg: 'bg-emerald-600' },
  { id: 'text-purple-400', name: '퍼플', class: 'text-purple-400', bg: 'bg-purple-600' },
  { id: 'text-amber-400', name: '앰버', class: 'text-amber-400', bg: 'bg-amber-600' },
  { id: 'text-orange-400', name: '오렌지', class: 'text-orange-400', bg: 'bg-orange-600' }
];

async function loadSites() {
  try {
    const res = await fetch('/api/sites');
    const json = await res.json();
    if (json.success) {
      STATE.siteCategories = json.categories || [];
      STATE.sites = json.sites || [];
    } else {
      STATE.siteCategories = SITE_CATEGORIES;
      STATE.sites = SITES_DATA;
    }
  } catch (e) {
    console.warn('Load sites fallback to defaults:', e);
    STATE.siteCategories = SITE_CATEGORIES;
    STATE.sites = SITES_DATA;
  }
  renderSites();
}

function renderSites() {
  const container = document.getElementById('site-container');
  if (!container) return;

  const q = STATE.searchQuery.toLowerCase();
  const cats = (STATE.siteCategories && STATE.siteCategories.length > 0) ? STATE.siteCategories : SITE_CATEGORIES;
  const allSites = (STATE.sites && STATE.sites.length > 0) ? STATE.sites : SITES_DATA;

  let totalVisibleSites = 0;
  let rowsHtml = '';

  cats.forEach(cat => {
    const sites = allSites.filter(s => {
      const matchCat = s.category === cat.id;
      const matchSearch = !q || s.title.toLowerCase().includes(q) || (s.url && s.url.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });

    if (sites.length > 0 || STATE.siteEditMode) {
      totalVisibleSites += sites.length;
      rowsHtml += `
        <div class="site-category-row flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3.5 border-b border-slate-800/60 first:pt-0 last:border-0 last:pb-0">
          <div class="w-44 flex-shrink-0 flex items-center justify-between sm:justify-start gap-2">
            <span class="text-xs font-bold ${cat.color || 'text-blue-400'} tracking-wide">
              ${cat.title}
            </span>
            ${STATE.siteEditMode ? `
              <button onclick="openSiteModal(null, '${cat.id}')" class="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition flex items-center gap-1" title="이 카테고리에 사이트 추가">
                <i data-lucide="plus" class="w-3 h-3"></i>추가
              </button>
            ` : ''}
          </div>
          <div class="flex flex-wrap items-center gap-2 flex-1">
            ${sites.map(site => {
              if (STATE.siteEditMode) {
                return `
                  <div class="inline-flex items-center rounded-lg bg-slate-800/90 border border-amber-500/50 shadow-sm overflow-hidden text-xs sm:text-sm">
                    <button onclick="openSiteModal('${site.id}')" class="px-3 py-1.5 text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center gap-1.5 font-medium transition" title="사이트 수정">
                      <span>${site.title}</span>
                      <i data-lucide="pencil" class="w-3 h-3 text-amber-400"></i>
                    </button>
                    <button onclick="deleteSiteById('${site.id}')" class="px-2 py-1.5 text-rose-400 hover:text-white hover:bg-rose-600/80 border-l border-slate-700 transition" title="사이트 삭제">
                      <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                  </div>
                `;
              } else {
                return `
                  <a href="${site.url}" target="_blank" rel="noopener noreferrer"
                     class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-blue-600 border border-slate-700/70 hover:border-blue-500 text-slate-200 hover:text-white text-xs sm:text-sm font-medium transition shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95 group">
                    <span>${site.title}</span>
                    <span class="text-slate-400 group-hover:text-white text-[11px] font-mono transition-colors">↗</span>
                  </a>
                `;
              }
            }).join('')}
            ${sites.length === 0 && STATE.siteEditMode ? `
              <span class="text-xs text-slate-500 italic">등록된 사이트가 없습니다.</span>
            ` : ''}
          </div>
        </div>
      `;
    }
  });

  if (totalVisibleSites === 0 && !STATE.siteEditMode) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-sm bg-slate-900/40 rounded-xl border border-slate-800">
        검색 결과와 일치하는 사이트가 없습니다.
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        ${rowsHtml}
      </div>
    `;
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function filterSites() {
  const input = document.getElementById('site-search-input');
  STATE.searchQuery = input ? input.value.trim() : '';
  renderSites();
}

function filterCategory(catId) {
  STATE.activeCategory = catId;
  renderSites();
}

function toggleSiteEditMode() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => toggleSiteEditMode(), '사이트 및 카테고리를 편집하려면 로그인이 필요합니다.');
    return;
  }
  STATE.siteEditMode = !STATE.siteEditMode;
  const btn = document.getElementById('site-edit-mode-btn');
  const label = document.getElementById('site-edit-mode-label');
  if (btn && label) {
    if (STATE.siteEditMode) {
      btn.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
      btn.classList.add('bg-amber-600', 'text-white', 'border-amber-500');
      label.textContent = '편집 완료';
    } else {
      btn.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
      btn.classList.remove('bg-amber-600', 'text-white', 'border-amber-500');
      label.textContent = '수정/삭제';
    }
  }
  renderSites();
}

// -----------------------------------------------------------------------------
// Site Modal Functions
// -----------------------------------------------------------------------------
function openSiteModal(siteId = null, defaultCatId = null) {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => openSiteModal(siteId, defaultCatId), '사이트를 추가/수정하려면 로그인이 필요합니다.');
    return;
  }

  const modal = document.getElementById('site-modal');
  const headerText = document.getElementById('site-modal-header-text');
  const idInput = document.getElementById('site-modal-id');
  const titleInput = document.getElementById('site-modal-title');
  const urlInput = document.getElementById('site-modal-url');
  const catSelect = document.getElementById('site-modal-category');
  const deleteBtn = document.getElementById('site-modal-delete-btn');
  const errorBox = document.getElementById('site-modal-error');

  if (errorBox) errorBox.classList.add('hidden');

  const cats = (STATE.siteCategories && STATE.siteCategories.length > 0) ? STATE.siteCategories : SITE_CATEGORIES;
  if (catSelect) {
    catSelect.innerHTML = cats.map(c => `
      <option value="${c.id}">${c.title}</option>
    `).join('');
  }

  if (siteId) {
    const site = (STATE.sites || []).find(s => s.id === siteId);
    if (site) {
      if (headerText) headerText.textContent = '사이트 바로가기 수정';
      if (idInput) idInput.value = site.id;
      if (titleInput) titleInput.value = site.title || '';
      if (urlInput) urlInput.value = site.url || '';
      if (catSelect) catSelect.value = site.category || (cats[0] ? cats[0].id : '');
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    }
  } else {
    if (headerText) headerText.textContent = '사이트 바로가기 추가';
    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';
    if (catSelect) catSelect.value = defaultCatId || (cats[0] ? cats[0].id : '');
    if (deleteBtn) deleteBtn.classList.add('hidden');
  }

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeSiteModal() {
  const modal = document.getElementById('site-modal');
  if (modal) modal.classList.add('hidden');
}

function openSiteCategoryModalFromSiteModal() {
  closeSiteModal();
  openSiteCategoryModal();
}

async function saveSiteFromModal() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => saveSiteFromModal(), '사이트를 저장하려면 로그인이 필요합니다.');
    return;
  }

  const id = document.getElementById('site-modal-id')?.value.trim();
  const title = document.getElementById('site-modal-title')?.value.trim();
  const url = document.getElementById('site-modal-url')?.value.trim();
  const category = document.getElementById('site-modal-category')?.value;
  const errorBox = document.getElementById('site-modal-error');

  if (!title) {
    if (errorBox) {
      errorBox.textContent = '사이트 이름을 입력해주세요.';
      errorBox.classList.remove('hidden');
    }
    return;
  }
  if (!url) {
    if (errorBox) {
      errorBox.textContent = '사이트 주소(URL)를 입력해주세요.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, url, category })
    });
    const json = await res.json();
    if (json.success) {
      closeSiteModal();
      await loadSites();
    } else {
      if (errorBox) {
        errorBox.textContent = json.error || '저장에 실패했습니다.';
        errorBox.classList.remove('hidden');
      }
    }
  } catch (e) {
    if (errorBox) {
      errorBox.textContent = '서버 통신 오류가 발생했습니다.';
      errorBox.classList.remove('hidden');
    }
  }
}

async function deleteCurrentSiteFromModal() {
  const id = document.getElementById('site-modal-id')?.value;
  if (!id) return;
  if (!confirm('이 사이트 바로가기를 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/sites/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      closeSiteModal();
      await loadSites();
    }
  } catch (e) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

async function deleteSiteById(siteId) {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => deleteSiteById(siteId), '사이트를 삭제하려면 로그인이 필요합니다.');
    return;
  }
  const site = (STATE.sites || []).find(s => s.id === siteId);
  const title = site ? site.title : '이 사이트';
  if (!confirm(`'${title}' 바로가기를 삭제하시겠습니까?`)) return;

  try {
    const res = await fetch(`/api/sites/${encodeURIComponent(siteId)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      await loadSites();
    }
  } catch (e) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// -----------------------------------------------------------------------------
// Site Category Modal Functions
// -----------------------------------------------------------------------------
function openSiteCategoryModal() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => openSiteCategoryModal(), '카테고리를 관리하려면 로그인이 필요합니다.');
    return;
  }

  const modal = document.getElementById('site-category-modal');
  const titleInput = document.getElementById('site-cat-new-title');
  const errorBox = document.getElementById('site-cat-error');
  if (titleInput) titleInput.value = '';
  if (errorBox) errorBox.classList.add('hidden');

  renderSiteCategoryColorPalette();
  renderSiteCategoryList();

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (titleInput) titleInput.focus();
    }, 100);
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeSiteCategoryModal() {
  const modal = document.getElementById('site-category-modal');
  if (modal) modal.classList.add('hidden');
}

function renderSiteCategoryColorPalette() {
  const container = document.getElementById('site-cat-color-palette');
  if (!container) return;

  if (!STATE.selectedSiteCatColor) {
    STATE.selectedSiteCatColor = 'text-blue-400';
  }

  container.innerHTML = SITE_COLOR_PALETTES.map(p => {
    const isSelected = STATE.selectedSiteCatColor === p.class;
    return `
      <button type="button" onclick="selectSiteCatColor('${p.class}')"
              class="w-6 h-6 rounded-full ${p.bg} transition-transform ${isSelected ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}"
              title="${p.name}">
      </button>
    `;
  }).join('');
}

function selectSiteCatColor(colorClass) {
  STATE.selectedSiteCatColor = colorClass;
  renderSiteCategoryColorPalette();
}

function renderSiteCategoryList() {
  const listContainer = document.getElementById('site-cat-list');
  if (!listContainer) return;

  const cats = (STATE.siteCategories && STATE.siteCategories.length > 0) ? STATE.siteCategories : SITE_CATEGORIES;
  const sites = STATE.sites || [];

  listContainer.innerHTML = cats.map(cat => {
    const count = sites.filter(s => s.category === cat.id).length;
    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${cat.color || 'text-blue-400'}">${cat.title}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">${count}개</span>
        </div>
        <button type="button" onclick="deleteSiteCategoryById('${cat.id}')" class="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition" title="카테고리 삭제">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

async function createNewSiteCategory() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => createNewSiteCategory(), '카테고리를 추가하려면 로그인이 필요합니다.');
    return;
  }

  const titleInput = document.getElementById('site-cat-new-title');
  const errorBox = document.getElementById('site-cat-error');
  const title = titleInput ? titleInput.value.trim() : '';

  if (!title) {
    if (errorBox) {
      errorBox.textContent = '카테고리 이름을 입력해주세요.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/sites/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        color: STATE.selectedSiteCatColor || 'text-blue-400'
      })
    });
    const json = await res.json();
    if (json.success) {
      if (titleInput) titleInput.value = '';
      if (errorBox) errorBox.classList.add('hidden');
      await loadSites();
      renderSiteCategoryList();
    } else {
      if (errorBox) {
        errorBox.textContent = json.error || '카테고리 등록에 실패했습니다.';
        errorBox.classList.remove('hidden');
      }
    }
  } catch (e) {
    if (errorBox) {
      errorBox.textContent = '서버 통신 오류가 발생했습니다.';
      errorBox.classList.remove('hidden');
    }
  }
}

async function deleteSiteCategoryById(catId) {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => deleteSiteCategoryById(catId), '카테고리를 삭제하려면 로그인이 필요합니다.');
    return;
  }

  const cat = (STATE.siteCategories || []).find(c => c.id === catId);
  const title = cat ? cat.title : '이 카테고리';

  if (!confirm(`'${title}' 카테고리를 삭제하시겠습니까?\n해당 카테고리에 속한 모든 사이트도 함께 삭제됩니다.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/sites/categories/${encodeURIComponent(catId)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      await loadSites();
      renderSiteCategoryList();
    }
  } catch (e) {
    alert('카테고리 삭제 중 오류가 발생했습니다.');
  }
}

// ============================================================================
// 4. Course Tab (7-Day Timetable with Rowspan Merging & PDF Management)
// ============================================================================
let currentCourseViewMode = 'timetable'; // 'timetable' | 'cards' | 'both'

function setCourseViewMode(mode) {
  currentCourseViewMode = mode;
  
  document.querySelectorAll('.course-view-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`view-mode-${mode}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  const cardsContainer = document.getElementById('course-cards-container');
  const timetableContainer = document.getElementById('course-timetable-container');

  if (mode === 'timetable') {
    cardsContainer.classList.add('hidden');
    timetableContainer.classList.remove('hidden');
  } else if (mode === 'cards') {
    cardsContainer.classList.remove('hidden');
    timetableContainer.classList.add('hidden');
  } else {
    cardsContainer.classList.remove('hidden');
    timetableContainer.classList.remove('hidden');
  }

  lucide.createIcons();
}

function getCourseTheme(courseOrTitle) {
  if (!courseOrTitle) return COLOR_THEMES.blue;
  
  let color = null;
  let title = '';
  let customIcon = null;

  if (typeof courseOrTitle === 'object') {
    color = courseOrTitle.color;
    title = courseOrTitle.title || '';
    customIcon = courseOrTitle.icon || null;
  } else {
    title = String(courseOrTitle);
  }

  let theme = (color && COLOR_THEMES[color]) ? { ...COLOR_THEMES[color] } : { ...COLOR_THEMES.blue };

  if (customIcon) {
    theme.icon = customIcon;
  } else {
    // Fallback by title semantics
    if (/의공생화학|생화|생물|화학|bio|chem/i.test(title)) { theme = { ...COLOR_THEMES.rose }; theme.icon = '🧬'; }
    else if (/의공학|생체|임상/i.test(title)) { theme = { ...COLOR_THEMES.rose }; theme.icon = '🩺'; }
    else if (/고령사회|노인|복지기술/i.test(title)) { theme = { ...COLOR_THEMES.emerald }; theme.icon = '👵'; }
    else if (/아동복지/i.test(title)) { theme = { ...COLOR_THEMES.emerald }; theme.icon = '👶'; }
    else if (/사회복지|복지|공동체/i.test(title)) { theme = { ...COLOR_THEMES.emerald }; theme.icon = '👥'; }
    else if (/관계심리|심리/i.test(title)) { theme = { ...COLOR_THEMES.indigo }; theme.icon = '🕊️'; }
    else if (/스포츠|체육/i.test(title)) { theme = { ...COLOR_THEMES.amber }; theme.icon = '🏅'; }
    else if (/포용/i.test(title)) { theme = { ...COLOR_THEMES.indigo }; theme.icon = '🌐'; }
    else if (/이미지|영상|프로세싱/i.test(title)) { theme = { ...COLOR_THEMES.cyan }; theme.icon = '🖼️'; }
    else if (/자료구조|알고리즘/i.test(title)) { theme = { ...COLOR_THEMES.blue }; theme.icon = '📊'; }
    else if (/프로그래밍|컴퓨터|코딩|소프트웨어/i.test(title)) { theme = { ...COLOR_THEMES.blue }; theme.icon = '💻'; }
    else if (/물리|전자|전기|공학/i.test(title)) { theme = { ...COLOR_THEMES.amber }; theme.icon = '⚡'; }
  }

  return theme;
}

function getCategoryIcon(cat) {
  if (/중간/i.test(cat)) return { icon: 'edit-3', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
  if (/기말/i.test(cat)) return { icon: 'trophy', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
  if (/과제|레포트|보고서/i.test(cat)) return { icon: 'folder-check', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (/출/i.test(cat)) return { icon: 'user-check', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
  if (/토론/i.test(cat)) return { icon: 'message-square', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
  if (/퀴즈/i.test(cat)) return { icon: 'zap', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { icon: 'bookmark', color: 'text-slate-300', bg: 'bg-slate-800/40', border: 'border-slate-700' };
}

function extractSortedGradingItems(course) {
  let items = [];
  const grading = course.grading || {};

  if (grading.items && Array.isArray(grading.items) && grading.items.length > 0) {
    items = grading.items.filter(it => it.percentage > 0);
  } else {
    const fields = [
      { name: '중간고사', val: grading.midterm },
      { name: '기말고사', val: grading.final },
      { name: '과제', val: grading.assignment },
      { name: '출결', val: grading.attendance },
      { name: '토론', val: grading.debate },
      { name: '퀴즈', val: grading.quiz },
      { name: '기타/참여도', val: grading.etc }
    ];
    for (const f of fields) {
      if (f.val) {
        const m = f.val.match(/(\d+)/);
        if (m) {
          const pct = parseInt(m[1], 10);
          if (pct > 0) {
            items.push({ category: f.name, percentage: pct, value: `${pct}%` });
          }
        }
      }
    }

    if (items.length === 0 && grading.summary) {
      const parts = grading.summary.split(/[,;\/]+/);
      for (const p of parts) {
        const m = p.match(/([가-힣A-Za-z0-9\/]+)\s*(\d{1,3})\s*%/);
        if (m) {
          const cat = m[1].trim();
          const pct = parseInt(m[2], 10);
          if (pct > 0) {
            items.push({ category: cat, percentage: pct, value: `${pct}%` });
          }
        }
      }
    }
  }

  items.sort((a, b) => b.percentage - a.percentage);
  return items;
}

// ----------------------------------------------------------------------------
// Schedule Parser for Timetable (1교시 = 09:00, 1시간 간격)
// ----------------------------------------------------------------------------
function parseSchedule(classTimeStr) {
  if (!classTimeStr) return [];
  const schedule = [];
  
  // Format 1: "화6,7 수2,3" or "수 5,6,7" or "목11,12,13"
  const regex = /([월화수목금토일])\s*([\d\s,~]+)/g;
  let match;
  while ((match = regex.exec(classTimeStr)) !== null) {
    const day = match[1];
    const periodStr = match[2];
    const periods = [];
    const tokens = periodStr.split(/[,\s~]+/);
    for (const token of tokens) {
      const num = parseInt(token, 10);
      if (!isNaN(num) && num >= 1 && num <= 16) {
        periods.push(num);
      }
    }
    if (periods.length > 0) {
      const uniqueSorted = Array.from(new Set(periods)).sort((a, b) => a - b);
      schedule.push({ day, periods: uniqueSorted });
    }
  }

  // Format 2: "화 10:00~11:50" or "수 14:00~15:50"
  if (schedule.length === 0) {
    const timeRegex = /([월화수목금토일])\s*(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/g;
    let tMatch;
    while ((tMatch = timeRegex.exec(classTimeStr)) !== null) {
      const day = tMatch[1];
      const startH = parseInt(tMatch[2], 10);
      const endH = parseInt(tMatch[4], 10);
      const endM = parseInt(tMatch[5], 10);
      const startP = Math.max(1, startH - 8);
      let endP = Math.max(startP, endH - 8);
      if (endM > 25) endP += 1;
      const periods = [];
      for (let p = startP; p <= endP; p++) periods.push(p);
      schedule.push({ day, periods });
    }
  }

  return schedule;
}

// ----------------------------------------------------------------------------
// Load & Render Courses
// ----------------------------------------------------------------------------
async function loadCourses() {
  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    if (data.success) {
      STATE.courses = data.courses;
      renderCourseCards();
      renderTimetable();
      renderSchedule();
    }
  } catch (err) {
    console.error('Failed to load courses:', err);
  }
}

function renderCourseCards() {
  const container = document.getElementById('course-icon-grid');
  const countBadge = document.getElementById('course-count-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${STATE.courses.length}개 수강 중`;
  }

  if (STATE.courses.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
        <i data-lucide="book-open" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        등록된 수강 과목이 없습니다.<br>위의 업로드 영역에 강의계획서 PDF를 등록하세요.
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = STATE.courses.map(course => {
    const theme = getCourseTheme(course);
    const gradingItems = extractSortedGradingItems(course);

    return `
      <div onclick="openCourseModal('${course.id}')" class="course-card bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-between group">
        <div>
          <!-- Top Row: Icon + Title -->
          <div class="flex items-start gap-3 mb-3">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr ${theme.gradient} flex items-center justify-center text-2xl shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
              <span>${theme.icon}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
                ${course.title}
              </h4>
              <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                <span class="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <i data-lucide="user" class="w-3 h-3 text-slate-500"></i> ${course.professor || '미지정'}
                </span>
                <span class="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 truncate max-w-[140px]">
                  <i data-lucide="map-pin" class="w-3 h-3 text-slate-500"></i> ${course.classroom || '미지정'}
                </span>
              </div>
            </div>
          </div>

          <!-- Schedule Chip -->
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mb-3 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-blue-400 flex-shrink-0"></i>
            <span class="truncate">시간: <b>${course.class_time || '미지정'}</b></span>
          </div>

          <!-- Evaluation Badges (Sorted Descending, 0% Excluded) -->
          <div class="flex flex-wrap items-center gap-1 mb-2">
            ${gradingItems.map(it => {
              const catIcon = getCategoryIcon(it.category);
              return `
                <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${catIcon.bg} ${catIcon.color} border ${catIcon.border} font-medium">
                  <i data-lucide="${catIcon.icon}" class="w-2.5 h-2.5"></i>
                  <span>${it.category}</span>
                  <b>${it.value}</b>
                </span>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-500">${(course.weekly || []).length}주차 강의계획</span>
          <span class="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            상세보기 <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ----------------------------------------------------------------------------
// Render 7-Day Timetable with Consecutive Period Merging (Rowspan)
// Days: 월, 화, 수, 목, 금, 토, 일
// 1교시 = 09:00 (1시간 간격, p교시 = p+8:00 ~ p+9:00)
// ----------------------------------------------------------------------------
function renderTimetable() {
  const tbody = document.getElementById('timetable-tbody');
  if (!tbody) return;

  const days = ['월', '화', '수', '목', '금', '토', '일'];

  // Collect and group contiguous blocks per day
  const blocksByDay = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': [] };
  let maxPeriod = 9;

  STATE.courses.forEach(course => {
    const schedules = parseSchedule(course.class_time);
    schedules.forEach(item => {
      if (!blocksByDay[item.day]) return;
      const sortedPeriods = item.periods;
      if (sortedPeriods.length === 0) return;

      let curStart = sortedPeriods[0];
      let curEnd = sortedPeriods[0];

      for (let i = 1; i < sortedPeriods.length; i++) {
        const p = sortedPeriods[i];
        if (p === curEnd + 1) {
          curEnd = p;
        } else {
          blocksByDay[item.day].push({
            start: curStart,
            end: curEnd,
            count: curEnd - curStart + 1,
            course: course
          });
          curStart = p;
          curEnd = p;
        }
      }
      blocksByDay[item.day].push({
        start: curStart,
        end: curEnd,
        count: curEnd - curStart + 1,
        course: course
      });

      sortedPeriods.forEach(p => {
        if (p > maxPeriod) maxPeriod = Math.min(14, Math.max(maxPeriod, p));
      });
    });
  });

  // Build lookups for cell rendering
  const startBlockMap = {};
  const coveredBlockMap = {};

  days.forEach(d => {
    blocksByDay[d].forEach(b => {
      startBlockMap[`${d}-${b.start}`] = b;
      for (let p = b.start + 1; p <= b.end; p++) {
        coveredBlockMap[`${d}-${p}`] = true;
      }
    });
  });

  // Build table rows from 1 to maxPeriod
  let rowsHtml = '';
  for (let p = 1; p <= maxPeriod; p++) {
    const startHour = String(p + 8).padStart(2, '0');
    const endHour = String(p + 9).padStart(2, '0');
    const timeLabel = `${startHour}:00 ~ ${endHour}:00`;

    let cellsHtml = '';
    for (const d of days) {
      const key = `${d}-${p}`;

      if (coveredBlockMap[key]) {
        // Omit td: spanned from earlier row!
        continue;
      }

      const block = startBlockMap[key];
      if (block) {
        const bStartH = String(block.start + 8).padStart(2, '0');
        const bEndH = String(block.end + 9).padStart(2, '0');
        const spanTimeLabel = `${bStartH}:00 ~ ${bEndH}:00 (${block.start}~${block.end}교시)`;
        const theme = getCourseTheme(block.course);

        const minHeightPx = Math.max(48, (block.count * 58) - 10);

        cellsHtml += `
          <td rowspan="${block.count}" class="p-1.5 border-r border-slate-800 last:border-r-0 align-top h-full">
            <div onclick="openCourseModal('${block.course.id}')" style="min-height: ${minHeightPx}px;" class="timetable-cell-block p-2.5 rounded-xl border ${theme.cellBg} transition-all duration-150 cursor-pointer text-left shadow-sm group h-full flex flex-col justify-between">
              <div>
                <div class="font-bold text-xs leading-snug truncate group-hover:underline flex items-center gap-1.5 mb-1.5">
                  <span class="text-base flex-shrink-0">${theme.icon}</span>
                  <span class="truncate">${block.course.title}</span>
                </div>
                <div class="text-[10px] opacity-85 space-y-0.5 mb-1">
                  <div class="truncate flex items-center gap-1">📍 ${block.course.classroom || '강의실 미지정'}</div>
                  <div class="truncate flex items-center gap-1">👤 ${block.course.professor || ''}</div>
                </div>
              </div>
              <div class="text-[10px] font-mono opacity-85 pt-1 border-t border-current/20 truncate mt-auto">
                ${spanTimeLabel}
              </div>
            </div>
          </td>
        `;
      } else {
        cellsHtml += `
          <td class="p-1 border-r border-slate-800 last:border-r-0 text-slate-700 text-[10px] h-[58px]">
            <div class="h-full min-h-[48px] rounded hover:bg-slate-900/40 transition-colors"></div>
          </td>
        `;
      }
    }

    rowsHtml += `
      <tr class="hover:bg-slate-900/20 transition-colors">
        <td class="py-2.5 px-2 border-r border-slate-800 text-slate-400 bg-slate-900/50 font-mono text-[11px] whitespace-nowrap sticky-col-cell">
          <div class="font-bold text-slate-200">${p}교시</div>
          <div class="text-[10px] text-slate-500">${timeLabel}</div>
        </td>
        ${cellsHtml}
      </tr>
    `;
  }

  tbody.innerHTML = rowsHtml;
  lucide.createIcons();
}

// ----------------------------------------------------------------------------
// Course Detail Modal
// ----------------------------------------------------------------------------
function openCourseModal(courseId) {
  const course = STATE.courses.find(c => c.id === courseId);
  if (!course) return;
  STATE.activeCourse = course;

  const theme = getCourseTheme(course);
  document.getElementById('modal-course-icon').textContent = theme.icon;
  document.getElementById('modal-course-title').textContent = course.title;
  document.getElementById('modal-course-prof').textContent = `담당교수: ${course.professor || '미지정'}`;
  
  document.getElementById('modal-classroom').textContent = course.classroom || '미지정';
  document.getElementById('modal-classtime').textContent = course.class_time || '미지정';
  document.getElementById('modal-prof-box').textContent = course.professor || '미지정';

  // Evaluation display
  const gradingItems = extractSortedGradingItems(course);
  const summaryEl = document.getElementById('modal-grading-summary');
  summaryEl.textContent = course.grading ? (course.grading.summary || '상세 비율 미지정') : '상세 비율 미지정';

  const barsContainer = document.getElementById('modal-grading-bars');
  const notes = (course.grading && course.grading.notes) ? course.grading.notes : {};

  if (gradingItems.length === 0) {
    barsContainer.innerHTML = `
      <div class="col-span-full py-3 text-center text-slate-500 text-xs">
        평가 항목이 등록되지 않았습니다.
      </div>
    `;
  } else {
    barsContainer.innerHTML = gradingItems.map(it => {
      const catIcon = getCategoryIcon(it.category);
      const memoText = notes[it.category] || '';
      const hasMemo = !!memoText.trim();
      return `
        <div onclick="openGradingMemoModal('${course.id}', '${it.category}', '${it.value}')" 
             class="group p-3 rounded-xl border ${catIcon.border} ${catIcon.bg} hover:border-blue-500/70 hover:bg-slate-800/80 flex flex-col justify-between cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]"
             title="클릭하여 ${it.category} 메모장 열기">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-semibold ${catIcon.color} flex items-center gap-1.5">
                <i data-lucide="${catIcon.icon}" class="w-3.5 h-3.5"></i>
                <span>${it.category}</span>
              </span>
              <span class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">${it.value}</span>
            </div>
            ${hasMemo ? `
              <div class="mb-2 flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 truncate" title="${memoText}">
                <i data-lucide="file-text" class="w-2.5 h-2.5 flex-shrink-0 text-amber-400"></i>
                <span class="truncate font-medium">${memoText}</span>
              </div>
            ` : `
              <div class="mb-2 flex items-center gap-1 text-[10px] text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                <i data-lucide="edit-3" class="w-2.5 h-2.5 text-slate-400"></i>
                <span>클릭하여 메모 작성</span>
              </div>
            `}
          </div>
          <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mt-1">
            <div class="bg-gradient-to-r ${theme.gradient} h-full rounded-full transition-all duration-500" style="width: ${it.percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4-Column Weekly Syllabus Table
  const tbody = document.getElementById('modal-weekly-tbody');
  const weekly = course.weekly || [];
  if (weekly.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500 text-xs">주차별 강의계획서가 등록되지 않았습니다.</td></tr>`;
  } else {
    tbody.innerHTML = weekly.map(w => `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-2.5 px-3 font-semibold text-blue-400 border-r border-slate-800/60 text-center whitespace-nowrap">${w.week || ''}</td>
        <td class="py-2.5 px-3 font-medium text-slate-100 border-r border-slate-800/60">${w.topic || w.title || '-'}</td>
        <td class="py-2.5 px-3 text-slate-300 border-r border-slate-800/60 leading-relaxed">${w.content || '-'}</td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px] leading-relaxed">${w.remarks || w.method || '-'}</td>
      </tr>
    `).join('');
  }

  // Original PDF link
  const pdfContainer = document.getElementById('modal-pdf-container');
  const pdfLink = document.getElementById('modal-pdf-link');
  if (course.pdf_filename) {
    pdfContainer.classList.remove('hidden');
    pdfLink.href = `/uploads/${encodeURIComponent(course.pdf_filename)}`;
  } else {
    pdfContainer.classList.add('hidden');
  }

  document.getElementById('course-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeCourseModal() {
  document.getElementById('course-modal').classList.add('hidden');
}

async function deleteCurrentCourse() {
  if (!STATE.activeCourse) return;
  if (!STATE.isLoggedIn) {
    openLoginModal(() => deleteCurrentCourse(), '강의를 삭제하려면 로그인이 필요합니다.');
    return;
  }
  if (!confirm(`'${STATE.activeCourse.title}' 강의를 목록에서 삭제하시겠습니까?`)) return;

  try {
    const res = await fetch(`/api/courses/${STATE.activeCourse.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      closeCourseModal();
      await loadCourses();
    } else {
      alert(`삭제 실패: ${data.error || '오류'}`);
    }
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

function editCurrentCourse() {
  if (!STATE.activeCourse) return;
  if (!STATE.isLoggedIn) {
    openLoginModal(() => editCurrentCourse(), '강의 정보를 수정하려면 로그인이 필요합니다.');
    return;
  }
  openReviewModal(STATE.activeCourse, true);
  closeCourseModal();
}

// ----------------------------------------------------------------------------
// PDF Dropzone & Upload
// ----------------------------------------------------------------------------
function initDropzone() {
  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => {
    if (!STATE.isLoggedIn) {
      openLoginModal(() => fileInput.click(), '강의계획서 PDF를 업로드하려면 로그인이 필요합니다.');
      return;
    }
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-blue-500', 'bg-blue-500/10');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-blue-500', 'bg-blue-500/10');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!STATE.isLoggedIn) {
        openLoginModal(() => uploadPdfFile(file), '강의계획서 PDF를 업로드하려면 로그인이 필요합니다.');
        return;
      }
      uploadPdfFile(file);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadPdfFile(e.target.files[0]);
    }
  });
}

async function uploadPdfFile(file) {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => uploadPdfFile(file), '강의계획서 PDF를 업로드하려면 로그인이 필요합니다.');
    return;
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('PDF 파일만 업로드 가능합니다.');
    return;
  }

  const statusBox = document.getElementById('upload-status');
  const statusText = document.getElementById('upload-status-text');
  statusBox.classList.remove('hidden');
  statusText.textContent = `'${file.name}' 업로드 및 강의계획서 파싱 중...`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    statusBox.classList.add('hidden');

    if (result.success && result.data) {
      openReviewModal(result.data, false);
    } else {
      alert(`PDF 분석 실패: ${result.error || '알 수 없는 오류'}`);
    }
  } catch (err) {
    statusBox.classList.add('hidden');
    alert(`파일 업로드 오류: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// Review & Edit Modal & Icon Picker
// ----------------------------------------------------------------------------
let currentReviewWeekly = [];

function initColorPickers() {
  // Course Color Picker in review modal
  const coursePicker = document.getElementById('course-color-picker');
  if (coursePicker) {
    coursePicker.innerHTML = PALETTE_COLORS.map(c => `
      <button type="button" onclick="selectCourseColor('${c.id}')" id="course-color-${c.id}" class="color-circle-btn ${c.bg} ${c.id === 'blue' ? 'selected' : ''}" title="${c.name}"></button>
    `).join('');
  }

  // Schedule Event Color Picker
  const schedPicker = document.getElementById('sched-color-picker');
  if (schedPicker) {
    schedPicker.innerHTML = PALETTE_COLORS.map(c => `
      <button type="button" onclick="selectSchedColor('${c.id}')" id="sched-color-${c.id}" class="color-circle-btn ${c.bg} ${c.id === 'blue' ? 'selected' : ''}" title="${c.name}"></button>
    `).join('');
  }

  // New Category Color Picker
  const catColorPicker = document.getElementById('new-cat-color-picker');
  if (catColorPicker) {
    catColorPicker.innerHTML = PALETTE_COLORS.map(c => `
      <button type="button" onclick="selectNewCatColor('${c.id}')" id="new-cat-color-${c.id}" class="color-circle-btn ${c.bg} ${c.id === 'purple' ? 'selected' : ''}" title="${c.name}"></button>
    `).join('');
  }
}

function renderIconPicker(selectedIcon = '📚') {
  const container = document.getElementById('course-icon-picker-grid');
  if (!container) return;

  const cat = STATE.activeIconCategory || 'all';
  let iconsToDisplay = [];
  if (cat === 'all') {
    Object.values(TAILORED_ICONS).forEach(list => iconsToDisplay.push(...list));
  } else if (TAILORED_ICONS[cat]) {
    iconsToDisplay = TAILORED_ICONS[cat];
  }

  // Deduplicate by icon string
  const seen = new Set();
  iconsToDisplay = iconsToDisplay.filter(it => {
    if (seen.has(it.icon)) return false;
    seen.add(it.icon);
    return true;
  });

  // If current selectedIcon is not in list, add it to beginning
  if (selectedIcon && !seen.has(selectedIcon)) {
    iconsToDisplay.unshift({ icon: selectedIcon, name: '현재 선택' });
  }

  container.innerHTML = iconsToDisplay.map(it => `
    <button type="button" onclick="selectCourseIcon('${it.icon}')" class="icon-picker-btn ${it.icon === selectedIcon ? 'selected' : ''}" title="${it.name}">
      <span>${it.icon}</span>
    </button>
  `).join('');
}

function selectCourseIcon(icon) {
  STATE.selectedCourseIcon = icon;
  const input = document.getElementById('form-icon');
  if (input) input.value = icon;
  const preview = document.getElementById('selected-icon-preview');
  if (preview) preview.textContent = icon;

  document.querySelectorAll('#course-icon-picker-grid .icon-picker-btn').forEach(btn => {
    if (btn.querySelector('span')?.textContent.trim() === icon) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
}

function filterIconCategory(catId) {
  STATE.activeIconCategory = catId;
  document.querySelectorAll('.icon-cat-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('bg-slate-900', 'text-slate-400');
  });
  const activeBtn = document.getElementById(`icon-cat-${catId}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    activeBtn.classList.remove('bg-slate-900', 'text-slate-400');
  }
  const curIcon = document.getElementById('form-icon')?.value || STATE.selectedCourseIcon || '📚';
  renderIconPicker(curIcon);
}

function selectCourseColor(colorId) {
  STATE.selectedCourseColor = colorId;
  const input = document.getElementById('form-color');
  if (input) input.value = colorId;

  document.querySelectorAll('#course-color-picker .color-circle-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  const activeBtn = document.getElementById(`course-color-${colorId}`);
  if (activeBtn) activeBtn.classList.add('selected');
}

function selectSchedColor(colorId) {
  STATE.selectedEventColor = colorId;
  const input = document.getElementById('sched-form-color');
  if (input) input.value = colorId;

  document.querySelectorAll('#sched-color-picker .color-circle-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  const activeBtn = document.getElementById(`sched-color-${colorId}`);
  if (activeBtn) activeBtn.classList.add('selected');
}

function selectNewCatColor(colorId) {
  STATE.selectedNewCatColor = colorId;
  const input = document.getElementById('new-cat-color');
  if (input) input.value = colorId;

  document.querySelectorAll('#new-cat-color-picker .color-circle-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  const activeBtn = document.getElementById(`new-cat-color-${colorId}`);
  if (activeBtn) activeBtn.classList.add('selected');
}

function openReviewModal(courseData, isEdit = false) {
  const modal = document.getElementById('review-modal');
  const title = document.getElementById('review-modal-title');
  title.textContent = isEdit ? '강의 정보 수정' : '강의계획서 분석 결과 확인 및 수정';

  document.getElementById('edit-course-id').value = courseData.id || '';
  document.getElementById('edit-pdf-filename').value = courseData.pdf_filename || '';
  document.getElementById('form-title').value = courseData.title || '';
  document.getElementById('form-prof').value = courseData.professor || '';
  document.getElementById('form-classroom').value = courseData.classroom || '';
  document.getElementById('form-classtime').value = courseData.class_time || '';

  const gradingSummary = courseData.grading ? (courseData.grading.summary || '') : '';
  document.getElementById('form-grading').value = gradingSummary;

  // Set Icon & Color
  const initIcon = courseData.icon || getCourseTheme(courseData).icon || '📚';
  selectCourseIcon(initIcon);
  renderIconPicker(initIcon);

  const initColor = courseData.color || 'blue';
  selectCourseColor(initColor);

  // Weekly rows
  currentReviewWeekly = (courseData.weekly || []).map((w, idx) => ({
    week: w.week || `${idx + 1}주차`,
    topic: w.topic || w.title || '',
    content: w.content || '',
    remarks: w.remarks || w.method || '-'
  }));

  renderWeeklyEditorList();

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function openManualCourseModal() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => openManualCourseModal(), '신규 강의를 추가하려면 로그인이 필요합니다.');
    return;
  }
  openReviewModal({
    id: '',
    title: '',
    icon: '📚',
    professor: '',
    classroom: '',
    class_time: '',
    color: 'blue',
    grading: { summary: '과제 40%, 중간고사 30%, 기말고사 30%' },
    weekly: Array.from({ length: 15 }, (_, i) => ({
      week: `${i + 1}주차`,
      topic: i === 0 ? '오리엔테이션' : (i === 7 ? '중간고사' : (i === 14 ? '기말고사' : `제 ${i + 1}강 학습 주제`)),
      content: '강의 세부 학습 내용',
      remarks: '-'
    }))
  }, false);
}

function renderWeeklyEditorList() {
  const list = document.getElementById('weekly-editor-list');
  if (!list) return;

  list.innerHTML = currentReviewWeekly.map((w, idx) => `
    <div class="grid grid-cols-12 gap-1.5 bg-slate-900 p-2 rounded border border-slate-800 text-[11px] items-center">
      <span class="col-span-2 font-bold text-blue-400 text-center">${w.week}</span>
      <input type="text" placeholder="강의주제" value="${w.topic || ''}" onchange="updateWeekField(${idx}, 'topic', this.value)" class="col-span-3 px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 font-medium">
      <input type="text" placeholder="상세 강의내용" value="${w.content || ''}" onchange="updateWeekField(${idx}, 'content', this.value)" class="col-span-4 px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200">
      <input type="text" placeholder="과제/참고사항" value="${w.remarks || ''}" onchange="updateWeekField(${idx}, 'remarks', this.value)" class="col-span-2 px-1.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
      <button onclick="removeWeekRow(${idx})" class="col-span-1 text-red-400 hover:text-red-300 p-1 flex justify-center"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
    </div>
  `).join('');

  lucide.createIcons();
}

function updateWeekField(idx, field, value) {
  if (currentReviewWeekly[idx]) {
    currentReviewWeekly[idx][field] = value;
  }
}

function removeWeekRow(idx) {
  currentReviewWeekly.splice(idx, 1);
  renderWeeklyEditorList();
}

function addWeekRow() {
  const nextWeekNum = currentReviewWeekly.length + 1;
  currentReviewWeekly.push({
    week: `${nextWeekNum}주차`,
    topic: '',
    content: '',
    remarks: '-'
  });
  renderWeeklyEditorList();
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
}

async function saveCourseFromReview() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => saveCourseFromReview(), '강의 정보를 저장하려면 로그인이 필요합니다.');
    return;
  }
  const title = document.getElementById('form-title').value.trim();
  if (!title) {
    alert('과목명을 입력해주세요.');
    return;
  }

  const courseData = {
    id: document.getElementById('edit-course-id').value || undefined,
    pdf_filename: document.getElementById('edit-pdf-filename').value || '',
    title: title,
    icon: document.getElementById('form-icon').value || STATE.selectedCourseIcon || '📚',
    professor: document.getElementById('form-prof').value.trim(),
    classroom: document.getElementById('form-classroom').value.trim(),
    class_time: document.getElementById('form-classtime').value.trim(),
    color: STATE.selectedCourseColor || 'blue',
    grading: {
      summary: document.getElementById('form-grading').value.trim()
    },
    weekly: currentReviewWeekly
  };

  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    const result = await res.json();
    if (result.success) {
      closeReviewModal();
      await loadCourses();
      openCourseModal(result.course.id);
    } else {
      alert('저장 중 오류가 발생했습니다.');
    }
  } catch (err) {
    alert(`저장 오류: ${err.message}`);
  }
}

// ============================================================================
// 5. Schedule Engine (Month & Week Views, Automatic Course Sync, CRUD)
// ============================================================================

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      STATE.categories = data.categories;
      // Initialize selectedScheduleCategories with all categories if empty
      if (!STATE.selectedScheduleCategories || STATE.selectedScheduleCategories.length === 0) {
        STATE.selectedScheduleCategories = STATE.categories.map(c => c.id);
      } else {
        // Ensure any new system categories (like cat-academic) are auto-checked
        STATE.categories.forEach(c => {
          if (c.is_system && !STATE.selectedScheduleCategories.includes(c.id)) {
            STATE.selectedScheduleCategories.push(c.id);
          }
        });
      }
      populateCategoryDropdowns();
      renderCategoryCheckboxes();
      renderCategoryList();
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function populateCategoryDropdowns() {
  const formSelect = document.getElementById('sched-form-category');
  if (formSelect) {
    formSelect.innerHTML = STATE.categories.map(c => `
      <option value="${c.id}" class="bg-slate-900">${c.name}</option>
    `).join('');
  }
}

function renderCategoryCheckboxes() {
  const container = document.getElementById('schedule-category-checkbox-list');
  const toggleAllBtn = document.getElementById('btn-toggle-all-cats');
  if (!container) return;

  const allSelected = STATE.categories.length > 0 && STATE.categories.every(c => STATE.selectedScheduleCategories.includes(c.id));
  if (toggleAllBtn) {
    toggleAllBtn.textContent = allSelected ? '전체 해제' : '전체 선택';
  }

  container.innerHTML = STATE.categories.map(c => {
    const isChecked = STATE.selectedScheduleCategories.includes(c.id);
    const theme = COLOR_THEMES[c.color] || COLOR_THEMES.blue;

    return `
      <label class="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/70 border ${isChecked ? 'border-slate-700/90 bg-slate-950 shadow-sm' : 'border-slate-800/40 opacity-55 hover:opacity-85'} cursor-pointer transition select-none group">
        <div class="flex items-center gap-2.5 min-w-0">
          <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="toggleCategoryFilter('${c.id}', this.checked)" class="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer">
          <span class="w-2.5 h-2.5 rounded-full ${theme.gradient.replace('from-', 'bg-').split(' ')[0]} flex-shrink-0"></span>
          <span class="text-xs font-semibold text-slate-200 group-hover:text-white truncate">${c.name}</span>
        </div>
      </label>
    `;
  }).join('');

  lucide.createIcons();
}

function toggleCategoryFilter(catId, isChecked) {
  if (isChecked) {
    if (!STATE.selectedScheduleCategories.includes(catId)) {
      STATE.selectedScheduleCategories.push(catId);
    }
  } else {
    STATE.selectedScheduleCategories = STATE.selectedScheduleCategories.filter(id => id !== catId);
  }
  renderCategoryCheckboxes();
  renderSchedule();
}

function toggleAllScheduleCategories() {
  const allSelected = STATE.categories.length > 0 && STATE.categories.every(c => STATE.selectedScheduleCategories.includes(c.id));
  if (allSelected) {
    STATE.selectedScheduleCategories = [];
  } else {
    STATE.selectedScheduleCategories = STATE.categories.map(c => c.id);
  }
  renderCategoryCheckboxes();
  renderSchedule();
}

async function loadSchedules() {
  try {
    const res = await fetch('/api/schedules');
    const data = await res.json();
    if (data.success) {
      STATE.schedules = data.schedules;
      renderSchedule();
    }
  } catch (err) {
    console.error('Failed to load schedules:', err);
  }
}

function setScheduleViewMode(mode) {
  STATE.scheduleViewMode = mode;

  document.querySelectorAll('.sched-view-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-blue-600', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`sched-view-${mode}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }

  const monthView = document.getElementById('schedule-month-view');
  const weekView = document.getElementById('schedule-week-view');

  if (mode === 'month') {
    monthView.classList.remove('hidden');
    weekView.classList.add('hidden');
  } else {
    monthView.classList.add('hidden');
    weekView.classList.remove('hidden');
  }

  renderSchedule();
}

function navigateScheduleDate(delta) {
  if (STATE.scheduleViewMode === 'month') {
    STATE.currentDate.setMonth(STATE.currentDate.getMonth() + delta);
  } else {
    STATE.currentDate.setDate(STATE.currentDate.getDate() + delta * 7);
  }
  renderSchedule();
}

function goToScheduleToday() {
  STATE.currentDate = new Date();
  renderSchedule();
}

/**
 * Generate synthetic recurring course events for a given date range
 * All courses are rendered with unified color (cat-course) as requested!
 */
function getCourseEventsForRange(startDate, endDate) {
  const courseEvents = [];
  const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

  const courseCat = STATE.categories.find(c => c.id === 'cat-course');
  const uniformCourseColor = courseCat ? courseCat.color : 'blue';

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const curDayOfWeek = cur.getDay();
    const dateStr = formatDateYMD(cur);

    STATE.courses.forEach(course => {
      const schedules = parseSchedule(course.class_time);
      schedules.forEach(item => {
        if (dayMap[item.day] === curDayOfWeek) {
          const sortedPeriods = item.periods;
          if (sortedPeriods.length > 0) {
            const startH = Math.min(...sortedPeriods) + 8;
            const endH = Math.max(...sortedPeriods) + 9;
            const startTimeStr = `${String(startH).padStart(2, '0')}:00`;
            const endTimeStr = `${String(endH).padStart(2, '0')}:00`;
            const periodRangeStr = `${Math.min(...sortedPeriods)}~${Math.max(...sortedPeriods)}교시`;

            courseEvents.push({
              id: `course-${course.id}-${dateStr}`,
              title: course.title,
              is_course: true,
              course_id: course.id,
              date: dateStr,
              start_time: startTimeStr,
              end_time: endTimeStr,
              is_all_day: false,
              color: uniformCourseColor, // Unified course color across entire schedule
              category_id: 'cat-course',
              memo: `${course.classroom || '강의실 미지정'} (${course.professor || ''}) - ${periodRangeStr}`
            });
          }
        }
      });
    });

    cur.setDate(cur.getDate() + 1);
  }

  return courseEvents;
}

function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderSchedule() {
  const periodTitle = document.getElementById('schedule-current-period-title');

  if (STATE.scheduleViewMode === 'month') {
    const y = STATE.currentDate.getFullYear();
    const m = STATE.currentDate.getMonth() + 1;
    if (periodTitle) periodTitle.textContent = `${y}년 ${m}월`;
    renderScheduleMonth();
  } else {
    const weekStart = getWeekStartDate(STATE.currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const m1 = weekStart.getMonth() + 1;
    const d1 = weekStart.getDate();
    const m2 = weekEnd.getMonth() + 1;
    const d2 = weekEnd.getDate();
    if (periodTitle) periodTitle.textContent = `${weekStart.getFullYear()}년 ${m1}월 ${d1}일 ~ ${m2}월 ${d2}일`;
    renderScheduleWeek();
  }

  lucide.createIcons();
}

function getWeekStartDate(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - day; // Align to Sunday
  return new Date(date.setDate(diff));
}

// ----------------------------------------------------------------------------
// Schedule: Month View Rendering (With Continuous Multi-day Connected Ribbons)
// ----------------------------------------------------------------------------
function renderScheduleMonth() {
  const container = document.getElementById('schedule-month-view');
  if (!container) return;

  const year = STATE.currentDate.getFullYear();
  const month = STATE.currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 (Sun) ~ 6 (Sat)
  const totalDays = lastDay.getDate();

  // Range for generating course events
  const calendarStartDate = new Date(year, month, 1 - startDayOfWeek);
  const calendarEndDate = new Date(calendarStartDate);
  calendarEndDate.setDate(calendarEndDate.getDate() + 41); // 6 weeks = 42 cells

  const courseEvents = getCourseEventsForRange(calendarStartDate, calendarEndDate);
  let allEvents = [...STATE.schedules, ...courseEvents];

  const activeCategorySet = new Set(STATE.selectedScheduleCategories || []);
  allEvents = allEvents.filter(ev => activeCategorySet.has(ev.category_id));

  // Populate events per day (expanding multi-day events across spans)
  const eventMap = {};
  allEvents.forEach(ev => {
    if (!ev.date) return;
    if (ev.end_date && ev.end_date > ev.date) {
      let cur = new Date(ev.date + 'T00:00:00');
      const endD = new Date(ev.end_date + 'T00:00:00');
      while (cur <= endD) {
        const curYMD = formatDateYMD(cur);
        if (!eventMap[curYMD]) eventMap[curYMD] = [];
        eventMap[curYMD].push({
          ...ev,
          isMultiDay: true,
          spanStart: ev.date,
          spanEnd: ev.end_date
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if (!eventMap[ev.date]) eventMap[ev.date] = [];
      eventMap[ev.date].push(ev);
    }
  });

  const todayStr = formatDateYMD(new Date());

  let cellsHtml = '';
  const cellDate = new Date(calendarStartDate);

  for (let i = 0; i < 42; i++) {
    const dStr = formatDateYMD(cellDate);
    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = dStr === todayStr;
    const dayNum = cellDate.getDate();
    const dayOfWeek = cellDate.getDay();

    const dayEvents = eventMap[dStr] || [];

    dayEvents.sort((a, b) => {
      if (a.isMultiDay && !b.isMultiDay) return -1;
      if (!a.isMultiDay && b.isMultiDay) return 1;
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    let dayNumClass = 'text-slate-300 font-semibold';
    if (!isCurrentMonth) dayNumClass = 'text-slate-600';
    else if (dayOfWeek === 0) dayNumClass = 'text-rose-400 font-bold';
    else if (dayOfWeek === 6) dayNumClass = 'text-indigo-400 font-bold';

    cellsHtml += `
      <div onclick="handleMonthCellClick('${dStr}')" class="calendar-day-cell p-1.5 sm:p-2 border border-slate-800/80 bg-slate-950/50 rounded-xl flex flex-col justify-between cursor-pointer ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs ${dayNumClass} ${isToday ? 'px-1.5 py-0.5 rounded-full bg-blue-600 text-white' : ''}">
              ${dayNum}
            </span>
            ${dayEvents.length > 0 ? `<span class="text-[10px] text-slate-500 font-mono">${dayEvents.length}</span>` : ''}
          </div>

          <!-- Events Chips List with Continuous Multi-day Connected Ribbons (Render All Events) -->
          <div class="space-y-1">
            ${dayEvents.map(ev => {
              const theme = COLOR_THEMES[ev.color] || COLOR_THEMES.blue;
              const isCourse = !!ev.is_course;
              const clickFn = isCourse 
                ? `event.stopPropagation(); openCourseModal('${ev.course_id}')` 
                : `event.stopPropagation(); openScheduleEventModalById('${ev.id}')`;

              let ribbonClass = 'rounded-md';
              let isRibbonStart = true;

              if (ev.isMultiDay) {
                const isEventStart = (dStr === ev.spanStart);
                const isEventEnd = (dStr === ev.spanEnd);
                const isWeekStart = (dayOfWeek === 0);
                const isWeekEnd = (dayOfWeek === 6);

                const segmentStart = isEventStart || isWeekStart;
                const segmentEnd = isEventEnd || isWeekEnd;

                isRibbonStart = segmentStart;

                if (segmentStart && segmentEnd) {
                  ribbonClass = 'rounded-md';
                } else if (segmentStart && !segmentEnd) {
                  ribbonClass = 'event-ribbon-start rounded-l-md';
                } else if (!segmentStart && segmentEnd) {
                  ribbonClass = 'event-ribbon-end rounded-r-md';
                } else {
                  ribbonClass = 'event-ribbon-mid';
                }
              }

              return `
                <div onclick="${clickFn}" class="text-[10px] px-1.5 py-0.5 ${ribbonClass} ${theme.chipBg} truncate font-medium flex items-center gap-1 hover:brightness-125 transition cursor-pointer" title="${ev.title}${ev.spanEnd ? ` (${ev.spanStart} ~ ${ev.spanEnd})` : (ev.start_time ? ` (${ev.start_time})` : '')}">
                  ${isRibbonStart ? `
                    <span class="w-1.5 h-1.5 rounded-full ${theme.gradient.replace('from-', 'bg-').split(' ')[0]} flex-shrink-0"></span>
                    <span class="truncate">${ev.is_all_day || ev.isMultiDay ? '' : `<b class="font-normal opacity-75">${ev.start_time || ''}</b> `}${ev.title}</span>
                  ` : `
                    <span class="truncate opacity-75 text-[9px]">${ev.title}</span>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    cellDate.setDate(cellDate.getDate() + 1);
  }

  container.innerHTML = `
    <div class="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-semibold">
      <div class="py-1 text-rose-400">일 (Sun)</div>
      <div class="py-1 text-slate-400">월 (Mon)</div>
      <div class="py-1 text-slate-400">화 (Tue)</div>
      <div class="py-1 text-slate-400">수 (Wed)</div>
      <div class="py-1 text-slate-400">목 (Thu)</div>
      <div class="py-1 text-slate-400">금 (Fri)</div>
      <div class="py-1 text-indigo-400">토 (Sat)</div>
    </div>
    <div class="grid grid-cols-7 gap-1.5">
      ${cellsHtml}
    </div>
  `;
}

function handleMonthCellClick(dateStr) {
  openScheduleEventModal(null, dateStr);
}

// ----------------------------------------------------------------------------
// Schedule: Week View Rendering (06:00 ~ 21:00 Timeline + Top Unscheduled Slot)
// ----------------------------------------------------------------------------
function renderScheduleWeek() {
  const container = document.getElementById('schedule-week-view');
  if (!container) return;

  const weekStart = getWeekStartDate(STATE.currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const courseEvents = getCourseEventsForRange(weekStart, weekEnd);
  let allEvents = [...STATE.schedules, ...courseEvents];

  const activeCategorySet = new Set(STATE.selectedScheduleCategories || []);
  allEvents = allEvents.filter(ev => activeCategorySet.has(ev.category_id));

  const weekDays = [];
  const daysNames = ['일', '월', '화', '수', '목', '금', '토'];
  const todayStr = formatDateYMD(new Date());

  for (let i = 0; i < 7; i++) {
    const cur = new Date(weekStart);
    cur.setDate(cur.getDate() + i);
    const dStr = formatDateYMD(cur);
    weekDays.push({
      dateStr: dStr,
      dayNum: cur.getDate(),
      monthNum: cur.getMonth() + 1,
      dayOfWeek: cur.getDay(),
      dayName: daysNames[cur.getDay()],
      isToday: dStr === todayStr
    });
  }

  // Populate events per day (handling multi-day spans)
  const eventMap = {};
  allEvents.forEach(ev => {
    if (!ev.date) return;
    if (ev.end_date && ev.end_date > ev.date) {
      let cur = new Date(ev.date + 'T00:00:00');
      const endD = new Date(ev.end_date + 'T00:00:00');
      while (cur <= endD) {
        const dStr = formatDateYMD(cur);
        if (!eventMap[dStr]) eventMap[dStr] = [];
        eventMap[dStr].push({ ...ev, isMultiDay: true, spanStart: ev.date, spanEnd: ev.end_date });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if (!eventMap[ev.date]) eventMap[ev.date] = [];
      eventMap[ev.date].push(ev);
    }
  });

  // Categorize events into unscheduled / all-day vs timed (06:00 ~ 21:00)
  const unscheduledByDay = {};
  const startHourMap = {};
  const coveredHourMap = {};

  weekDays.forEach(wd => {
    const dStr = wd.dateStr;
    unscheduledByDay[dStr] = [];
    const evList = eventMap[dStr] || [];

    evList.forEach(ev => {
      let isTimed = false;
      if (!ev.is_all_day && !ev.isMultiDay && ev.start_time) {
        const m = ev.start_time.match(/^(\d{1,2}):(\d{2})/);
        if (m) {
          const h = parseInt(m[1], 10);
          if (h >= 6 && h <= 21) {
            isTimed = true;
            let endH = h + 1;
            if (ev.end_time) {
              const em = ev.end_time.match(/^(\d{1,2}):(\d{2})/);
              if (em) {
                const rawEndH = parseInt(em[1], 10);
                const rawEndM = parseInt(em[2], 10);
                endH = Math.max(h + 1, rawEndH + (rawEndM > 20 ? 1 : 0));
              }
            }
            endH = Math.min(22, endH);
            const duration = Math.max(1, endH - h);

            const key = `${dStr}-${h}`;
            if (!startHourMap[key]) startHourMap[key] = [];
            startHourMap[key].push({ ...ev, startHour: h, endHour: endH, duration });

            for (let covered = h + 1; covered < endH && covered <= 21; covered++) {
              coveredHourMap[`${dStr}-${covered}`] = true;
            }
          }
        }
      }

      if (!isTimed) {
        unscheduledByDay[dStr].push(ev);
      }
    });
  });

  // Render Timetable Grid (Fits 100% of the screen width so all 7 days are visible at once)
  let html = `
    <div class="w-full mobile-touch-scroll rounded-xl border border-slate-800 bg-slate-950/70 shadow-inner overflow-hidden">
      <table class="w-full text-xs border-collapse table-fixed">
        <thead>
          <tr class="bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
            <th style="width: 50px;" class="py-2.5 px-1 border-r border-slate-800 text-center bg-slate-900 text-slate-400 text-[10px] sm:text-[11px] font-semibold sticky-col-header">시간</th>
            ${weekDays.map(wd => {
              let color = 'text-slate-200';
              if (wd.dayOfWeek === 0) color = 'text-rose-400';
              if (wd.dayOfWeek === 6) color = 'text-indigo-400';
              return `
                <th style="width: calc((100% - 50px) / 7);" class="py-2 px-0.5 sm:px-1 border-r border-slate-800 last:border-r-0 text-center ${wd.isToday ? 'bg-blue-600/15' : ''}">
                  <div class="text-[11px] sm:text-xs font-semibold ${color} truncate">
                    <span class="hidden sm:inline">${wd.dayName}요일</span>
                    <span class="sm:hidden">${wd.dayName}</span>
                  </div>
                  <div class="text-[10px] sm:text-xs font-bold ${wd.isToday ? 'text-blue-400' : 'text-white'} truncate">${wd.monthNum}/${wd.dayNum}</div>
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          <!-- 1. Unscheduled / All-Day Row (Top row above 06:00) -->
          <tr class="week-allday-slot bg-slate-900/40 border-b-2 border-slate-800">
            <td style="width: 50px;" class="p-1 border-r border-slate-800 text-[9px] sm:text-[10px] font-semibold text-slate-400 bg-slate-900/70 text-center align-middle whitespace-nowrap">
              <div class="flex flex-col items-center">
                <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-400 mb-0.5"></i>
                <span>종일</span>
              </div>
            </td>
            ${weekDays.map(wd => {
              const dStr = wd.dateStr;
              const evs = unscheduledByDay[dStr] || [];
              return `
                <td style="width: calc((100% - 50px) / 7);" class="p-1 border-r border-slate-800 last:border-r-0 align-top ${wd.isToday ? 'bg-blue-600/5' : ''}">
                  <div class="space-y-1 min-h-[32px]">
                    ${evs.map(ev => {
                      const theme = COLOR_THEMES[ev.color] || COLOR_THEMES.blue;
                      const isCourse = !!ev.is_course;
                      const clickFn = isCourse 
                        ? `event.stopPropagation(); openCourseModal('${ev.course_id}')` 
                        : `event.stopPropagation(); openScheduleEventModalById('${ev.id}')`;
                      return `
                        <div onclick="${clickFn}" class="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${theme.chipBg} font-medium flex items-center gap-1 shadow-sm hover:brightness-125 transition cursor-pointer overflow-hidden" title="${ev.title}">
                          <span class="w-1.5 h-1.5 rounded-full ${theme.gradient.replace('from-', 'bg-').split(' ')[0]} flex-shrink-0"></span>
                          <span class="truncate font-semibold">${ev.title}</span>
                        </div>
                      `;
                    }).join('')}
                    ${evs.length === 0 ? `
                      <div onclick="openScheduleEventModal(null, '${dStr}', null, true)" class="h-full min-h-[26px] rounded hover:bg-slate-800/40 flex items-center justify-center text-slate-700 hover:text-blue-400 cursor-pointer text-[10px] transition">
                        +
                      </div>
                    ` : ''}
                  </div>
                </td>
              `;
            }).join('')}
          </tr>
  `;

  // 2. 06:00 to 21:00 Hourly Rows
  for (let h = 6; h <= 21; h++) {
    const hStr = `${String(h).padStart(2, '0')}:00`;

    html += `
      <tr class="hover:bg-slate-900/10 transition-colors">
        <td style="width: 50px;" class="py-1 px-0.5 border-r border-b border-slate-800 text-slate-400 bg-slate-900/50 font-mono text-[9px] sm:text-[10px] text-center whitespace-nowrap align-top">
          <div class="font-bold text-slate-300">${hStr}</div>
        </td>
    `;

    for (const wd of weekDays) {
      const dStr = wd.dateStr;
      const key = `${dStr}-${h}`;

      if (coveredHourMap[key]) {
        continue;
      }

      const eventsAtHour = startHourMap[key] || [];

      if (eventsAtHour.length > 0) {
        const primaryEv = eventsAtHour[0];
        const span = primaryEv.duration || 1;
        const minHeightPx = Math.max(30, (span * 36) - 4);

        html += `
          <td rowspan="${span}" style="width: calc((100% - 50px) / 7);" class="p-0.5 sm:p-1 border-r border-b border-slate-800 last:border-r-0 align-top h-full ${wd.isToday ? 'bg-blue-600/5' : ''}">
            <div class="space-y-1 h-full">
              ${eventsAtHour.map(ev => {
                const theme = COLOR_THEMES[ev.color] || COLOR_THEMES.blue;
                const isCourse = !!ev.is_course;
                const clickFn = isCourse 
                  ? `event.stopPropagation(); openCourseModal('${ev.course_id}')` 
                  : `event.stopPropagation(); openScheduleEventModalById('${ev.id}')`;
                return `
                  <div onclick="${clickFn}" style="min-height: ${minHeightPx}px;" class="p-1 sm:p-1.5 rounded-lg border ${theme.cellBg} flex flex-col justify-between shadow-sm hover:brightness-125 transition cursor-pointer group text-left overflow-hidden">
                    <div>
                      <div class="flex items-center justify-between mb-0.5 gap-0.5">
                        <span class="text-[8px] sm:text-[9px] font-mono px-1 rounded bg-black/40 text-slate-300 truncate">
                          ${ev.start_time || ''}
                        </span>
                        ${isCourse ? `<span class="text-[8px] px-1 rounded bg-blue-500/20 text-blue-300 font-semibold flex-shrink-0">수강</span>` : ''}
                      </div>
                      <div class="font-bold text-[9px] sm:text-[11px] leading-tight group-hover:underline text-white truncate">
                        ${ev.title}
                      </div>
                    </div>
                    ${ev.memo ? `<div class="text-[8px] sm:text-[9px] opacity-75 truncate mt-auto pt-0.5 border-t border-current/20">${ev.memo}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </td>
        `;
      } else {
        html += `
          <td onclick="openScheduleEventModal(null, '${dStr}', ${h}, false)" style="width: calc((100% - 50px) / 7);" class="p-0.5 border-r border-b border-slate-800/40 last:border-r-0 h-[34px] sm:h-[38px] ${wd.isToday ? 'bg-blue-600/5' : ''} hover:bg-slate-900/40 cursor-pointer transition">
            <div class="h-full min-h-[26px] rounded flex items-center justify-center text-slate-700 hover:text-blue-400 opacity-0 hover:opacity-100 text-[10px] font-semibold">+</div>
          </td>
        `;
      }
    }

    html += `</tr>`;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
  lucide.createIcons();
}

// ----------------------------------------------------------------------------
// Schedule: Event Modal Handling (With End Date for Multi-day Spans)
// ----------------------------------------------------------------------------
function openScheduleEventModal(event = null, defaultDate = null, defaultHour = null, defaultAllDay = false) {
  if (!event && !STATE.isLoggedIn) {
    openLoginModal(() => {
      openScheduleEventModal(null, defaultDate, defaultHour, defaultAllDay);
    }, '새 일정을 등록하려면 로그인이 필요합니다.');
    return;
  }

  const modal = document.getElementById('schedule-event-modal');
  const title = document.getElementById('sched-modal-title');
  const deleteBtn = document.getElementById('sched-btn-delete');

  populateCategoryDropdowns();

  if (event) {
    title.textContent = '일정 수정';
    deleteBtn.classList.remove('hidden');

    document.getElementById('sched-form-id').value = event.id || '';
    document.getElementById('sched-form-title').value = event.title || '';
    document.getElementById('sched-form-category').value = event.category_id || 'cat-personal';
    document.getElementById('sched-form-date').value = event.date || '';
    document.getElementById('sched-form-end-date').value = event.end_date || '';
    document.getElementById('sched-form-allday').checked = !!event.is_all_day;
    document.getElementById('sched-form-start').value = event.start_time || '09:00';
    document.getElementById('sched-form-end').value = event.end_time || '10:00';
    document.getElementById('sched-form-memo').value = event.memo || '';

    selectSchedColor(event.color || 'blue');
    toggleScheduleAllDay(!!event.is_all_day);
  } else {
    title.textContent = '새 일정 등록';
    deleteBtn.classList.add('hidden');

    document.getElementById('sched-form-id').value = '';
    document.getElementById('sched-form-title').value = '';
    document.getElementById('sched-form-category').value = 'cat-personal';
    document.getElementById('sched-form-date').value = defaultDate || formatDateYMD(new Date());
    document.getElementById('sched-form-end-date').value = '';
    document.getElementById('sched-form-allday').checked = !!defaultAllDay;

    if (defaultHour !== null && defaultHour !== undefined) {
      const sH = String(defaultHour).padStart(2, '0');
      const eH = String(Math.min(23, defaultHour + 1)).padStart(2, '0');
      document.getElementById('sched-form-start').value = `${sH}:00`;
      document.getElementById('sched-form-end').value = `${eH}:00`;
    } else {
      document.getElementById('sched-form-start').value = '09:00';
      document.getElementById('sched-form-end').value = '10:00';
    }

    document.getElementById('sched-form-memo').value = '';

    selectSchedColor('blue');
    toggleScheduleAllDay(!!defaultAllDay);
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function openScheduleEventModalById(eventId) {
  const event = STATE.schedules.find(e => e.id === eventId);
  if (event) {
    openScheduleEventModal(event);
  }
}

function closeScheduleEventModal() {
  document.getElementById('schedule-event-modal').classList.add('hidden');
}

function toggleScheduleAllDay(isAllDay) {
  const timeContainer = document.getElementById('sched-time-inputs');
  if (timeContainer) {
    if (isAllDay) timeContainer.classList.add('opacity-40', 'pointer-events-none');
    else timeContainer.classList.remove('opacity-40', 'pointer-events-none');
  }
}

async function saveScheduleEventFromModal() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => saveScheduleEventFromModal(), '일정을 저장하거나 수정하려면 로그인이 필요합니다.');
    return;
  }
  const title = document.getElementById('sched-form-title').value.trim();
  const date = document.getElementById('sched-form-date').value;
  const endDate = document.getElementById('sched-form-end-date').value;

  if (!title) {
    alert('일정 제목을 입력해주세요.');
    return;
  }
  if (!date) {
    alert('날짜를 선택해주세요.');
    return;
  }
  if (endDate && endDate < date) {
    alert('종료일은 시작일보다 이전일 수 없습니다.');
    return;
  }

  const isAllDay = document.getElementById('sched-form-allday').checked;
  const eventId = document.getElementById('sched-form-id').value;

  const payload = {
    title: title,
    category_id: document.getElementById('sched-form-category').value,
    date: date,
    end_date: endDate || undefined,
    is_all_day: isAllDay,
    start_time: isAllDay ? '' : document.getElementById('sched-form-start').value,
    end_time: isAllDay ? '' : document.getElementById('sched-form-end').value,
    color: STATE.selectedEventColor || 'blue',
    memo: document.getElementById('sched-form-memo').value.trim()
  };

  try {
    let res;
    if (eventId) {
      res = await fetch(`/api/schedules/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (data.success) {
      closeScheduleEventModal();
      await loadSchedules();
    } else {
      alert(`저장 실패: ${data.error || '오류 발생'}`);
    }
  } catch (err) {
    alert(`네트워크 오류: ${err.message}`);
  }
}

async function deleteScheduleFromModal() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => deleteScheduleFromModal(), '일정을 삭제하려면 로그인이 필요합니다.');
    return;
  }
  const eventId = document.getElementById('sched-form-id').value;
  if (!eventId) return;

  if (!confirm('이 일정을 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/schedules/${eventId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      closeScheduleEventModal();
      await loadSchedules();
    }
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ----------------------------------------------------------------------------
// Schedule: Category Modal Handling
// ----------------------------------------------------------------------------
function openCategoryModal() {
  const modal = document.getElementById('schedule-category-modal');
  renderCategoryList();
  selectNewCatColor('purple');
  document.getElementById('new-cat-name').value = '';
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeCategoryModal() {
  document.getElementById('schedule-category-modal').classList.add('hidden');
}

function renderCategoryList() {
  const container = document.getElementById('category-list-container');
  if (!container) return;

  container.innerHTML = STATE.categories.map(c => {
    const theme = COLOR_THEMES[c.color] || COLOR_THEMES.blue;
    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full ${theme.gradient.replace('from-', 'bg-').split(' ')[0]}"></span>
          <span class="font-semibold text-white text-xs">${c.name}</span>
          ${c.is_system ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">기본</span>` : ''}
        </div>
        ${c.is_system ? '' : `
          <button onclick="deleteCategory('${c.id}')" class="text-red-400 hover:text-red-300 p-1 transition" title="삭제">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        `}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

async function createNewCategory() {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => createNewCategory(), '새 카테고리를 추가하려면 로그인이 필요합니다.');
    return;
  }
  const nameInput = document.getElementById('new-cat-name');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    alert('카테고리 이름을 입력해주세요.');
    return;
  }

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        color: STATE.selectedNewCatColor || 'purple'
      })
    });
    const data = await res.json();
    if (data.success) {
      nameInput.value = '';
      if (data.category && data.category.id) {
        if (!STATE.selectedScheduleCategories.includes(data.category.id)) {
          STATE.selectedScheduleCategories.push(data.category.id);
        }
      }
      await loadCategories();
    } else {
      alert(`생성 실패: ${data.error || '오류'}`);
    }
  } catch (err) {
    alert(`네트워크 오류: ${err.message}`);
  }
}

async function deleteCategory(catId) {
  if (!STATE.isLoggedIn) {
    openLoginModal(() => deleteCategory(catId), '카테고리를 삭제하려면 로그인이 필요합니다.');
    return;
  }
  if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;

  try {
    const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      STATE.selectedScheduleCategories = STATE.selectedScheduleCategories.filter(id => id !== catId);
      await loadCategories();
      await loadSchedules();
    } else {
      alert(`삭제 실패: ${data.error || '오류'}`);
    }
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ============================================================================
// Authentication & Security (Admin Login: 202310505 / qnrudeo^^A)
// ============================================================================
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    STATE.isLoggedIn = !!data.logged_in;
    STATE.currentUser = data.username || null;
    updateAuthUI();
  } catch (err) {
    console.error('Failed to check auth status:', err);
    STATE.isLoggedIn = false;
    updateAuthUI();
  }
}

function updateAuthUI() {
  const btnLogin = document.getElementById('btn-open-login');
  const userBadge = document.getElementById('user-profile-badge');
  const userDisplay = document.getElementById('auth-username-display');

  if (STATE.isLoggedIn) {
    if (btnLogin) btnLogin.classList.add('hidden');
    if (userBadge) {
      userBadge.classList.remove('hidden');
      userBadge.classList.add('flex');
    }
    if (userDisplay) {
      userDisplay.textContent = '관리자';
    }
  } else {
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (userBadge) {
      userBadge.classList.add('hidden');
      userBadge.classList.remove('flex');
    }
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}

function openLoginModal(pendingCallback = null, customMessage = null) {
  STATE.pendingAuthAction = pendingCallback || null;
  const modal = document.getElementById('login-modal');
  const errorBox = document.getElementById('login-error-box');
  const bannerDesc = document.getElementById('login-modal-banner-desc');
  const idInput = document.getElementById('login-id');
  const pwInput = document.getElementById('login-pw');

  if (errorBox) errorBox.classList.add('hidden');
  if (bannerDesc) {
    bannerDesc.textContent = customMessage || '일정 등록/수정/삭제, 강의 관리 및 강의계획서 PDF 업로드는 로그인 후 이용 가능합니다.';
  }
  if (idInput) idInput.value = '202310505';
  if (pwInput) pwInput.value = '';

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (pwInput) pwInput.focus();
    }, 100);
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('hidden');
  STATE.pendingAuthAction = null;
}

function togglePasswordVisibility() {
  const pwInput = document.getElementById('login-pw');
  const pwIcon = document.getElementById('pw-toggle-icon');
  if (!pwInput) return;
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    if (pwIcon) pwIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwInput.type = 'password';
    if (pwIcon) pwIcon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}

async function handleLoginSubmit() {
  const idInput = document.getElementById('login-id');
  const pwInput = document.getElementById('login-pw');
  const errorBox = document.getElementById('login-error-box');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('btn-login-submit');

  const username = idInput ? idInput.value.trim() : '';
  const password = pwInput ? pwInput.value.trim() : '';

  if (!username || !password) {
    if (errorBox) {
      errorText.textContent = '아이디와 비밀번호를 모두 입력해주세요.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  try {
    if (submitBtn) submitBtn.disabled = true;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      STATE.isLoggedIn = true;
      STATE.currentUser = data.username;
      updateAuthUI();
      closeLoginModal();

      // Execute pending callback if any
      const callback = STATE.pendingAuthAction;
      STATE.pendingAuthAction = null;
      if (typeof callback === 'function') {
        callback();
      }
    } else {
      if (errorBox) {
        errorText.textContent = data.error || '아이디 또는 비밀번호가 올바르지 않습니다.';
        errorBox.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errorBox) {
      errorText.textContent = '로그인 통신 중 오류가 발생했습니다.';
      errorBox.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error(e);
  }
  STATE.isLoggedIn = false;
  STATE.currentUser = null;
  updateAuthUI();
}

// ============================================================================
// 7. Grading Memo Handling (중간고사, 기말고사, 과제 등 메모장)
// ============================================================================
function openGradingMemoModal(courseId, category, pctValue = '') {
  const course = STATE.courses.find(c => c.id === courseId) || STATE.activeCourse;
  if (!course) return;

  const modal = document.getElementById('grading-memo-modal');
  const titleEl = document.getElementById('grading-memo-title');
  const pctBadge = document.getElementById('grading-memo-pct-badge');
  const subtitleEl = document.getElementById('grading-memo-subtitle');
  const textarea = document.getElementById('grading-memo-textarea');
  const courseIdInput = document.getElementById('grading-memo-course-id');
  const categoryInput = document.getElementById('grading-memo-category');
  const charCount = document.getElementById('grading-memo-char-count');

  if (titleEl) titleEl.textContent = `${category} 메모장`;
  if (pctBadge) {
    pctBadge.textContent = pctValue ? `반영 비율: ${pctValue}` : '';
    pctBadge.style.display = pctValue ? 'inline-block' : 'none';
  }
  if (subtitleEl) subtitleEl.textContent = `${course.title} • ${category} 관련 상세 정보 메모`;

  if (courseIdInput) courseIdInput.value = course.id;
  if (categoryInput) categoryInput.value = category;

  const notes = (course.grading && course.grading.notes) ? course.grading.notes : {};
  const currentMemo = notes[category] || '';
  if (textarea) {
    textarea.value = currentMemo;
    if (charCount) charCount.textContent = `${currentMemo.length}자`;

    textarea.oninput = () => {
      if (charCount) charCount.textContent = `${textarea.value.length}자`;
    };
  }

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (textarea) textarea.focus();
    }, 100);
  }
  if (window.lucide) lucide.createIcons();
}

function closeGradingMemoModal() {
  const modal = document.getElementById('grading-memo-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveGradingMemo() {
  const courseId = document.getElementById('grading-memo-course-id').value;
  const category = document.getElementById('grading-memo-category').value;
  const memoText = document.getElementById('grading-memo-textarea').value.trim();

  if (!courseId || !category) return;

  if (!STATE.isLoggedIn) {
    openLoginModal(() => saveGradingMemo(), '평가 메모를 저장하려면 로그인이 필요합니다.');
    return;
  }

  const saveBtn = document.getElementById('btn-save-grading-memo');
  try {
    if (saveBtn) saveBtn.disabled = true;
    const res = await fetch(`/api/courses/${courseId}/grading-memo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, memo: memoText })
    });
    const data = await res.json();
    if (data.success) {
      // Update local course
      const course = STATE.courses.find(c => c.id === courseId);
      if (course) {
        if (!course.grading) course.grading = {};
        course.grading.notes = data.notes;
        if (STATE.activeCourse && STATE.activeCourse.id === courseId) {
          STATE.activeCourse.grading = course.grading;
        }
      }
      // Re-render course modal grading items
      openCourseModal(courseId);
      closeGradingMemoModal();
    } else {
      alert(`저장 실패: ${data.error || '오류 발생'}`);
    }
  } catch (err) {
    alert(`네트워크 오류: ${err.message}`);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ============================================================================
// 8. Academic Calendar Sync (부경대학교 Smart-LMS)
// ============================================================================
async function syncAcademicCalendar() {
  const syncBtn = document.getElementById('btn-sync-academic');
  const syncIcon = document.getElementById('icon-sync-academic');
  const syncText = document.getElementById('text-sync-academic');

  try {
    if (syncIcon) syncIcon.classList.add('animate-spin');
    if (syncText) syncText.textContent = '동기화 중...';
    if (syncBtn) syncBtn.disabled = true;

    const res = await fetch('/api/academic/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      // Reload categories & schedules
      await loadCategories();
      await loadSchedules();
      alert(`부경대학교 LMS 학사일정 ${data.count}개가 성공적으로 동기화되었습니다.`);
    } else {
      alert(`학사일정 동기화 실패: ${data.error || '오류'}`);
    }
  } catch (err) {
    alert(`동기화 중 오류 발생: ${err.message}`);
  } finally {
    if (syncIcon) syncIcon.classList.remove('animate-spin');
    if (syncText) syncText.textContent = '학사일정 새로고침';
    if (syncBtn) syncBtn.disabled = false;
  }
}