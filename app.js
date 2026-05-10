/* =========================================================
   StarQuest — 지도 퀴즈 탐험 (Map Quiz Adventure)
   ========================================================= */

// ─── DATA STORE ─────────────────────────────────────────
const DATA = {
  users: [
    { id: 'user1', pw: 'pass1', name: '탐험가1', role: 'user', stars: 0, solved: [], history: [] },
    { id: 'user2', pw: 'pass2', name: '탐험가2', role: 'user', stars: 0, solved: [], history: [] },
    { id: 'user3', pw: 'pass3', name: '탐험가3', role: 'user', stars: 0, solved: [], history: [] },
    { id: 'admin', pw: 'admin123', name: '관리자', role: 'admin', stars: 0, solved: [], history: [] }
  ],

  locations: [
    { id: 1, name: '경복궁', lat: 37.5796, lng: 126.9770 },
    { id: 2, name: '남산타워', lat: 37.5512, lng: 126.9882 },
    { id: 3, name: '해운대 해수욕장', lat: 35.1587, lng: 129.1604 },
    { id: 4, name: '제주 성산일출봉', lat: 33.4617, lng: 126.9425 },
    { id: 5, name: '불국사', lat: 35.7900, lng: 129.3318 },
    { id: 6, name: '전주 한옥마을', lat: 35.8151, lng: 127.1530 },
    { id: 7, name: '인천 차이나타운', lat: 37.4737, lng: 126.6183 },
    { id: 8, name: '강릉 경포대', lat: 37.7948, lng: 128.8961 }
  ],

  quizzes: [
    { id: 1, question: '대한민국의 수도는 어디인가요?', options: ['서울', '부산', '대구', '인천'], answer: 0 },
    { id: 2, question: '한글을 창제한 왕은 누구인가요?', options: ['세종대왕', '태종', '성종', '영조'], answer: 0 },
    { id: 3, question: '대한민국에서 가장 높은 산은?', options: ['한라산', '지리산', '설악산', '북한산'], answer: 0 },
    { id: 4, question: '김치의 주 재료는 무엇인가요?', options: ['배추', '오이', '무', '양파'], answer: 0 },
    { id: 5, question: '태극기의 가운데 원은 무엇을 상징하나요?', options: ['우주의 조화', '하늘', '바다', '대지'], answer: 0 },
    { id: 6, question: '한국의 전통 의복을 무엇이라 하나요?', options: ['한복', '기모노', '치파오', '아오자이'], answer: 0 },
    { id: 7, question: '경복궁은 어느 왕조의 궁궐인가요?', options: ['조선', '고려', '백제', '신라'], answer: 0 },
    { id: 8, question: '대한민국의 국화(國花)는?', options: ['무궁화', '장미', '벚꽃', '국화'], answer: 0 },
    { id: 9, question: '비빔밥의 핵심 양념은?', options: ['고추장', '된장', '간장', '쌈장'], answer: 0 },
    { id: 10, question: '한국 전쟁이 발발한 연도는?', options: ['1950년', '1945년', '1953년', '1948년'], answer: 0 }
  ],

  nextLocId: 9,
  nextQuizId: 11
};

// ─── STATE ──────────────────────────────────────────────
let currentUser = null;
let map = null;
let markers = {};
let activeQuiz = null;
let activeLocationId = null;

// ─── GEOLOCATION STATE ──────────────────────────────────
const PROXIMITY_RADIUS = 500; // meters
let userLatLng = null;
let userMarker = null;
let userAccuracyCircle = null;
let watchId = null;

