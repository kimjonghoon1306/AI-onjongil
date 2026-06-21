/* ════════════════════════════════════════════════
   온봇 (OnBot) — 온종일AI 안내 챗봇
   모든 페이지 공통 위젯. 자체 CSS+HTML 주입, 테마(data-theme) 연동.
   루트절대경로(/js/onbot.js)로 어느 깊이의 페이지에서도 동작.
════════════════════════════════════════════════ */
(function () {
  if (window.__onbotLoaded) return;
  window.__onbotLoaded = true;

  /* ── 주기적으로 뜨는 말풍선 멘트 (로테이션) ── */
  var BUBBLES = [
    "AI한테 안 보이면, 없는 가게예요 👀",
    "우리 가게도 ChatGPT에 뜰까요? 🤔",
    "1분이면 끝! 무료 AI 노출 진단 🔍",
    "AI 검색 노출, 뭐부터 할지 알려드릴게요 👋",
    "궁금한 점, 여기 눌러보세요 ✨",
  ];

  /* ── 챗봇 대화 데이터: 사이트 모든 기능 안내 ── */
  var CATS = [
    {
      icon: "🔍", label: "AI 검색이 처음이세요?",
      intro: "AI 검색 노출의 기본 개념부터 잡아드릴게요.",
      items: [
        { q: "SEO · AEO · GEO, 뭐가 다른가요?", a: "SEO는 검색엔진 상위노출, AEO는 AI 답변에 인용되기, GEO는 생성형 AI 추천에 들어가기예요. 각각 자세히 정리했어요.", links: [["📖 SEO란?", "/guide/what-is-seo.html"], ["🤖 AEO란?", "/guide/what-is-aeo.html"], ["🔬 GEO란?", "/guide/what-is-geo.html"]] },
        { q: "AI는 어떻게 추천 업체를 고르나요?", a: "AI가 크롤링·인용·추천하는 원리를 단계별로 설명해드려요.", links: [["⚙️ AI 작동 원리", "/guide/how-ai-search-works.html"]] },
        { q: "네이버랑 AI 검색, 뭐가 달라요?", a: "검색 방식과 노출 전략의 차이를 비교했어요.", links: [["⚡ 네이버 vs AI", "/guide/naver-vs-ai.html"]] },
      ],
    },
    {
      icon: "🛠️", label: "무료 AI 노출 진단",
      intro: "내 사이트가 AI에 잘 노출되는지 1분 만에 실측 진단해드려요. (Schema·robots.txt·메타·E-E-A-T 등)",
      items: [
        { q: "지금 바로 진단받기", a: "사이트 주소만 넣으면 점수와 개선점을 바로 보여드려요.", links: [["🚀 무료 진단 시작", "/analyze.html"]] },
        { q: "진단은 뭘 보나요?", a: "AI 봇 허용(GPTBot·OAI-SearchBot·Google-Extended 등), 스키마, 메타태그, 콘텐츠 구조, E-E-A-T 신호를 실측합니다.", links: [["📋 AI SEO 체크리스트", "/ai-seo-checklist.html"]] },
      ],
    },
    {
      icon: "💬", label: "AI 플랫폼별 노출법",
      intro: "어디에 노출되고 싶으세요? 플랫폼별 전략이 달라요.",
      items: [
        { q: "ChatGPT에 노출되고 싶어요", a: "GPTBot(학습)과 OAI-SearchBot(검색)을 구분해 제대로 노출하는 법.", links: [["💬 ChatGPT 노출하기", "/guide/chatgpt-exposure.html"]] },
        { q: "Perplexity 최적화", a: "인용 기반 답변엔진 Perplexity에 잡히는 법.", links: [["🔍 Perplexity 최적화", "/guide/perplexity-optimization.html"]] },
        { q: "Google AI Overviews(Gemini)", a: "구글 AI 개요에 인용되는 전략.", links: [["♊ AI Overviews", "/guide/gemini-ai-overview.html"]] },
        { q: "Claude AI 검색", a: "Claude가 참고하는 콘텐츠로 만드는 법.", links: [["🧠 Claude AI 검색", "/guide/claude-ai-search.html"]] },
      ],
    },
    {
      icon: "🏢", label: "우리 업종 맞춤 가이드",
      intro: "업종별로 AI 노출 포인트가 달라요. 해당 업종을 골라보세요.",
      items: [
        { q: "내 업종 가이드 보기", a: "10개 업종별 맞춤 전략을 정리했어요.", links: [
          ["🏥 병원·치과·한의원", "/industry/hospital.html"], ["🏠 인테리어·리모델링", "/industry/interior.html"],
          ["⚖️ 법률·세무·회계", "/industry/law.html"], ["💪 헬스·뷰티", "/industry/health.html"],
          ["🍽️ 식당·카페", "/industry/restaurant.html"], ["📚 학원·교습소", "/industry/academy.html"],
          ["🏢 부동산", "/industry/realestate.html"], ["💉 피부과·성형외과", "/industry/dermatology.html"],
          ["🚗 자동차", "/industry/auto.html"], ["🧹 세탁·청소", "/industry/cleaning.html"],
        ] },
      ],
    },
    {
      icon: "⚙️", label: "기술 체크리스트",
      intro: "AI가 읽기 좋은 사이트로 만드는 기술 항목들이에요.",
      items: [
        { q: "AI 봇을 robots.txt에서 허용하기", a: "GPTBot·OAI-SearchBot·Google-Extended 등을 허용해야 AI가 크롤링해요.", links: [["🤖 robots.txt 가이드", "/guide/robots-txt-ai-guide.html"], ["GPTBot 가이드", "/guide/gptbot-guide.html"]] },
        { q: "FAQPage 스키마 적용", a: "Q&A 구조 스키마는 AI 답변에 우선 인용돼요.", links: [["❓ FAQPage 스키마", "/guide/faqpage-schema-guide.html"]] },
        { q: "E-E-A-T 신뢰 신호", a: "경험·전문성·권위·신뢰 신호를 갖추는 법.", links: [["🏅 E-E-A-T 가이드", "/guide/eeat-guide.html"]] },
      ],
    },
    {
      icon: "📞", label: "상담 · 문의",
      intro: "AI 노출 컨설팅이 필요하시면 편하게 연락주세요. 온종일이 도와드릴게요.",
      items: [
        { q: "상담 문의하기", a: "이메일로 문의주시면 빠르게 답변드려요.", links: [["✉️ 문의하기", "/contact.html"], ["📧 tarry9653@daum.net", "mailto:tarry9653@daum.net"]] },
      ],
    },
  ];

  /* ── 아바타 SVG (브랜드 오렌지 오브 + 친근한 눈) ── */
  function avatar(size) {
    return '<svg class="ob-av" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" fill="none">' +
      '<defs><linearGradient id="obGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5f2e"/><stop offset="1" stop-color="#ff2d78"/></linearGradient></defs>' +
      '<circle cx="24" cy="24" r="22" fill="url(#obGrad)"/>' +
      '<circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>' +
      '<g class="ob-eyes" fill="#fff">' +
      '<circle cx="17.5" cy="22" r="3.2"/><circle cx="30.5" cy="22" r="3.2"/>' +
      '</g>' +
      '<path d="M18 30c2 2.4 8 2.4 10 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="13" cy="27" r="2" fill="#fff" opacity=".35"/><circle cx="35" cy="27" r="2" fill="#fff" opacity=".35"/>' +
      '</svg>';
  }

  /* ── 스타일 ── */
  var CSS = [
    '#onbot,#onbot *{box-sizing:border-box}',
    '#onbot{--ob-accent:#ff3b00;--ob-accent2:#ff2d78;--ob-bg:#fff;--ob-text:#141414;--ob-sub:#666;--ob-line:rgba(0,0,0,.09);--ob-card:#f6f6f4;font-family:"Noto Sans KR",sans-serif}',
    'html[data-theme="dark"] #onbot{--ob-bg:#15151a;--ob-text:#f5f4f0;--ob-sub:#9a9a9a;--ob-line:rgba(255,255,255,.12);--ob-card:#1f1f26}',
    /* FAB */
    '.ob-fab{position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;align-items:center;gap:9px;padding:7px 16px 7px 7px;border:0;border-radius:99px;background:var(--ob-bg);color:var(--ob-text);box-shadow:0 12px 34px -8px rgba(255,59,0,.45),0 4px 12px rgba(0,0,0,.18);cursor:pointer;font-weight:800;font-size:14.5px;font-family:inherit;transition:transform .18s,box-shadow .18s}',
    '.ob-fab:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 18px 44px -10px rgba(255,59,0,.6)}',
    '.ob-fab .ob-av{border-radius:50%;flex:none}',
    '.ob-fab .ob-dot{position:absolute;top:4px;left:34px;width:11px;height:11px;border-radius:50%;background:#27d07a;border:2px solid var(--ob-bg)}',
    '.ob-eyes{animation:obBlink 4.5s infinite}',
    '@keyframes obBlink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}',
    '.ob-eyes{transform-origin:center 22px}',
    /* 말풍선 */
    '.ob-bubble{position:fixed;right:22px;bottom:82px;z-index:99999;max-width:240px;padding:12px 15px;border-radius:16px 16px 4px 16px;background:var(--ob-bg);color:var(--ob-text);box-shadow:0 14px 40px -12px rgba(0,0,0,.4);border:1px solid var(--ob-line);font-size:13.5px;font-weight:600;line-height:1.5;cursor:pointer;opacity:0;transform:translateY(8px) scale(.96);pointer-events:none;transition:opacity .3s,transform .3s}',
    '.ob-bubble.on{opacity:1;transform:none;pointer-events:auto}',
    '.ob-bubble:after{content:"";position:absolute;right:18px;bottom:-7px;width:14px;height:14px;background:var(--ob-bg);border-right:1px solid var(--ob-line);border-bottom:1px solid var(--ob-line);transform:rotate(45deg)}',
    '.ob-bubble .ob-x{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:var(--ob-text);color:var(--ob-bg);border:0;font-size:12px;cursor:pointer;line-height:22px;text-align:center;opacity:.85}',
    /* 패널 */
    '.ob-panel{position:fixed;right:20px;bottom:84px;z-index:99999;width:min(370px,calc(100vw - 32px));max-height:min(78vh,620px);display:none;flex-direction:column;overflow:hidden;border-radius:22px;background:var(--ob-bg);color:var(--ob-text);border:1px solid var(--ob-line);box-shadow:0 30px 80px -20px rgba(0,0,0,.55);animation:obUp .28s cubic-bezier(.16,1,.3,1)}',
    '.ob-panel.on{display:flex}',
    '@keyframes obUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
    '.ob-head{display:flex;align-items:center;gap:12px;padding:16px 16px;background:linear-gradient(120deg,var(--ob-accent),var(--ob-accent2));color:#fff}',
    '.ob-head .ob-av{border-radius:50%;background:rgba(255,255,255,.15)}',
    '.ob-head b{font-size:16px;font-weight:900;display:block;line-height:1.2}',
    '.ob-head i{font-size:11.5px;opacity:.9;font-style:normal}',
    '.ob-head .ob-close{margin-left:auto;width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.22);color:#fff;font-size:15px;cursor:pointer}',
    '.ob-body{flex:1;overflow-y:auto;padding:15px;font-size:14px;-webkit-overflow-scrolling:touch}',
    '.ob-hi{color:var(--ob-sub);margin:0 2px 13px;font-size:13.5px;line-height:1.6}',
    '.ob-hi b{color:var(--ob-text)}',
    '.ob-cats{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
    '.ob-cat{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:13px;border:1px solid var(--ob-line);border-radius:15px;background:var(--ob-card);color:inherit;cursor:pointer;text-align:left;font-family:inherit;transition:transform .15s,border-color .15s}',
    '.ob-cat:hover{transform:translateY(-2px);border-color:var(--ob-accent)}',
    '.ob-cat .e{font-size:21px}.ob-cat .l{font-size:12.5px;font-weight:800;line-height:1.35}',
    '.ob-back{display:inline-flex;align-items:center;gap:5px;background:none;border:0;color:var(--ob-accent);font-weight:800;font-size:12.5px;cursor:pointer;padding:0;margin-bottom:12px;font-family:inherit}',
    '.ob-sech{font-weight:900;font-size:15px;margin:0 0 4px;display:flex;align-items:center;gap:7px}',
    '.ob-secs{color:var(--ob-sub);font-size:12.5px;line-height:1.6;margin:0 0 14px}',
    '.ob-q{border:1px solid var(--ob-line);border-radius:13px;overflow:hidden;margin-bottom:9px;background:var(--ob-card)}',
    '.ob-qbtn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 13px;background:none;border:0;color:inherit;cursor:pointer;text-align:left;font-size:13px;font-weight:700;font-family:inherit}',
    '.ob-qbtn .c{color:var(--ob-sub);transition:transform .2s}',
    '.ob-q.open .ob-qbtn .c{transform:rotate(90deg)}',
    '.ob-a{max-height:0;overflow:hidden;transition:max-height .3s ease;padding:0 13px}',
    '.ob-q.open .ob-a{max-height:600px;padding-bottom:12px}',
    '.ob-a p{margin:0 0 9px;color:var(--ob-sub);font-size:12.5px;line-height:1.65}',
    '.ob-links{display:flex;flex-wrap:wrap;gap:6px}',
    '.ob-link{display:inline-flex;align-items:center;padding:7px 11px;border-radius:9px;background:var(--ob-accent);color:#fff;text-decoration:none;font-size:12px;font-weight:800;transition:filter .15s}',
    '.ob-link:hover{filter:brightness(1.08)}',
    '.ob-link.alt{background:transparent;color:var(--ob-accent);border:1px solid var(--ob-accent)}',
    '.ob-foot{padding:10px;text-align:center;font-size:11px;color:var(--ob-sub);border-top:1px solid var(--ob-line)}',
    '.ob-body::-webkit-scrollbar{width:7px}.ob-body::-webkit-scrollbar-thumb{background:var(--ob-line);border-radius:9px}',
  ].join("");

  /* ── 마운트 ── */
  var st = document.createElement("style");
  st.id = "onbot-style"; st.textContent = CSS;
  document.head.appendChild(st);

  var root = document.createElement("div");
  root.id = "onbot";
  root.innerHTML =
    '<button class="ob-fab" id="obFab" aria-label="온봇 열기">' + avatar(38) + '<span class="ob-dot"></span><span>온봇</span></button>' +
    '<div class="ob-bubble" id="obBubble"><button class="ob-x" id="obBubbleX" aria-label="닫기">✕</button><span id="obBubbleTxt"></span></div>' +
    '<div class="ob-panel" id="obPanel" role="dialog" aria-label="온봇 챗봇">' +
      '<div class="ob-head">' + avatar(40) + '<div><b>온봇</b><i>온종일 AI 노출 안내 도우미</i></div><button class="ob-close" id="obClose" aria-label="닫기">✕</button></div>' +
      '<div class="ob-body" id="obBody"></div>' +
      '<div class="ob-foot">온종일 · AI 검색 노출 컨설팅</div>' +
    '</div>';
  document.body.appendChild(root);

  var fab = document.getElementById("obFab");
  var panel = document.getElementById("obPanel");
  var body = document.getElementById("obBody");
  var bubble = document.getElementById("obBubble");
  var bubbleTxt = document.getElementById("obBubbleTxt");
  var open = false, bubbleDismissed = false, bubbleIdx = 0, bubbleTimer;

  /* ── 렌더: 홈(카테고리) ── */
  function renderHome() {
    body.innerHTML =
      '<p class="ob-hi">안녕하세요, <b>온봇</b>이에요! 👋<br>AI 검색에 우리 가게·사이트를 노출하는 법, 무엇이 궁금하세요?</p>' +
      '<div class="ob-cats">' +
      CATS.map(function (c, i) {
        return '<button class="ob-cat" data-cat="' + i + '"><span class="e">' + c.icon + '</span><span class="l">' + c.label + '</span></button>';
      }).join("") + "</div>";
    body.querySelectorAll(".ob-cat").forEach(function (b) {
      b.addEventListener("click", function () { renderCat(+b.dataset.cat); });
    });
    body.scrollTop = 0;
  }

  /* ── 렌더: 카테고리 상세(Q&A 아코디언) ── */
  function renderCat(i) {
    var c = CATS[i];
    body.innerHTML =
      '<button class="ob-back" id="obBack">← 처음으로</button>' +
      '<div class="ob-sech">' + c.icon + " " + c.label + "</div>" +
      '<p class="ob-secs">' + c.intro + "</p>" +
      c.items.map(function (it, k) {
        return '<div class="ob-q" data-q="' + k + '">' +
          '<button class="ob-qbtn"><span>' + it.q + '</span><span class="c">›</span></button>' +
          '<div class="ob-a"><p>' + it.a + "</p>" +
          '<div class="ob-links">' + (it.links || []).map(function (l) {
            var alt = l[1].indexOf("mailto:") === 0 ? " alt" : "";
            var ext = l[1].indexOf("mailto:") === 0 ? "" : '';
            return '<a class="ob-link' + alt + '" href="' + l[1] + '"' + ext + '>' + l[0] + "</a>";
          }).join("") + "</div></div></div>";
      }).join("");
    body.querySelector("#obBack").addEventListener("click", renderHome);
    body.querySelectorAll(".ob-q .ob-qbtn").forEach(function (b) {
      b.addEventListener("click", function () { b.parentElement.classList.toggle("open"); });
    });
    body.scrollTop = 0;
  }

  /* ── 열기/닫기 ── */
  function openPanel() {
    open = true; panel.classList.add("on"); fab.style.display = "none";
    hideBubble(); bubbleDismissed = true;
    if (!body.innerHTML) renderHome(); else renderHome();
  }
  function closePanel() {
    open = false; panel.classList.remove("on"); fab.style.display = "";
  }
  fab.addEventListener("click", openPanel);
  document.getElementById("obClose").addEventListener("click", closePanel);

  /* ── 주기적 말풍선 ── */
  function showBubble() {
    if (open || bubbleDismissed) return;
    bubbleTxt.textContent = BUBBLES[bubbleIdx % BUBBLES.length];
    bubbleIdx++;
    bubble.classList.add("on");
    clearTimeout(showBubble._h);
    showBubble._h = setTimeout(hideBubble, 6000); // 6초 보여주고 숨김
  }
  function hideBubble() { bubble.classList.remove("on"); }
  bubble.addEventListener("click", function (e) { if (e.target.id !== "obBubbleX") openPanel(); });
  document.getElementById("obBubbleX").addEventListener("click", function (e) {
    e.stopPropagation(); hideBubble(); bubbleDismissed = true; clearInterval(bubbleTimer);
  });

  // 첫 등장 3.5초 후, 이후 13초 간격으로 멘트 로테이션
  setTimeout(function () {
    showBubble();
    bubbleTimer = setInterval(showBubble, 13000);
  }, 3500);

  // ESC로 닫기
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) closePanel(); });
})();
