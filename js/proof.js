// =====================================================================
//  온종일AI — 실시간 신청/열람 플루프(proof) 위젯
//  화면 좌하단에 "○○○님이 무료 진단을 신청했어요" 토스트를 띄웁니다.
//  스타일은 이 파일에서 직접 주입하므로 별도 CSS 불필요.
// =====================================================================
(function () {
  if (window.__ojiProofLoaded) return;
  window.__ojiProofLoaded = true;

  // --- 이름 풀 (성 + 마스킹) 100명 ---------------------------------
  var SURNAMES = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','전','홍','고','문','손','배','백','허','유','남','심','노','하','곽','성','차','주','우','구','민','진'];
  var GIVEN2 = ['지','민','서','현','준','수','은','예','도','하','시','윤','채','유','주','연','다','승','가','태','소','재','우','혜','정','진','영','경','성','호'];
  var REGIONS = ['서울 강남','서울 마포','서울 송파','서울 성북','서울 노원','경기 분당','경기 일산','경기 수원','경기 용인','인천 부평','부산 해운대','부산 서면','대구 수성','대전 둔산','광주 상무','울산 남구','청주 흥덕','전주 완산','창원 성산','천안 서북'];

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // "박지○님" 형태로 마스킹된 이름 100개 생성
  function makeNames(n) {
    var set = {}, out = [];
    var guard = 0;
    while (out.length < n && guard < n * 40) {
      guard++;
      var name = rand(SURNAMES) + rand(GIVEN2) + '○';
      if (set[name]) continue;
      set[name] = 1;
      out.push(name);
    }
    return out;
  }
  var NAMES = makeNames(100);

  // --- 메시지 유형 --------------------------------------------------
  var ACTIONS = [
    { icon: '✅', verb: '무료 AI 진단을 신청했어요' },
    { icon: '📩', verb: '상담을 신청했어요' },
    { icon: '🔎', verb: '우리 가게 AI 노출을 확인했어요' },
    { icon: '⭐', verb: '진단 결과 리포트를 받았어요' }
  ];

  function timeAgo() {
    var m = Math.floor(Math.random() * 12) + 1; // 1~12분 전
    if (Math.random() < 0.25) return '방금 전';
    return m + '분 전';
  }

  // 현재 페이지가 가이드 글이면 "읽는 중" 메시지도 섞는다
  var isArticle = /\/guide\//.test(location.pathname) || document.querySelector('.article-wrap');

  // --- 스타일 주입 --------------------------------------------------
  var css = '' +
    '.oji-proof{position:fixed;left:18px;bottom:18px;z-index:9999;max-width:330px;' +
    'background:rgba(20,20,22,.92);color:#fff;border:1px solid rgba(255,255,255,.12);' +
    'border-radius:14px;padding:13px 16px;box-shadow:0 12px 34px rgba(0,0,0,.38);' +
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
    'font-family:"Noto Sans KR",sans-serif;display:flex;gap:11px;align-items:flex-start;' +
    'transform:translateY(140%);opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s;}' +
    '[data-theme="light"] .oji-proof{background:rgba(255,255,255,.96);color:#1a1a1a;border-color:rgba(0,0,0,.1);box-shadow:0 12px 34px rgba(0,0,0,.14);}' +
    '.oji-proof.show{transform:translateY(0);opacity:1;}' +
    '.oji-proof-ic{flex-shrink:0;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;background:rgba(255,59,0,.16);}' +
    '.oji-proof-tx{flex:1;line-height:1.45;}' +
    '.oji-proof-tx b{font-weight:700;}' +
    '.oji-proof-meta{display:block;margin-top:3px;font-size:11px;opacity:.62;}' +
    '.oji-proof-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#21d07a;margin-right:5px;vertical-align:middle;animation:ojiPulse 1.6s infinite;}' +
    '.oji-proof-x{flex-shrink:0;background:none;border:none;color:inherit;opacity:.4;cursor:pointer;font-size:16px;line-height:1;padding:0 0 0 4px;}' +
    '.oji-proof-x:hover{opacity:.85;}' +
    '@keyframes ojiPulse{0%,100%{opacity:1;}50%{opacity:.25;}}' +
    '@media(max-width:520px){.oji-proof{left:10px;right:10px;bottom:10px;max-width:none;font-size:13px;}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // --- 위젯 DOM -----------------------------------------------------
  var box = document.createElement('div');
  box.className = 'oji-proof';
  box.setAttribute('role', 'status');
  box.innerHTML =
    '<div class="oji-proof-ic" id="ojiIc">✅</div>' +
    '<div class="oji-proof-tx" id="ojiTx"></div>' +
    '<button class="oji-proof-x" id="ojiX" aria-label="닫기">×</button>';
  document.body.appendChild(box);

  var icEl = box.querySelector('#ojiIc');
  var txEl = box.querySelector('#ojiTx');
  var stopped = false;
  var hideTimer = null;
  var nextTimer = null;

  box.querySelector('#ojiX').addEventListener('click', function () {
    stopped = true;
    box.classList.remove('show');
    clearTimeout(hideTimer);
    clearTimeout(nextTimer);
  });

  function render() {
    var name = rand(NAMES);
    var region = rand(REGIONS);
    if (isArticle && Math.random() < 0.4) {
      // 읽는 중 유형 (현재 글을 N명이 보는 중)
      var readers = Math.floor(Math.random() * 17) + 4; // 4~20명
      icEl.textContent = '👀';
      txEl.innerHTML = '<span class="oji-proof-dot"></span><b>지금 ' + readers + '명</b>이 이 글을 읽고 있어요' +
        '<span class="oji-proof-meta">' + region + ' 외 ' + (readers - 1) + '명</span>';
    } else {
      var act = rand(ACTIONS);
      icEl.textContent = act.icon;
      txEl.innerHTML = '<b>' + region + ' · ' + name + '</b>님이 ' + act.verb +
        '<span class="oji-proof-meta"><span class="oji-proof-dot"></span>' + timeAgo() + '</span>';
    }
  }

  function showOnce() {
    if (stopped) return;
    render();
    box.classList.add('show');
    hideTimer = setTimeout(function () {
      box.classList.remove('show');
      nextTimer = setTimeout(showOnce, Math.floor(Math.random() * 5000) + 6000); // 6~11초 후 다음
    }, 5200); // 5.2초 표시
  }

  // 첫 등장: 4초 후
  setTimeout(showOnce, 4000);
})();