// ─── DOM REFERENCES ─────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  loginScreen: $('#login-screen'),
  appScreen: $('#app-screen'),
  loginForm: $('#login-form'),
  loginId: $('#login-id'),
  loginPw: $('#login-pw'),
  loginError: $('#login-error'),
  navStarCount: $('#nav-star-count'),
  navUserName: $('#nav-user-name'),
  navAdminBtn: $('#nav-admin-btn'),
  logoutBtn: $('#logout-btn'),
  legendCount: $('#legend-count'),
  profileName: $('#profile-name'),
  profileRole: $('#profile-role'),
  profileStars: $('#profile-stars'),
  profileSolved: $('#profile-solved'),
  profileRemaining: $('#profile-remaining'),
  quizHistory: $('#quiz-history'),
  quizModal: $('#quiz-modal'),
  quizLocationName: $('#quiz-location-name'),
  quizQuestion: $('#quiz-question'),
  quizOptions: $('#quiz-options'),
  quizResult: $('#quiz-result'),
  resultIcon: $('#result-icon'),
  resultText: $('#result-text'),
  resultCloseBtn: $('#result-close-btn'),
  quizCloseBtn: $('#quiz-close-btn'),
  addQuizModal: $('#add-quiz-modal'),
  addQuizForm: $('#add-quiz-form'),
  addLocationModal: $('#add-location-modal'),
  addLocationForm: $('#add-location-form'),
  addQuizBtn: $('#add-quiz-btn'),
  addLocationBtn: $('#add-location-btn'),
  quizList: $('#quiz-list'),
  locationList: $('#location-list'),
  toastContainer: $('#toast-container'),
  particlesContainer: $('#particles-container')
};

// ─── UTILITIES ──────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getUserRemainingLocations() {
  if (!currentUser) return [];
  return DATA.locations.filter(loc => !currentUser.solved.includes(loc.id));
}

// ─── PARTICLES ──────────────────────────────────────────
function createParticles() {
  const container = DOM.particlesContainer;
  const colors = ['rgba(99,102,241,.6)', 'rgba(251,191,36,.5)', 'rgba(52,211,153,.4)'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (Math.random() * 8 + 6) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(p);
  }
}

// ─── AUTH ────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const id = DOM.loginId.value.trim();
  const pw = DOM.loginPw.value.trim();
  const user = DATA.users.find(u => u.id === id && u.pw === pw);
  if (!user) {
    DOM.loginError.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
    DOM.loginId.style.borderColor = 'var(--danger)';
    DOM.loginPw.style.borderColor = 'var(--danger)';
    setTimeout(() => {
      DOM.loginError.textContent = '';
      DOM.loginId.style.borderColor = '';
      DOM.loginPw.style.borderColor = '';
    }, 2500);
    return;
  }
  currentUser = user;
  enterApp();
}

function enterApp() {
  DOM.loginScreen.classList.remove('active');
  DOM.appScreen.classList.add('active');
  DOM.navUserName.textContent = currentUser.name;
  if (currentUser.role === 'admin') {
    DOM.navAdminBtn.style.display = '';
  } else {
    DOM.navAdminBtn.style.display = 'none';
  }
  updateStarDisplay();
  initMap();
  switchTab('map');
}

function handleLogout() {
  currentUser = null;
  DOM.appScreen.classList.remove('active');
  DOM.loginScreen.classList.add('active');
  DOM.loginId.value = '';
  DOM.loginPw.value = '';
  stopGeolocation();
  if (map) { map.remove(); map = null; markers = {}; userMarker = null; userAccuracyCircle = null; }
  switchTab('map');
  showToast('로그아웃 되었습니다.', 'info');
}

function updateStarDisplay() {
  DOM.navStarCount.textContent = currentUser.stars;
  DOM.navStarCount.classList.remove('star-gained');
  void DOM.navStarCount.offsetWidth; // reflow
  DOM.navStarCount.classList.add('star-gained');
}

