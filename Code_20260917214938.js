/* ═══════════════════════════════════════════════════════════
   主题切换器：挂到 script.js 末尾，renderAll() 之前
   不改你任何原有代码、不新增人物内容
   ═══════════════════════════════════════════════════════════ */
(function(){
  var TK = "gongdou_skin_v1";
  var def = { warm:"archived", glass:"off", soft:"off", size:"mid" };
  var s = Object.assign({}, def, JSON.parse(localStorage.getItem(TK) || "{}"));
  var root = document.documentElement;

  function apply(){
    root.setAttribute("data-warm", s.warm);
    root.setAttribute("data-glass", s.glass);
    root.setAttribute("data-soft", s.soft);
    root.style.setProperty("--fs", s.size === "small" ? "14px" : s.size === "big" ? "19px" : "16px");
    var dots = root.querySelectorAll(".dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].setAttribute("aria-current", dots[i].dataset.t === s.warm ? "true" : "false");
    }
    var segs = root.querySelectorAll(".seg");
    for (var g = 0; g < segs.length; g++) {
      var grp = segs[g].dataset.grp;
      var btns = segs[g].querySelectorAll("button");
      for (var b = 0; b < btns.length; b++) {
        btns[b].setAttribute("aria-current", btns[b].dataset.v === s[grp] ? "true" : "false");
      }
    }
  }
  function save(){ localStorage.setItem(TK, JSON.stringify(s)); }

  if (!document.getElementById("themeFab")) {
    var fab = document.createElement("button");
    fab.id = "themeFab";
    fab.textContent = "调";
    fab.title = "调档案皮";
    document.body.appendChild(fab);

    var p = document.createElement("div");
    p.id = "themePanel";
    p.innerHTML =
      '<div class="tRow"><span>底色</span><div class="dots">' +
        '<div class="dot" data-t="archived" title="墨黑·米黄纸"></div>' +
        '<div class="dot" data-t="warm" title="暖檀·旧纸"></div>' +
        '<div class="dot" data-t="cold" title="冷夜·铁灰"></div>' +
      '</div></div>' +
      '<div class="tRow"><span>卡片</span><div class="seg" data-grp="glass">' +
        '<button data-v="off">实</button><button data-v="on">透</button></div></div>' +
      '<div class="tRow"><span>边角</span><div class="seg" data-grp="soft">' +
        '<button data-v="off">方</button><button data-v="on">柔</button></div></div>' +
      '<div class="tRow"><span>字号</span><div class="seg" data-grp="size">' +
        '<button data-v="small">小</button><button data-v="mid">中</button><button data-v="big">大</button></div></div>' +
      '<div class="tFoot"><small>存本机·不上传</small><button id="tReset">复原</button></div>';
    document.body.appendChild(p);

    fab.onclick = function(){ p.classList.toggle("open"); };
    document.addEventListener("click", function(e){
      if (!p.contains(e.target) && e.target !== fab) p.classList.remove("open");
    });

    var dots2 = p.querySelectorAll(".dot");
    for (var d = 0; d < dots2.length; d++) {
      dots2[d].onclick = (function(el){ return function(){
        s.warm = el.dataset.t; save(); apply();
      }; })(dots2[d]);
    }
    var segs2 = p.querySelectorAll(".seg");
    for (var g2 = 0; g2 < segs2.length; g2++) {
      (function(grpEl){
        var btns2 = grpEl.querySelectorAll("button");
        for (var b2 = 0; b2 < btns2.length; b2++) {
          btns2[b2].onclick = (function(btn){ return function(){
            s[grpEl.dataset.grp] = btn.dataset.v; save(); apply();
          }; })(btns2[b2]);
        }
      })(segs2[g2]);
    }
    p.querySelector("#tReset").onclick = function(){ s = Object.assign({}, def); save(); apply(); };
  }
  apply();
})();

renderAll();
