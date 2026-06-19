/* 상단 RAG 진행바 — PDF 분석(GraphRAG)이 백그라운드로 도는 동안 모든 페이지 상단에 진행 상태를 띄운다.
   localStorage 'mp_rag_job' = {jobId, base, filename, startedAt}. 업로드(home.html)에서 비블로킹으로 시작하고,
   이 스크립트가 어느 페이지에서든 이어받아 폴링한다. palace_ready 되면 mp_palace 저장 + 'mp-rag-ready' 이벤트 발행
   (구성·노드 화면 해금에 사용). 각 페이지에 <script src="rag-status.js" defer></script> 한 줄로 동작. */
(function () {
  try {
    var P = new URLSearchParams(location.search);
    if (P.get("dash") === "1" || window.self !== window.top) return; // 임베드(대시보드 iframe)·dash 모드엔 미주입

    var job = null;
    try { job = JSON.parse(localStorage.getItem("mp_rag_job") || "null"); } catch (_) {}
    if (!job || !job.jobId || !job.base) return; // 진행 중인 분석 없음
    if (job.done) { try { window.dispatchEvent(new CustomEvent("mp-rag-ready")); } catch (_) {} return; } // 이미 완료

    var STAGE = {
      QUEUED:        { pct: 35,  label: "대기 중" },
      PREPROCESSING: { pct: 52,  label: "텍스트·이미지 추출" },
      INDEXING:      { pct: 72,  label: "개념 그래프 인덱싱" },
      PALACE_READY:  { pct: 95,  label: "방 구성" },
      RAG_READY:     { pct: 98,  label: "마무리" },
      DONE:          { pct: 100, label: "완료" }
    };

    var css =
      "#mpRagBar{position:fixed;top:0;left:0;height:4px;width:0;z-index:10001;" +
      "background:linear-gradient(90deg,#b5552f,#c4623a);box-shadow:0 0 8px rgba(181,85,47,.55);" +
      "transition:width .6s ease;border-radius:0 3px 3px 0;}" +
      "#mpRagChip{position:fixed;top:54px;right:14px;z-index:10001;display:flex;align-items:center;gap:9px;" +
      "max-width:min(340px,calc(100vw - 28px));padding:9px 12px;border-radius:12px;" +
      "background:rgba(245,241,234,.96);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);" +
      "border:1px solid rgba(51,46,40,.14);box-shadow:0 8px 24px rgba(40,34,26,.16);" +
      "font-family:'Pretendard','Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif;font-size:12.5px;color:#2a241d;}" +
      "#mpRagChip .rg-ic{font-size:15px;flex:none;}" +
      "#mpRagChip .rg-ic.spin{animation:mpRagSpin 1.6s linear infinite;}" +
      "@keyframes mpRagSpin{to{transform:rotate(360deg);}}" +
      "#mpRagChip .rg-tx{font-weight:700;line-height:1.35;min-width:0;}" +
      "#mpRagChip .rg-tx small{display:block;color:rgba(42,36,29,.6);font-weight:500;font-size:11px;" +
      "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;}" +
      "#mpRagChip .rg-go{flex:none;text-decoration:none;font-weight:800;font-size:12px;color:#fff;" +
      "background:linear-gradient(180deg,#b5552f,#c4623a);padding:6px 11px;border-radius:9px;display:none;}" +
      "#mpRagChip .rg-go:hover{filter:brightness(1.07);}" +
      "#mpRagChip .rg-x{flex:none;background:none;border:none;color:rgba(42,36,29,.5);font-size:14px;cursor:pointer;padding:2px 3px;line-height:1;}" +
      "#mpRagChip .rg-x:hover{color:#2a241d;}" +
      "#mpRagChip.rg-done .rg-ic.spin{animation:none;}" +
      "#mpRagChip.rg-done .rg-go{display:inline-block;}";
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    var bar = document.createElement("div"); bar.id = "mpRagBar";
    var chip = document.createElement("div"); chip.id = "mpRagChip";
    chip.innerHTML =
      '<span class="rg-ic spin" id="mpRagIc">📚</span>' +
      '<div class="rg-tx"><span id="mpRagLabel">PDF 분석 중…</span><small>' +
        (job.filename ? String(job.filename).replace(/[<>&"]/g, "") : "학습자료") + "</small></div>" +
      '<a class="rg-go" id="mpRagGo" href="compose.html">방 미리보기 →</a>' +
      '<button class="rg-x" id="mpRagX" title="숨기기">✕</button>';

    function mount() {
      document.body.appendChild(bar);
      document.body.appendChild(chip);
      document.getElementById("mpRagX").onclick = function () { chip.style.display = "none"; bar.style.display = "none"; };
    }
    if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

    function setBar(pct) { bar.style.width = Math.max(2, Math.min(100, pct)) + "%"; }
    function setLabel(t) { var el = document.getElementById("mpRagLabel"); if (el) el.textContent = t; }

    var stopped = false;
    function finish() {
      stopped = true;
      setBar(100); setLabel("분석 완료 · 방 미리보기로");
      chip.classList.add("rg-done");
      var ic = document.getElementById("mpRagIc"); if (ic) ic.textContent = "✅";
      try { job.done = true; localStorage.setItem("mp_rag_job", JSON.stringify(job)); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent("mp-rag-ready")); } catch (_) {}
    }
    function fail(msg) {
      stopped = true;
      setLabel("분석 실패: " + (msg || "오류"));
      bar.style.background = "#c0463e";
      var ic = document.getElementById("mpRagIc"); if (ic) { ic.textContent = "⚠️"; ic.classList.remove("spin"); }
    }

    async function poll() {
      if (stopped) return;
      try {
        var r = await fetch(job.base + "/orchestrator/jobs/" + job.jobId + "/status");
        if (r.ok) {
          var s = await r.json();
          var stg = STAGE[s.state];
          if (stg) { setBar(stg.pct); setLabel("PDF 분석 중 · " + stg.label); }
          if (s.state === "FAILED") { fail(s.error); return; }
          if (s.palace_ready) {
            var pr = await fetch(job.base + "/orchestrator/jobs/" + job.jobId + "/palace");
            if (pr.ok) {
              var text = await pr.text();
              JSON.parse(text); // 형식 검증
              try { sessionStorage.setItem("mp_palace", text); localStorage.setItem("mp_palace", text); } catch (_) {}
              finish(); return;
            }
          }
        }
      } catch (_) {}
      setTimeout(poll, 3000);
    }
    setBar(20); setLabel("PDF 분석 중…"); setTimeout(poll, 1200);
  } catch (e) { /* 진행바 실패는 페이지 동작에 영향 주지 않음 */ }
})();