// ─── TABS ───────────────────────────────────────────────
function switchTab(tabName) {
  $$('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#page-${tabName}`).classList.add('active');
  if (tabName === 'profile') renderProfile();
  if (tabName === 'admin') renderAdmin();
  if (tabName === 'map' && map) setTimeout(() => map.invalidateSize(), 100);
}

// ─── MAP ────────────────────────────────────────────────
function initMap() {
  if (map) return;
  map = L.map('map', { zoomControl: true }).setView([36.5, 127.8], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);
  renderMarkers();
  startGeolocation();
}

// ─── GEOLOCATION ────────────────────────────────────────
function startGeolocation() {
  const gpsDot = $('#gps-dot');
  const gpsStatus = $('#gps-status');

  if (!navigator.geolocation) {
    gpsDot.className = 'gps-dot error';
    gpsStatus.textContent = 'GPS를 지원하지 않습니다';
    showToast('이 브라우저는 GPS를 지원하지 않습니다.', 'error');
    return;
  }

  gpsStatus.textContent = 'GPS 연결 중...';

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      userLatLng = L.latLng(latitude, longitude);

      gpsDot.className = 'gps-dot active';
      gpsStatus.textContent = `위치 확인됨 (±${Math.round(accuracy)}m)`;

      updateUserMarker(latitude, longitude, accuracy);
    },
    (err) => {
      gpsDot.className = 'gps-dot error';
      switch (err.code) {
        case 1: gpsStatus.textContent = '위치 권한이 거부됨'; break;
        case 2: gpsStatus.textContent = '위치를 확인할 수 없음'; break;
        case 3: gpsStatus.textContent = '위치 요청 시간 초과'; break;
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function stopGeolocation() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  userLatLng = null;
}

function updateUserMarker(lat, lng, accuracy) {
  if (!map) return;

  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-dot-wrapper"><div class="user-dot-ping"></div><div class="user-dot"></div></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip('내 위치', { className: 'marker-tooltip', offset: [0, -16], direction: 'top' });
  }

  if (userAccuracyCircle) {
    userAccuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
  } else {
    userAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      className: 'proximity-circle',
      weight: 1, fillOpacity: 0.08, opacity: 0.3
    }).addTo(map);
  }
}

