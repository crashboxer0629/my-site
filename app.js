/* =========================================================
   StarQuest — 지도 퀴즈 탐험 (Map Quiz Adventure)
   ========================================================= */

// ─── FIREBASE INIT ──────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAvduPX3peGZfx_NwcMdWyOSU-K5yFGYLA",
  authDomain: "churchsite-4dc71.firebaseapp.com",
  projectId: "churchsite-4dc71",
  storageBucket: "churchsite-4dc71.firebasestorage.app",
  messagingSenderId: "418508143340",
  appId: "1:418508143340:web:1b47d8806d467f8a6d43c9",
  measurementId: "G-L7FE5FWJ9C"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ─── DATA STORE ─────────────────────────────────────────
const DATA = {
  users: [],
  locations: [],
  quizzes: []
};

// Listen to Firestore
db.collection('users').onSnapshot(snapshot => {
  DATA.users = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

  if (currentUser) {
    const updatedUser = DATA.users.find(u => u.id === currentUser.id);
    if (updatedUser) {
      currentUser = updatedUser;
      updateStarDisplay();
      if ($('#page-profile').classList.contains('active')) renderProfile();
    } else {
      // User was deleted
      handleLogout();
      showToast('계정이 삭제되었습니다.', 'error');
      return;
    }

    if ($('#page-admin').classList.contains('active')) {
      renderUserList();
    }
  }
});
db.collection('locations').onSnapshot(snapshot => {
  DATA.locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (currentUser && map) {
    renderMarkers(false);
    if (DOM.appScreen.classList.contains('active')) {
      if ($('#page-admin').classList.contains('active')) renderLocationList();
      if ($('#page-profile').classList.contains('active')) renderProfile();
    }
  }
});

db.collection('quizzes').onSnapshot(snapshot => {
  DATA.quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (currentUser && $('#page-admin').classList.contains('active')) {
    renderQuizList();
  }
});

// ─── STATE ──────────────────────────────────────────────
let currentUser = null;
let map = null;
let markers = {};
let activeQuiz = null;
let activeLocationId = null;

// ─── GEOLOCATION STATE ──────────────────────────────────
const PROXIMITY_RADIUS = 50; // meters
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
  leaderboardList: $('#leaderboard-list'),
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
  particlesContainer: $('#particles-container'),
  userList: $('#user-list'),
  addUserBtn: $('#add-user-btn'),
  addUserModal: $('#add-user-modal'),
  addUserForm: $('#add-user-form')
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
  renderMarkers(true); // Fit bounds on initial load
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

