// THEME
var themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.addEventListener('click', function() {
    var h = document.documentElement;
    var dark = h.getAttribute('data-theme') === 'dark';
    h.setAttribute('data-theme', dark ? 'light' : 'dark');
    this.textContent = dark ? '☀️' : '🌙';
  });
}

// CINEMATIC (index.html only)
var slides = document.querySelectorAll('.cslide');
if (slides.length > 0) {
  var dotsEl = document.getElementById('cdots');
  var bar = document.getElementById('cbar');
  var DUR = 5000;
  var cur = 0;
  var timer = null;

  slides.forEach(function(_, i) {
    var d = document.createElement('div');
    d.className = 'cdot' + (i === 0 ? ' on' : '');
    d.addEventListener('click', function() { goTo(i); });
    dotsEl.appendChild(d);
  });

  function goTo(n) {
    slides[cur].classList.remove('on');
    dotsEl.children[cur].classList.remove('on');
    cur = n;
    slides[cur].classList.add('on');
    dotsEl.children[cur].classList.add('on');
    resetProg();
  }

  function resetProg() {
    clearTimeout(timer);
    bar.style.transition = 'none';
    bar.style.width = '0%';
    setTimeout(function() {
      bar.style.transition = 'width ' + DUR + 'ms linear';
      bar.style.width = '100%';
    }, 30);
    timer = setTimeout(function() { goTo((cur + 1) % slides.length); }, DUR);
  }

  resetProg();
}

// DEMO CARD (index.html only)
if (document.getElementById('dQ')) {
  var demos = [
    { q: '💬 강남에서 인테리어 잘하는 업체 추천해줘', n: '스페이스온 인테리어', d: '강남구 · 시공사례 다수', u: 'chat.openai.com', c: 0 },
    { q: '💬 마포구 세무사 어디가 좋아?', n: '온세무회계사무소', d: '마포구 · 경력 15년', u: 'perplexity.ai', c: 1 },
    { q: '💬 성북구 임플란트 잘하는 치과', n: '성북서울치과의원', d: '성북구 · AI 추천 1위', u: 'gemini.google.com', c: 2 },
    { q: '💬 판교 헬스장 추천해줘', n: '핏원 피트니스', d: '판교 · 회원 2000+', u: 'claude.ai', c: 3 }
  ];
  var di = 0;
  var chips = document.querySelectorAll('.chip');

  setInterval(function() {
    di = (di + 1) % demos.length;
    var v = demos[di];
    var qEl = document.getElementById('dQ');
    var nEl = document.getElementById('dN');
    if (!qEl || !nEl) return;
    qEl.style.opacity = '0';
    nEl.style.opacity = '0';
    chips.forEach(function(c) { c.classList.remove('on'); });
    setTimeout(function() {
      qEl.textContent = v.q;
      nEl.textContent = v.n;
      var dD = document.getElementById('dD');
      var dUrl = document.getElementById('dUrl');
      if (dD) dD.textContent = v.d;
      if (dUrl) dUrl.textContent = v.u;
      if (chips[v.c]) chips[v.c].classList.add('on');
      qEl.style.opacity = '1';
      nEl.style.opacity = '1';
    }, 350);
  }, 3200);
}

// NAV DROPDOWN — 클릭 지원 (hover + click 모두 작동)
document.querySelectorAll('.nav-drop-btn').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var drop = this.closest('.nav-drop');
    var isOpen = drop.classList.contains('active');
    document.querySelectorAll('.nav-drop').forEach(function(d) { d.classList.remove('active'); });
    if (!isOpen) drop.classList.add('active');
  });
});
document.addEventListener('click', function() {
  document.querySelectorAll('.nav-drop').forEach(function(d) { d.classList.remove('active'); });
});

// FAQ ACCORDION
document.querySelectorAll('.faq-q').forEach(function(q) {
  q.addEventListener('click', function() {
    var item = this.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i) { i.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
  });
});

// SCROLL FADE
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) e.target.classList.add('vis');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fi').forEach(function(el) { obs.observe(el); });

// 햄버거 메뉴
const hamBtn = document.getElementById('hamBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (hamBtn && mobileMenu) {
  hamBtn.addEventListener('click', () => {
    hamBtn.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
  // 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!hamBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      hamBtn.classList.remove('open');
      mobileMenu.classList.remove('open');
    }
  });
}