function getDistanceMeters(latLng1, latLng2) {
  return latLng1.distanceTo(latLng2);
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function renderMarkers() {
  // Clear existing
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  const remaining = getUserRemainingLocations();
  remaining.forEach(loc => {
    const icon = L.divIcon({
      className: 'custom-marker-wrapper',
      html: '<div class="custom-marker">⭐</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    const marker = L.marker([loc.lat, loc.lng], { icon })
      .addTo(map)
      .bindTooltip(loc.name, { className: 'marker-tooltip', offset: [0, -25], direction: 'top' });
    marker.on('click', () => openQuiz(loc));
    markers[loc.id] = marker;
  });

  DOM.legendCount.textContent = `${remaining.length}개의 포인트가 남아있습니다`;

  // Fit map to show all markers
  if (remaining.length > 0) {
    const bounds = L.latLngBounds(remaining.map(loc => [loc.lat, loc.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
  }
}

// ─── QUIZ ───────────────────────────────────────────────
function openQuiz(location) {
  if (DATA.quizzes.length === 0) {
    showToast('등록된 퀴즈가 없습니다.', 'error');
    return;
  }

  // Proximity check (admin bypasses)
  if (currentUser.role !== 'admin') {
    if (!userLatLng) {
      showToast('📍 GPS 위치를 확인할 수 없습니다. 위치 권한을 허용해주세요.', 'error');
      return;
    }
    const locLatLng = L.latLng(location.lat, location.lng);
    const distance = getDistanceMeters(userLatLng, locLatLng);
    if (distance > PROXIMITY_RADIUS) {
      showToast(`📍 ${location.name}까지 ${formatDistance(distance)} 남았습니다. ${formatDistance(PROXIMITY_RADIUS)} 이내로 접근하세요!`, 'info');
      return;
    }
  }

  activeLocationId = location.id;
  // Pick random quiz
  const randomIndex = Math.floor(Math.random() * DATA.quizzes.length);
  const quiz = DATA.quizzes[randomIndex];
  activeQuiz = quiz;

  DOM.quizLocationName.textContent = `📍 ${location.name}`;
  DOM.quizQuestion.textContent = quiz.question;
  DOM.quizResult.style.display = 'none';
  DOM.quizOptions.innerHTML = '';

  // Shuffle options but track correct answer
  const correctAnswer = quiz.options[quiz.answer];
  const shuffledOptions = shuffleArray(quiz.options);

  shuffledOptions.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(btn, opt === correctAnswer, correctAnswer, location));
    DOM.quizOptions.appendChild(btn);
  });

  DOM.quizModal.classList.add('show');
}

function handleAnswer(btn, isCorrect, correctAnswer, location) {
  // Disable all options
  $$('.quiz-option').forEach(b => b.classList.add('disabled'));

  if (isCorrect) {
    btn.classList.add('correct');
    setTimeout(() => showResult(true, location), 600);
  } else {
    btn.classList.add('wrong');
    // Highlight correct
    $$('.quiz-option').forEach(b => {
      if (b.textContent === correctAnswer) b.classList.add('correct');
    });
    setTimeout(() => showResult(false, location), 1000);
  }
}

function showResult(correct, location) {
  const quizBody = $('.quiz-body');
  quizBody.style.display = 'none';
  DOM.quizResult.style.display = '';

  if (correct) {
    DOM.resultIcon.textContent = '⭐';
    DOM.resultText.textContent = '정답입니다! 별 1개를 획득했습니다!';
    DOM.resultText.style.color = 'var(--gold)';
    currentUser.stars++;
    currentUser.solved.push(location.id);
    updateStarDisplay();
    // Remove marker
    if (markers[location.id]) {
      map.removeLayer(markers[location.id]);
      delete markers[location.id];
    }
    DOM.legendCount.textContent = `${getUserRemainingLocations().length}개의 포인트가 남아있습니다`;
  } else {
    DOM.resultIcon.textContent = '❌';
    DOM.resultText.textContent = '틀렸습니다! 다시 도전해보세요.';
    DOM.resultText.style.color = 'var(--danger)';
  }

  // Record history
  currentUser.history.unshift({
    locationName: location.name,
    question: activeQuiz.question,
    correct,
    time: new Date().toLocaleString('ko-KR')
  });
}

function closeQuizModal() {
  DOM.quizModal.classList.remove('show');
  const quizBody = $('.quiz-body');
  quizBody.style.display = '';
  DOM.quizResult.style.display = 'none';
  activeQuiz = null;
  activeLocationId = null;
}

// ─── PROFILE ────────────────────────────────────────────
function renderProfile() {
  if (!currentUser) return;
  DOM.profileName.textContent = currentUser.name;
  DOM.profileRole.textContent = currentUser.role === 'admin' ? '👑 관리자' : '🧭 탐험가';
  DOM.profileStars.textContent = currentUser.stars;
  DOM.profileSolved.textContent = currentUser.solved.length;
  DOM.profileRemaining.textContent = getUserRemainingLocations().length;

  DOM.quizHistory.innerHTML = '';
  if (currentUser.history.length === 0) {
    DOM.quizHistory.innerHTML = '<p class="empty-history">아직 풀은 퀴즈가 없습니다.</p>';
    return;
  }
  currentUser.history.forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-icon">${h.correct ? '⭐' : '❌'}</div>
      <div class="history-info">
        <strong>${h.locationName}</strong>
        <span>${h.question}</span>
        <span>${h.time}</span>
      </div>
      <div class="history-result ${h.correct ? 'correct' : 'wrong'}">${h.correct ? '정답' : '오답'}</div>
    `;
    DOM.quizHistory.appendChild(div);
  });
}

// ─── ADMIN ──────────────────────────────────────────────
function renderAdmin() {
  renderQuizList();
  renderLocationList();
}

function renderQuizList() {
  DOM.quizList.innerHTML = '';
  DATA.quizzes.forEach(q => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      <div class="admin-item-info">
        <p>${q.question}</p>
        <span>정답: ${q.options[q.answer]}</span>
      </div>
      <button class="btn-danger" data-quiz-id="${q.id}">삭제</button>
    `;
    div.querySelector('.btn-danger').addEventListener('click', () => deleteQuiz(q.id));
    DOM.quizList.appendChild(div);
  });
}

function renderLocationList() {
  DOM.locationList.innerHTML = '';
  DATA.locations.forEach(loc => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      <div class="admin-item-info">
        <p>${loc.name}</p>
        <span>${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</span>
      </div>
      <button class="btn-danger" data-loc-id="${loc.id}">삭제</button>
    `;
    div.querySelector('.btn-danger').addEventListener('click', () => deleteLocation(loc.id));
    DOM.locationList.appendChild(div);
  });
}

function deleteQuiz(id) {
  DATA.quizzes = DATA.quizzes.filter(q => q.id !== id);
  renderQuizList();
  showToast('퀴즈가 삭제되었습니다.', 'success');
}

function deleteLocation(id) {
  DATA.locations = DATA.locations.filter(l => l.id !== id);
  if (markers[id] && map) { map.removeLayer(markers[id]); delete markers[id]; }
  renderLocationList();
  DOM.legendCount.textContent = `${getUserRemainingLocations().length}개의 포인트가 남아있습니다`;
  showToast('위치가 삭제되었습니다.', 'success');
}

function handleAddQuiz(e) {
  e.preventDefault();
  const question = $('#quiz-q').value.trim();
  const o1 = $('#quiz-o1').value.trim();
  const o2 = $('#quiz-o2').value.trim();
  const o3 = $('#quiz-o3').value.trim();
  const o4 = $('#quiz-o4').value.trim();
  if (!question || !o1 || !o2 || !o3 || !o4) return;
  DATA.quizzes.push({
    id: DATA.nextQuizId++,
    question, options: [o1, o2, o3, o4], answer: 0
  });
  DOM.addQuizForm.reset();
  DOM.addQuizModal.classList.remove('show');
  renderQuizList();
  showToast('퀴즈가 추가되었습니다!', 'success');
}

function handleAddLocation(e) {
  e.preventDefault();
  const name = $('#loc-name').value.trim();
  const lat = parseFloat($('#loc-lat').value);
  const lng = parseFloat($('#loc-lng').value);
  if (!name || isNaN(lat) || isNaN(lng)) return;
  const newLoc = { id: DATA.nextLocId++, name, lat, lng };
  DATA.locations.push(newLoc);
  // Add marker to map if map exists
  if (map && !currentUser.solved.includes(newLoc.id)) {
    const icon = L.divIcon({
      className: 'custom-marker-wrapper',
      html: '<div class="custom-marker">⭐</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    const marker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindTooltip(name, { className: 'marker-tooltip', offset: [0, -25], direction: 'top' });
    marker.on('click', () => openQuiz(newLoc));
    markers[newLoc.id] = marker;
  }
  DOM.addLocationForm.reset();
  DOM.addLocationModal.classList.remove('show');
  renderLocationList();
  DOM.legendCount.textContent = `${getUserRemainingLocations().length}개의 포인트가 남아있습니다`;
  showToast('위치가 추가되었습니다!', 'success');
}

// ─── EVENT LISTENERS ────────────────────────────────────
DOM.loginForm.addEventListener('submit', handleLogin);
DOM.logoutBtn.addEventListener('click', handleLogout);

$$('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

DOM.quizCloseBtn.addEventListener('click', closeQuizModal);
DOM.resultCloseBtn.addEventListener('click', closeQuizModal);
DOM.quizModal.addEventListener('click', (e) => {
  if (e.target === DOM.quizModal) closeQuizModal();
});

DOM.addQuizBtn.addEventListener('click', () => DOM.addQuizModal.classList.add('show'));
DOM.addLocationBtn.addEventListener('click', () => DOM.addLocationModal.classList.add('show'));

$$('.add-quiz-close').forEach(el => el.addEventListener('click', () => DOM.addQuizModal.classList.remove('show')));
$$('.add-loc-close').forEach(el => el.addEventListener('click', () => DOM.addLocationModal.classList.remove('show')));

DOM.addQuizForm.addEventListener('submit', handleAddQuiz);
DOM.addLocationForm.addEventListener('submit', handleAddLocation);

DOM.addQuizModal.addEventListener('click', (e) => { if (e.target === DOM.addQuizModal) DOM.addQuizModal.classList.remove('show'); });
DOM.addLocationModal.addEventListener('click', (e) => { if (e.target === DOM.addLocationModal) DOM.addLocationModal.classList.remove('show'); });

// ─── INIT ───────────────────────────────────────────────
createParticles();
DOM.loginId.focus();
