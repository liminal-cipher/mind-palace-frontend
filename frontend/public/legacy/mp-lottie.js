/* mp-lottie.js — 스크롤 진입 시 Lottie 재생, 텍스트는 원본 SVG 오버레이로 정렬 */
(function () {
  if (typeof window === "undefined") return;
  var prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduce || !window.lottie) return;
  var GEOM = ["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"];
  function enhance(fig) {
    if (fig.__init) return fig.__anim; fig.__init = true;
    var src = fig.getAttribute("data-lottie"), isImg = fig.getAttribute("data-kind") === "image";
    var original = fig.querySelector("svg, img");
    var mount = document.createElement("div"); mount.className = "lottie-mount"; fig.appendChild(mount);
    if (!isImg && original && original.tagName && original.tagName.toLowerCase() === "svg") {
      var ov = original.cloneNode(true); ov.removeAttribute("role"); ov.removeAttribute("aria-label");
      ov.setAttribute("aria-hidden", "true"); ov.classList.add("lottie-text-overlay");
      GEOM.forEach(function (t) { var e = ov.querySelectorAll(t); for (var i = 0; i < e.length; i++) e[i].parentNode.removeChild(e[i]); });
      fig.appendChild(ov);
    }
    var anim = lottie.loadAnimation({ container: mount, renderer: "svg", loop: false, autoplay: false, path: src,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false } });
    fig.__anim = anim;
    anim.addEventListener("DOMLoaded", function () { fig.classList.add("enhanced"); });
    anim.addEventListener("data_failed", function () { fig.classList.remove("enhanced"); });
    return anim;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return; var fig = e.target; var anim = enhance(fig);
      if (anim) { try { anim.goToAndPlay(0, true); } catch (_) {} fig.classList.add("playing"); }
      io.unobserve(fig);
    });
  }, { threshold: 0.3, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".viz-anim[data-lottie]").forEach(function (fig) { io.observe(fig); });
})();