function renderMarkers(fit = false) {
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
  if (fit && remaining.length > 0) {
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

  // Cooldown check
  if (currentUser.cooldowns && currentUser.cooldowns[location.id]) {
    const lastFailedTime = currentUser.cooldowns[location.id];
    const diff = Date.now() - lastFailedTime;
    const cooldownMs = 5 * 60 * 1000;
    if (diff < cooldownMs) {
      const remainingMs = cooldownMs - diff;
      const min = Math.floor(remainingMs / 60000);
      const sec = Math.floor((remainingMs % 60000) / 1000);
      showToast(`⏳ 오답 페널티! ${min}분 ${sec}초 후에 다시 도전할 수 있습니다.`, 'error');
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

  let newStars = currentUser.stars;
  let newSolved = [...currentUser.solved];
  let newHistory = [...currentUser.history];
  let newCooldowns = currentUser.cooldowns || {};

  if (correct) {
    DOM.resultIcon.textContent = '⭐';
    DOM.resultText.textContent = '정답입니다! 별 1개를 획득했습니다!';
    DOM.resultText.style.color = 'var(--gold)';
    newStars++;
    newSolved.push(location.id);

    // Remove marker immediately from local view
    if (markers[location.id]) {
      map.removeLayer(markers[location.id]);
      delete markers[location.id];
    }
  } else {
    DOM.resultIcon.textContent = '❌';
    DOM.resultText.textContent = '틀렸습니다! 5분 후에 다시 도전할 수 있습니다.';
    DOM.resultText.style.color = 'var(--danger)';
    newCooldowns[location.id] = Date.now();
  }

  // Record history
  newHistory.unshift({
    locationName: location.name,
    question: activeQuiz.question,
    correct,
    time: new Date().toLocaleString('ko-KR')
  });

  // Update in Firestore
  db.collection('users').doc(currentUser.docId).update({
    stars: newStars,
    solved: newSolved,
    history: newHistory,
    cooldowns: newCooldowns
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

  renderLeaderboard();
}

function renderLeaderboard() {
  if (!DOM.leaderboardList) return;
  DOM.leaderboardList.innerHTML = '';
  
  // 1. 관리자 제외 및 정렬 (별 개수 내림차순 -> 이름 오름차순)
  const sortedUsers = DATA.users
    .filter(u => u.role !== 'admin')
    .sort((a, b) => {
      const starsDiff = (b.stars || 0) - (a.stars || 0);
      if (starsDiff !== 0) return starsDiff;
      return (a.name || '').localeCompare(b.name || '');
    });
  
  let currentRank = 1;

  sortedUsers.forEach((u, index) => {
    // 2. 공동 순위 계산
    if (index > 0) {
      const prevStars = sortedUsers[index - 1].stars || 0;
      const myStars = u.stars || 0;
      if (myStars < prevStars) {
        currentRank = index + 1; // 별 개수가 이전 사람보다 적으면 현재 인덱스 + 1 로 순위 갱신
      }
    }

    const div = document.createElement('div');
    div.className = 'history-item';
    
    // 3. 순위에 따른 아이콘/텍스트 표시
    let rankIcon = '';
    if (currentRank === 1) rankIcon = '🥇';
    else if (currentRank === 2) rankIcon = '🥈';
    else if (currentRank === 3) rankIcon = '🥉';
    else rankIcon = `<span style="font-size: 1rem; font-weight: bold; color: var(--text-muted);">${currentRank}위</span>`;

    const isMe = u.id === currentUser.id;

    // Apply slightly different background for current user
    if (isMe) {
      div.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
      div.style.borderColor = 'var(--gold)';
    }

    div.innerHTML = `
      <div class="history-icon" style="display: flex; align-items: center; justify-content: center;">${rankIcon}</div>
      <div class="history-info">
        <strong>${u.name} ${isMe ? '(나)' : ''}</strong>
        <span>푼 퀴즈: ${u.solved ? u.solved.length : 0}개</span>
      </div>
      <div class="history-result" style="color: var(--gold); font-size: 1.1rem; font-weight: bold;">⭐ ${u.stars || 0}</div>
    `;
    DOM.leaderboardList.appendChild(div);
  });
}

// ─── ADMIN ──────────────────────────────────────────────
function renderAdmin() {
  renderUserList();
  renderQuizList();
  renderLocationList();
}

function renderUserList() {
  DOM.userList.innerHTML = '';
  DATA.users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'admin-item';
    div.innerHTML = `
      <div class="admin-item-info">
        <p>${u.name} (${u.id}) - ${u.role === 'admin' ? '👑 관리자' : '🧭 일반'}</p>
        <span>⭐ ${u.stars || 0}개 | 푼 퀴즈: ${u.solved ? u.solved.length : 0}개</span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-accent reset-btn" data-user-id="${u.id}" style="padding: 6px 10px;">초기화</button>
        <button class="btn-danger delete-btn" data-user-id="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>삭제</button>
      </div>
    `;
    div.querySelector('.reset-btn').addEventListener('click', () => resetUser(u.id));
    if (u.id !== currentUser.id) {
      div.querySelector('.delete-btn').addEventListener('click', () => deleteUser(u.id));
    }
    DOM.userList.appendChild(div);
  });
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

function resetUser(userId) {
  const user = DATA.users.find(u => u.id === userId);
  if (!user) return;
  db.collection('users').doc(user.docId).update({
    stars: 0,
    solved: [],
    history: [],
    cooldowns: {}
  }).then(() => showToast(`${user.name}의 데이터가 초기화되었습니다.`, 'success'))
    .catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function deleteUser(userId) {
  const user = DATA.users.find(u => u.id === userId);
  if (!user) return;
  db.collection('users').doc(user.docId).delete().then(() => {
    showToast('사용자가 삭제되었습니다.', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function deleteQuiz(id) {
  db.collection('quizzes').doc(id).delete().then(() => {
    showToast('퀴즈가 삭제되었습니다.', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function deleteLocation(id) {
  db.collection('locations').doc(id).delete().then(() => {
    showToast('위치가 삭제되었습니다.', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function handleAddUser(e) {
  e.preventDefault();
  const id = $('#usr-id').value.trim();
  const pw = $('#usr-pw').value.trim();
  const name = $('#usr-name').value.trim();
  const role = $('#usr-role').value;
  if (!id || !pw || !name) return;

  if (DATA.users.some(u => u.id === id)) {
    showToast('이미 존재하는 아이디입니다.', 'error');
    return;
  }

  db.collection('users').add({
    id, pw, name, role, stars: 0, solved: [], history: [], cooldowns: {}
  }).then(() => {
    DOM.addUserForm.reset();
    DOM.addUserModal.classList.remove('show');
    showToast('사용자가 추가되었습니다!', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function handleAddQuiz(e) {
  e.preventDefault();
  const question = $('#quiz-q').value.trim();
  const o1 = $('#quiz-o1').value.trim();
  const o2 = $('#quiz-o2').value.trim();
  const o3 = $('#quiz-o3').value.trim();
  const o4 = $('#quiz-o4').value.trim();
  if (!question || !o1 || !o2 || !o3 || !o4) return;

  db.collection('quizzes').add({
    question, options: [o1, o2, o3, o4], answer: 0
  }).then(() => {
    DOM.addQuizForm.reset();
    DOM.addQuizModal.classList.remove('show');
    showToast('퀴즈가 추가되었습니다!', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
}

function handleAddLocation(e) {
  e.preventDefault();
  const name = $('#loc-name').value.trim();
  const lat = parseFloat($('#loc-lat').value);
  const lng = parseFloat($('#loc-lng').value);
  if (!name || isNaN(lat) || isNaN(lng)) return;

  db.collection('locations').add({
    name, lat, lng
  }).then(() => {
    DOM.addLocationForm.reset();
    DOM.addLocationModal.classList.remove('show');
    showToast('위치가 추가되었습니다!', 'success');
  }).catch(err => showToast('권한 에러: 데이터베이스 규칙을 확인하세요.', 'error'));
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
DOM.addUserBtn.addEventListener('click', () => DOM.addUserModal.classList.add('show'));

$$('.add-quiz-close').forEach(el => el.addEventListener('click', () => DOM.addQuizModal.classList.remove('show')));
$$('.add-loc-close').forEach(el => el.addEventListener('click', () => DOM.addLocationModal.classList.remove('show')));
$$('.add-user-close').forEach(el => el.addEventListener('click', () => DOM.addUserModal.classList.remove('show')));

DOM.addQuizForm.addEventListener('submit', handleAddQuiz);
DOM.addLocationForm.addEventListener('submit', handleAddLocation);
DOM.addUserForm.addEventListener('submit', handleAddUser);

DOM.addQuizModal.addEventListener('click', (e) => { if (e.target === DOM.addQuizModal) DOM.addQuizModal.classList.remove('show'); });
DOM.addLocationModal.addEventListener('click', (e) => { if (e.target === DOM.addLocationModal) DOM.addLocationModal.classList.remove('show'); });
DOM.addUserModal.addEventListener('click', (e) => { if (e.target === DOM.addUserModal) DOM.addUserModal.classList.remove('show'); });

// ─── INIT ───────────────────────────────────────────────
createParticles();
DOM.loginId.focus();
