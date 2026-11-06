/* 封面与捏人（由 交付/05-封面与捏人-预览.html 生成，勿手改）
   Shadow DOM 隔离：原型里的 :root / * / html[data-motion] 都只在 shadow 内生效。
   性能分级见 PERF，手机端自动降档。 */
(function(){
  "use strict";
  var HOSTEL = document.getElementById('cvHost');
  if(!HOSTEL || HOSTEL.dataset.on === '1') return;
  HOSTEL.dataset.on = '1';

  var CV_CSS = ":host{\n  --ink-0:#05030A;--ink-1:#0A0614;--ink-2:#100A1E;--ink-3:#170F29;\n  --text:#EFE9F8;--text-2:#B3A5C9;--text-3:#7A6C93;--text-4:#4C4260;\n  --gold:#D9B36A;--gold-hi:#F6E3AE;--gold-dim:#8A6F3C;\n  --violet:#8C5CFF;--violet-hi:#C9AEFF;--ice:#7FE3F0;--blood:#E4566E;--jade:#6FD6AE;\n  --sys:#D4485E;--sys-hi:#FF8A9B;\n  --line-1:rgba(255,255,255,.10);--line-2:rgba(255,255,255,.055);--line-gold:rgba(217,179,106,.26);\n  --serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",\"SimSun\",serif;\n  --kai:\"STKaiti\",\"KaiTi\",\"Kaiti SC\",\"楷体\",\"Songti SC\",\"SimSun\",serif;\n  --sans:\"PingFang SC\",\"HarmonyOS Sans SC\",\"Microsoft YaHei UI\",\"Microsoft YaHei\",system-ui,-apple-system,\"Segoe UI\",sans-serif;\n  --num:\"Optima\",\"Palatino Linotype\",Georgia,serif;\n  --steps-w:76px;--sum-w:300px;\n  color-scheme:dark;\n}\n*{box-sizing:border-box}\n:host{display:block;height:100%;margin:0}\n:host{background:var(--ink-0);color:var(--text);font-family:var(--sans);font-size:14px;line-height:1.65;\n  -webkit-font-smoothing:antialiased;overflow:hidden}\nbutton{font:inherit;color:inherit;background:none;border:0;cursor:pointer}\ninput,textarea{font:inherit;color:inherit}\n:focus-visible{outline:2px solid var(--gold);outline-offset:3px}\n::-webkit-scrollbar{width:6px;height:6px}\n::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(217,179,106,.42),rgba(140,92,255,.34));border-radius:6px}\n[hidden]{display:none!important}\n.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.grain{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:.11;mix-blend-mode:overlay;\n  background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='.5'/></svg>\")}\n#space{position:fixed;inset:0;width:100%;height:100%;z-index:0;display:block}\n\n\n/* ═════ 封面 ═════ */\n.cv{position:fixed;inset:0;z-index:8000;overflow:hidden;cursor:default;background:#030208;\n  transition:opacity .4s ease}\n.cv[data-state=\"leaving\"]{opacity:0;pointer-events:none}\n.cv.no-anim,.cv.no-anim *{transition:none!important;animation:none!important}\n/* 已经完整看过一次封面了：入场动画不再重播，回封面立刻是完整画面 */\n.cv.entered .cv__meta,.cv.entered .cv__title,.cv.entered .cv__sub,\n.cv.entered .cv__act,.cv.entered .cv__sign{animation:none}\n\n/* ── 舞台：不再往门里钻，只做一点点漂移，交给星河去走 ── */\n.cv__stage{position:absolute;inset:0;z-index:1;transform-origin:50% 50%;\n  will-change:transform;backface-visibility:hidden;\n  transition:transform 1.15s cubic-bezier(.32,0,.24,1)}\n.cv.is-jumping .cv__stage{transform:scale(1.05)}\n.cv__room{position:absolute;inset:0;pointer-events:none;will-change:transform}\n\n.cv__wall{position:absolute;inset:0;\n  background:\n    linear-gradient(114deg,rgba(255,240,214,.026) 0%,rgba(255,232,196,.010) 26%,transparent 46%),\n    radial-gradient(52% 44% at 50% 56%,rgba(120,82,48,.10),transparent 74%),\n    radial-gradient(120% 100% at 50% 50%,#080410 0%,#040208 58%,#020106 100%)}\n.cv__texture{position:absolute;inset:0;opacity:.5;mix-blend-mode:soft-light;\n  background:\n    radial-gradient(18% 22% at 22% 18%,rgba(255,255,255,.05),transparent 70%),\n    radial-gradient(24% 16% at 62% 62%,rgba(255,255,255,.035),transparent 72%),\n    radial-gradient(30% 20% at 12% 76%,rgba(255,255,255,.03),transparent 74%),\n    repeating-linear-gradient(96deg,rgba(255,255,255,.012) 0 1px,transparent 1px 7px)}\n.cv__vignette{position:absolute;inset:0;z-index:6;\n  background:\n    linear-gradient(180deg,rgba(2,1,5,.66) 0%,transparent 24%),\n    linear-gradient(0deg,rgba(2,1,5,.62) 0%,transparent 20%),\n    radial-gradient(118% 94% at 50% 50%,transparent 32%,rgba(2,1,5,.70) 80%,rgba(2,1,5,.94) 100%)}\n\n/* 门框：居中的两扇门 */\n.cv__frame{position:absolute;inset:0;transition:opacity .5s ease}\n.cv__frame i{position:absolute;background:linear-gradient(180deg,transparent,rgba(255,226,170,.16) 20%,rgba(255,226,170,.22) 50%,rgba(255,226,170,.14) 80%,transparent)}\n.cv__frame i.l{left:43%;top:0;bottom:0;width:1px;transition:transform 1.15s cubic-bezier(.42,0,.72,.38)}\n.cv__frame i.r{left:57%;top:0;bottom:0;width:1px;transition:transform 1.15s cubic-bezier(.42,0,.72,.38)}\n.cv__frame i.t{left:43%;right:43%;top:8.2%;height:1px;\n  background:linear-gradient(90deg,rgba(255,226,170,.08),rgba(255,226,170,.24),rgba(255,226,170,.08))}\n\n/* 门后的光：一开始只有 2px，门缝里透出的是星空 */\n.cv__portal{position:absolute;top:7.5%;bottom:9%;left:50%;width:2px;transform:translateX(-50%);\n  background:\n    linear-gradient(90deg,rgba(212,230,255,0) 0%,rgba(240,247,255,1) 4%,rgba(178,204,255,.34) 14%,\n      rgba(108,92,196,.09) 33%,rgba(74,62,158,.05) 50%,rgba(108,92,196,.09) 67%,\n      rgba(178,204,255,.34) 86%,rgba(240,247,255,1) 96%,rgba(212,230,255,0) 100%),\n    linear-gradient(180deg,rgba(146,176,255,0) 0%,rgba(164,196,255,.46) 9%,rgba(150,168,255,.14) 32%,\n      rgba(150,168,255,.14) 68%,rgba(164,196,255,.46) 92%,rgba(146,176,255,0) 100%);\n  box-shadow:0 0 14px 3px rgba(198,220,255,.42);\n  filter:blur(.3px);animation:breath 7.2s ease-in-out infinite;\n  transition:width 1.02s cubic-bezier(.38,0,.18,1),filter .8s ease}\n/* 门缝的两条硬边：宽度张开时它们跟着分开，才像\"门\"而不是一团雾 */\n.cv__portal::before,.cv__portal::after{content:\"\";position:absolute;top:0;bottom:0;width:1.5px;margin-left:-.75px;\n  background:linear-gradient(180deg,rgba(236,246,255,0) 0%,rgba(238,248,255,.92) 10%,#FFFFFF 48%,rgba(238,248,255,.92) 90%,rgba(236,246,255,0) 100%);\n  box-shadow:0 0 9px 2px rgba(198,224,255,.75),0 0 26px 8px rgba(140,160,255,.32)}\n.cv__portal::before{left:0}\n.cv__portal::after{left:100%}\n@keyframes breath{0%,100%{opacity:.9}50%{opacity:1}}\n/* 星辉：一圈圆形光晕从中心胀开——不是门缝张开 */\n.cv__glow{position:absolute;left:50%;top:47%;width:74vmax;height:74vmax;\n  margin:-37vmax 0 0 -37vmax;border-radius:50%;\n  transform:scale(.05);transform-origin:50% 50%;\n  background:radial-gradient(circle at 50% 50%,rgba(232,240,255,.44) 0%,rgba(178,206,255,.26) 20%,\n    rgba(146,112,255,.13) 40%,rgba(88,68,186,.05) 58%,transparent 74%);\n  opacity:.004;pointer-events:none;will-change:transform,opacity;\n  transition:transform .92s cubic-bezier(.22,.61,.2,1),opacity .5s ease}\n.cv.is-jumping .cv__glow{transform:scale(1.32);opacity:.62}\n.cv__spill{position:absolute;left:50%;top:0;bottom:0;width:34%;transform:translateX(-50%);\n  background:\n    radial-gradient(30% 46% at 50% 46%,rgba(212,224,255,.16),rgba(150,172,255,.07) 54%,transparent 78%),\n    linear-gradient(90deg,transparent,rgba(255,206,148,.05) 26%,rgba(232,226,255,.13) 50%,rgba(255,206,148,.05) 74%,transparent);\n  filter:blur(16px);pointer-events:none;transition:opacity .28s ease}\n.cv__recess{position:absolute;left:43%;right:43%;top:0;bottom:0;pointer-events:none;\n  background:linear-gradient(90deg,rgba(0,0,0,.16),transparent 22%,transparent 78%,rgba(0,0,0,.16));\n  box-shadow:inset 0 0 60px 18px rgba(255,206,150,.05)}\n.cv.is-jumping .cv__portal{animation:none;opacity:0;filter:blur(9px);\n  transition:opacity .4s ease,filter .4s ease}\n/* 交接时门缝已经淡掉，不留柱子压在新界面上 */\n.cv[data-state=\"leaving\"] .cv__portal{opacity:0}\n\n/* 地面光池 */\n.cv__floor{position:absolute;left:28%;width:44%;top:90%;height:16%;\n  background:linear-gradient(180deg,rgba(255,222,172,.26),rgba(255,206,150,.08) 44%,transparent 84%);\n  transform:perspective(420px) rotateX(58deg);transform-origin:top center;filter:blur(10px);opacity:.8}\n.cv__floorline{position:absolute;left:28%;right:28%;top:90%;height:1px;\n  background:linear-gradient(90deg,transparent,rgba(255,224,176,.10) 30%,rgba(255,234,192,.30) 78%,rgba(255,224,176,.10) 100%)}\n\n.cv__dust{position:absolute;inset:0;overflow:hidden;z-index:3}\n.cv__dust i{position:absolute;border-radius:50%;background:#FFEFD2;\n  box-shadow:0 0 7px 1px rgba(255,224,170,.5);\n  animation:dustUp var(--dur,20s) linear infinite;animation-delay:var(--dl,0s)}\n@keyframes dustUp{0%{transform:translate3d(0,0,0);opacity:0}\n  9%{opacity:var(--o,.4)}82%{opacity:var(--o,.4)}\n  100%{transform:translate3d(var(--dx,0),-84px,0);opacity:0}}\n\n/* ── 门里的星空 ── */\n.cv__neb{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.002;will-change:opacity;\n  transition:opacity .85s ease;\n  background:\n    radial-gradient(26% 40% at 50% 44%,rgba(118,158,255,.30),transparent 72%),\n    radial-gradient(20% 30% at 41% 58%,rgba(176,104,255,.26),transparent 74%),\n    radial-gradient(17% 25% at 59% 34%,rgba(96,226,255,.20),transparent 76%),\n    radial-gradient(15% 22% at 55% 66%,rgba(255,198,140,.13),transparent 76%),\n    radial-gradient(44% 28% at 50% 80%,rgba(120,80,220,.15),transparent 78%)}\n.cv.is-jumping .cv__neb{opacity:.85}\n.cv__stars{position:absolute;inset:0;z-index:3;width:100%;height:100%;pointer-events:none;opacity:.002;will-change:opacity;\n  transition:opacity .3s ease}\n.cv.is-jumping .cv__stars{opacity:1}\n\n/* ── 起飞：把每帧都要重绘的东西摘掉，只留合成层 ── */\n.cv[data-fly=\"1\"] .cv__frame{opacity:0}\n.cv[data-fly=\"1\"] .cv__dust,\n.cv[data-fly=\"1\"] .cv__texture,\n.cv[data-fly=\"1\"] .cv__spill,\n.cv[data-fly=\"1\"] .cv__recess,\n.cv[data-fly=\"1\"] .cv__floor,\n.cv[data-fly=\"1\"] .cv__floorline{visibility:hidden}\n.cv[data-fly=\"1\"] .cv__dust{animation-play-state:paused}\n\n/* ── 版面：左按钮 / 中门缝 / 右标题 ── */\n.cv__ui{position:absolute;inset:0;z-index:5;pointer-events:none;\n  transition:opacity .32s ease}\n.cv.is-jumping .cv__ui{opacity:0}\n\n.cv__meta{position:absolute;left:0;right:0;top:clamp(24px,4.2vh,46px);margin:0;\n  display:flex;align-items:center;justify-content:center;gap:14px;\n  font-family:var(--serif);font-size:9.5px;letter-spacing:.42em;color:rgba(239,233,248,.34);\n  animation:fadeIn 1.1s ease .5s both}\n.cv__meta::before,.cv__meta::after{content:\"\";width:34px;height:1px}\n.cv__meta::before{background:linear-gradient(270deg,rgba(217,179,106,.55),transparent)}\n.cv__meta::after{background:linear-gradient(90deg,rgba(217,179,106,.55),transparent)}\n\n/* 左：竖排按钮 */\n.cv__act{position:absolute;left:clamp(34px,19vw,286px);top:50%;transform:translateY(-50%);\n  display:flex;flex-direction:column;align-items:flex-start;gap:clamp(14px,2.2vh,22px);\n  pointer-events:auto;animation:fadeUp .9s cubic-bezier(.2,.8,.2,1) .9s both}\n.cv__enter{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:14px;\n  width:clamp(196px,16.4vw,244px);min-height:56px;padding:0 20px 0 26px;border:0;border-radius:2px;\n  overflow:hidden;background:linear-gradient(102deg,#F8E9C4 0%,#E8CB92 46%,#D2A863 100%);\n  font-family:var(--serif);font-size:13.5px;font-weight:500;letter-spacing:.24em;text-indent:.24em;\n  color:#2A1A06;transition:.38s cubic-bezier(.2,.8,.2,1);\n  box-shadow:0 16px 40px -18px rgba(232,203,146,.85),inset 0 0 0 1px rgba(255,255,255,.42)}\n.cv__enter i{width:24px;height:1px;background:#2A1A06;position:relative;transition:.38s;opacity:.7}\n.cv__enter i::after{content:\"\";position:absolute;right:0;top:-2.5px;width:5px;height:5px;\n  border-top:1px solid #2A1A06;border-right:1px solid #2A1A06;transform:rotate(45deg)}\n.cv__enter::after{content:\"\";position:absolute;inset:0;pointer-events:none;opacity:0;\n  background:linear-gradient(100deg,transparent 24%,rgba(255,255,255,.55) 50%,transparent 76%);\n  transform:translateX(-120%);transition:transform .9s ease,opacity .3s}\n.cv__enter:hover{transform:translateY(-1px);\n  box-shadow:0 20px 52px -18px rgba(248,233,196,1),inset 0 0 0 1px rgba(255,255,255,.6)}\n.cv__enter:hover i{width:32px;opacity:1}\n.cv__enter:hover::after{opacity:1;transform:translateX(120%)}\n\n.cv__alt{display:flex;flex-direction:column;align-items:stretch;width:clamp(196px,16.4vw,244px);\n  border-top:1px solid rgba(217,179,106,.16);padding-top:6px}\n.cv__alt button{position:relative;display:flex;align-items:center;gap:11px;\n  font-family:var(--serif);font-size:12px;letter-spacing:.2em;color:rgba(196,182,216,.64);\n  padding:9px 2px;transition:.26s;text-align:left}\n.cv__alt button::before{content:\"\";width:13px;height:1px;flex:0 0 auto;\n  background:rgba(217,179,106,.30);transition:.26s}\n.cv__alt button:hover{color:var(--gold-hi);padding-left:6px}\n.cv__alt button:hover::before{width:20px;background:rgba(246,227,174,.8)}\n\n/* 右：竖排标题 */\n.cv__title{position:absolute;right:clamp(34px,17.5vw,264px);top:50%;transform:translateY(-50%);\n  display:flex;flex-direction:row;align-items:center;\n  gap:clamp(12px,1.5vw,26px);animation:fadeIn 1.2s ease .35s both}\n.cv__name{margin:0;writing-mode:vertical-rl;font-family:var(--kai);font-weight:600;\n  font-size:clamp(40px,6.5vmin,80px);letter-spacing:.04em;line-height:1.0}\n.cv__name span{display:inline-block;\n  background:linear-gradient(180deg,#FFFDF4 0%,#FBEFCE 26%,#E9C98D 62%,#C69E58 100%);\n  -webkit-background-clip:text;background-clip:text;color:transparent;\n  filter:drop-shadow(0 0 30px rgba(217,179,106,.24)) drop-shadow(0 2px 12px rgba(0,0,0,.92));\n  animation:inkUp .92s cubic-bezier(.16,.84,.28,1) var(--d,0ms) both}\n@keyframes inkUp{from{opacity:0;transform:translateY(24px);filter:blur(8px)}\n  to{opacity:1;transform:none}}\n.cv__series{margin:0;writing-mode:vertical-rl;font-family:var(--serif);font-weight:400;\n  font-size:clamp(18px,2.95vmin,32px);letter-spacing:.24em;\n  color:rgba(238,228,248,.90);line-height:1}\n.cv__series b{font-weight:400;display:inline}\n.cv__series i{font-style:normal;display:inline;font-family:var(--kai);color:var(--gold);\n  font-size:clamp(14px,2.1vmin,24px);margin-top:.62em;letter-spacing:0}\n.cv__sub{align-self:flex-end;margin:0 0 clamp(4px,4vh,52px) clamp(2px,.6vw,10px);\n  writing-mode:vertical-rl;font-family:var(--serif);\n  font-size:clamp(14px,2.25vmin,24px);letter-spacing:.2em;color:rgba(198,184,220,.88);\n  animation:fadeIn 1.1s ease 1s both}\n.cv__sub b{font-weight:400;color:rgba(246,227,174,.92)}\n\n/* 底部落款 */\n.cv__sign{position:absolute;left:0;right:0;bottom:clamp(20px,3.4vh,40px);\n  display:flex;align-items:center;justify-content:center;gap:12px;pointer-events:none;\n  animation:fadeIn 1.1s ease 1.2s both}\n.cv__seal{width:32px;height:32px;display:grid;place-items:center;flex:0 0 auto;\n  background:linear-gradient(160deg,#A33B39,#6B1C22);color:#F6E2CE;font-family:var(--kai);\n  font-size:17px;line-height:1;transform:rotate(-3deg);opacity:.92;\n  box-shadow:0 0 26px -8px rgba(190,60,52,.9),inset 0 0 0 1px rgba(255,220,200,.18)}\n.cv__date{font-family:var(--num);font-size:9.5px;letter-spacing:.24em;color:rgba(196,182,214,.5)}\n\n.cv__foot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:2px;\n  font-family:var(--sans);font-size:10.5px;letter-spacing:.1em}\n.cv__motion{font-size:10.5px;letter-spacing:.12em;color:rgba(196,182,216,.72);\n  padding:7px 13px;border-radius:999px;transition:.22s;\n  border:1px solid rgba(217,179,106,.26);background:rgba(18,12,32,.62);\n  box-shadow:inset 0 0 0 1px rgba(255,255,255,.03)}\n.cv__motion:hover{color:var(--gold-hi);border-color:rgba(217,179,106,.6);background:rgba(30,20,50,.8)}\n.cv__motion[aria-pressed=\"true\"]{color:var(--gold-hi);border-color:rgba(217,179,106,.46)}\n.cv__auto{display:inline-flex;align-items:center;gap:7px;cursor:pointer;color:rgba(196,182,216,.6);transition:.2s}\n.cv__auto:hover{color:var(--text-2)}\n.cv__auto input{width:13px;height:13px;margin:0;accent-color:#D9B36A;cursor:pointer}\n.cv__auto input:checked + span{color:var(--gold-hi)}\n\n@keyframes fadeIn{from{opacity:0}to{opacity:1}}\n@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}\n\n/* 点击：尘埃向中心加速、边角压暗 */\n.cv.is-jumping .cv__dust i{animation:dustIn .9s cubic-bezier(.4,0,.8,1) forwards}\n@keyframes dustIn{0%{opacity:var(--o,.5)}\n  100%{opacity:0;transform:translate3d(calc(var(--dx,0) * -1.6),-120px,0) scale(.3)}}\n\n.flash{position:fixed;inset:0;z-index:9500;opacity:0;pointer-events:none;\n  background:radial-gradient(circle at 74% 50%,#FFF9EC 0%,rgba(255,242,214,.92) 18%,rgba(255,224,178,.40) 46%,rgba(255,214,168,0) 76%)}\n.flash.on{animation:flash .95s ease-out forwards}\n@keyframes flash{0%{opacity:0}34%{opacity:.34}100%{opacity:0}}\n.flash.reentry{background:radial-gradient(circle at 50% 46%,#FFEBCB 0%,rgba(255,188,124,.9) 24%,rgba(214,96,60,.32) 56%,rgba(120,40,20,0) 84%);animation:reentry 1.5s ease-out forwards}\n@keyframes reentry{0%{opacity:0}18%{opacity:.55}42%{opacity:.95}100%{opacity:0}}\n\n/* ═════ 捏人 ═════ */\n.cr{position:fixed;inset:0;z-index:7000;display:flex;flex-direction:column;transition:opacity .68s cubic-bezier(.4,0,.2,1);\n  background:\n    linear-gradient(90deg,rgba(6,4,12,.975) 0%,rgba(6,4,12,.955) 20%,rgba(6,4,12,.85) 32%,rgba(6,4,12,.52) 42%,rgba(6,4,12,.16) 51%,transparent 60%),\n    linear-gradient(180deg,rgba(6,4,12,.88) 0%,rgba(6,4,12,.26) 15%,transparent 32%,transparent 60%,rgba(6,4,12,.42) 86%,rgba(6,4,12,.76) 100%);\n  animation:crIn .62s cubic-bezier(.2,.8,.2,1)}\n@keyframes crIn{from{opacity:0;transform:scale(1.025)}to{opacity:1;transform:none}}\n.cr[data-out=\"1\"]{opacity:0;transform:scale(.995);transition:.45s}\n.cr-top{flex:0 0 auto;display:flex;align-items:center;gap:14px;padding:16px 24px 14px;position:relative}\n.cr-top::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:1px;\n  background:linear-gradient(90deg,rgba(217,179,106,.30),rgba(217,179,106,.10) 26%,rgba(140,92,255,.14) 64%,transparent)}\n.cr-top__k{font-family:var(--num);font-size:10px;letter-spacing:.22em;color:var(--sys);opacity:.8}\n.cr-top__t{font-family:var(--serif);font-size:13px;letter-spacing:.18em;color:var(--gold-hi)}\n.spacer{flex:1}\n.cr-tbtn{font-size:11px;letter-spacing:.1em;color:var(--text-3);padding:7px 12px;border-radius:8px;border:1px solid var(--line-2)}\n.cr-tbtn:hover{color:var(--gold-hi);border-color:var(--line-gold);background:rgba(217,179,106,.07)}\n.cr-folio{flex:1;min-height:0;display:grid;grid-template-columns:66px minmax(0,1fr) minmax(280px,33%)}\n.cr-steps{border-right:1px solid rgba(255,255,255,.05);padding:20px 0;display:flex;flex-direction:column;gap:1px;\n  background:linear-gradient(180deg,rgba(12,7,22,.34),rgba(6,4,12,.08))}\n.st{position:relative;width:100%;padding:13px 3px 12px;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-4);transition:.26s}\n.st b{font-family:var(--serif);font-size:15px;font-weight:500}\n.st i{font-style:normal;font-size:8.4px;letter-spacing:0;white-space:nowrap;line-height:1.15}\n.st:hover{color:var(--text-2)}\n.st[aria-current=\"step\"]{color:var(--gold-hi);background:linear-gradient(160deg,rgba(246,227,174,.10),rgba(140,92,255,.06))}\n.st[aria-current=\"step\"]::before{content:\"\";position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:24px;\n  border-radius:0 3px 3px 0;background:linear-gradient(180deg,var(--gold-hi),var(--gold));box-shadow:0 0 14px 1px rgba(217,179,106,.8)}\n.st.done b{color:var(--text-2)}\n.st.done::after{content:\"\";position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--gold);opacity:.65}\n.cr-main{min-width:0;overflow-y:auto;padding:26px clamp(18px,3.2vw,46px) 30px;position:relative;\n  scrollbar-width:none;-ms-overflow-style:none}\n.cr-main::-webkit-scrollbar{width:0;height:0}\n.drawer__b{scrollbar-width:none}\n.drawer__b::-webkit-scrollbar{width:0}\n.cr-in{max-width:640px;margin:0 auto}\n.cr-scene{position:relative;pointer-events:none;display:flex;flex-direction:column;align-items:flex-end;\n  padding:16px 20px 0;min-width:0}\n.od{text-align:right;font-family:var(--num);text-shadow:0 2px 18px rgba(0,0,0,.8)}\n.od__k{font-size:9px;letter-spacing:.3em;color:rgba(217,179,106,.62)}\n.od__k b{font-weight:400;color:var(--gold-hi);letter-spacing:.18em;margin-left:7px}\n.od__t{margin-top:7px;font-family:var(--serif);font-size:15px;letter-spacing:.26em;color:rgba(239,233,248,.88)}\n.od__d{margin-top:5px;font-size:10px;letter-spacing:.1em;color:rgba(179,165,201,.55)}\n.od__r{display:flex;gap:4px;justify-content:flex-end;margin-top:11px}\n.od__r i{width:15px;height:1px;background:rgba(255,255,255,.13);transition:.5s}\n.od__r i.on{background:linear-gradient(90deg,rgba(217,179,106,.9),var(--gold-hi));box-shadow:0 0 9px rgba(217,179,106,.85)}\n.od.fade{animation:odIn .7s ease-out}\n@keyframes odIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}\n.cr-h{margin:0 0 7px;font-family:var(--serif);font-size:23px;font-weight:500;letter-spacing:.1em;color:var(--gold-hi);text-shadow:0 2px 24px rgba(0,0,0,.9)}\n.cr-lead{margin:0 0 22px;font-size:12.5px;line-height:1.8;color:var(--text-3);max-width:58ch}\n.cr-lead em{font-style:normal;color:var(--text-2)}\n.fld{margin-bottom:20px}\n.fld-h{display:block;font-size:11px;letter-spacing:.14em;color:var(--text-3);margin-bottom:9px}\n.inp{width:100%;max-width:100%;padding:10px 14px;border-radius:10px;color:var(--text);\n  background:linear-gradient(158deg,rgba(26,17,44,.9),rgba(14,9,26,.95));\n  border:1px solid rgba(217,179,106,.18);transition:.24s}\n.inp::placeholder{color:var(--text-4)}\n.inp:focus{outline:none;border-color:rgba(217,179,106,.55);box-shadow:0 0 32px -12px rgba(217,179,106,.7)}\n.err{display:block;margin-top:7px;font-size:11.5px;color:#F08FA0}\n.namerow{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}\n.namebox{display:flex;align-items:center;flex:0 0 auto;width:min(280px,100%);border-radius:10px;\n  border:1px solid rgba(217,179,106,.18);overflow:hidden;\n  background:linear-gradient(158deg,rgba(26,17,44,.9),rgba(14,9,26,.95));transition:.24s}\n.namebox:focus-within{border-color:rgba(217,179,106,.55);box-shadow:0 0 32px -12px rgba(217,179,106,.7)}\n.namebox.bad{border-color:rgba(228,86,110,.6)}\n.namebox em{font-style:normal;font-family:var(--serif);font-size:17px;color:var(--gold-hi);padding:0 2px 0 14px;letter-spacing:.06em}\n.namebox input{flex:1;min-width:0;background:none;border:0;padding:10px 14px 10px 4px;outline:none;\n  font-family:var(--serif);font-size:15px;letter-spacing:.1em}\n.sug{display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:210px}\n.sug button{padding:7px 11px;border-radius:8px;font-family:var(--serif);font-size:12.5px;letter-spacing:.08em;\n  color:var(--text-2);border:1px solid var(--line-2);background:rgba(255,255,255,.015);transition:.2s}\n.sug button:hover{color:var(--gold-hi);border-color:rgba(217,179,106,.42);background:rgba(217,179,106,.08)}\n.sexes{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:340px}\n.sex{position:relative;padding:13px 10px;border-radius:10px;border:1px solid var(--line-2);\n  font-family:var(--serif);font-size:17px;letter-spacing:.3em;text-indent:.3em;color:var(--text-2);\n  background:linear-gradient(158deg,rgba(24,16,40,.7),rgba(12,7,22,.85));transition:.22s}\n.sex:hover{border-color:rgba(217,179,106,.3);color:var(--text)}\n.sex[aria-checked=\"true\"]{color:var(--gold-hi);border-color:rgba(217,179,106,.6);\n  background:linear-gradient(158deg,rgba(246,227,174,.12),rgba(140,92,255,.1));\n  box-shadow:0 0 34px -16px rgba(217,179,106,.9)}\n.sex[aria-checked=\"true\"]::after{content:\"\";position:absolute;right:10px;top:10px;width:5px;height:5px;border-radius:50%;\n  background:var(--gold-hi);box-shadow:0 0 9px 2px rgba(246,227,174,.8)}\n\n/* 分组 + 方块墙 */\n.grp{display:flex;align-items:baseline;gap:10px;margin:16px 0 8px;font-size:10.5px;letter-spacing:.2em;color:var(--gold-dim)}\n.grp:first-child{margin-top:4px}\n.grp b{font-weight:400;color:var(--text-3)}\n.grp i{font-style:normal;font-size:9.5px;letter-spacing:.06em;color:var(--text-4)}\n.grp::after{content:\"\";flex:1;height:1px;align-self:center;background:linear-gradient(90deg,rgba(217,179,106,.16),transparent)}\n.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px}\n.tile{position:relative;min-height:52px;padding:8px;border-radius:10px;border:1px solid var(--line-2);\n  display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:1.38;\n  color:var(--text-2);background:linear-gradient(158deg,rgba(24,16,40,.6),rgba(11,7,20,.8));transition:.18s}\n.tile:hover{border-color:rgba(217,179,106,.34);color:var(--text);transform:translateY(-1px)}\n.tile[data-r18=\"1\"]{border-color:rgba(228,86,110,.34);background:rgba(228,86,110,.055)}\n.tile[data-r18=\"1\"] span{color:#EFA3B2}\n.tile[data-r18=\"1\"]:hover{border-color:rgba(228,86,110,.55);background:rgba(228,86,110,.1)}\n.tile[data-r18=\"1\"][aria-checked=\"true\"]{border-color:rgba(228,86,110,.72);background:rgba(228,86,110,.16);\n  box-shadow:0 0 30px -13px rgba(228,86,110,.95)}\n.tile[aria-checked=\"true\"]{color:var(--gold-hi);border-color:rgba(217,179,106,.62);\n  background:linear-gradient(158deg,rgba(246,227,174,.13),rgba(140,92,255,.1));\n  box-shadow:0 0 30px -14px rgba(217,179,106,.95),inset 0 1px 0 rgba(255,255,255,.14)}\n.tile[aria-checked=\"true\"]::after{content:\"\";position:absolute;right:7px;top:7px;width:4px;height:4px;border-radius:50%;\n  background:var(--gold-hi);box-shadow:0 0 8px 2px rgba(246,227,174,.8)}\n.tile.long span{font-size:11px}\n.tip{position:fixed;z-index:8800;width:min(340px,86vw);max-height:min(62vh,460px);overflow:auto;padding:13px 15px;border-radius:11px;\n  background:linear-gradient(168deg,rgba(32,22,52,.98),rgba(14,9,26,.99));\n  border:1px solid rgba(217,179,106,.34);box-shadow:0 24px 60px -26px #000,inset 0 1px 0 rgba(255,255,255,.12);\n  animation:tipIn .16s ease-out}\n@keyframes tipIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}\n/* 触屏没有 hover，得说清楚\"这一下只是关气泡\" */\n@media (hover:none){\n  .tip::after{content:'点一下关闭';display:block;margin-top:10px;padding-top:8px;\n    border-top:1px solid rgba(217,179,106,.14);font-size:10px;letter-spacing:.14em;\n    color:rgba(196,182,216,.52);text-align:right}\n}\n.tip b{display:flex;align-items:center;gap:7px;font-family:var(--serif);font-size:13.5px;font-weight:500;letter-spacing:.06em;color:var(--gold-hi);margin-bottom:7px}\n.tip b i{font-style:normal;font-family:var(--num);font-size:9px;letter-spacing:.1em;color:var(--sys-hi);\n  border:1px solid rgba(212,72,94,.4);border-radius:4px;padding:0 4px}\n.tip p{margin:0;font-size:12px;line-height:1.86;color:var(--text-2)}\n.tip p + p{margin-top:8px}\n.tipsub{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 8px}\n.tipsub span{font-size:9.5px;letter-spacing:.04em;padding:3px 7px;border-radius:5px;\n  color:rgba(203,190,222,.9);background:rgba(140,92,255,.10);border:1px solid rgba(140,92,255,.22)}\n.tipsub span.r{color:rgba(246,227,174,.9);background:rgba(217,179,106,.07);border-color:rgba(217,179,106,.24)}\n.tipf{margin-top:10px;padding-top:9px;border-top:1px dashed rgba(255,255,255,.10)}\n.tipf b{display:block;font-size:8.6px;letter-spacing:.2em;color:rgba(212,72,94,.82);margin-bottom:3px}\n.tipf span{font-size:11px;line-height:1.75;color:var(--text-3)}\n.custom{margin-top:11px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.custom .inp{flex:1;min-width:210px;font-size:12.5px}\n.custom span{font-size:10.5px;color:var(--text-4);letter-spacing:.06em;white-space:nowrap}\n.orbs{display:flex;gap:8px;flex-wrap:wrap}\n.orb{width:88px;padding:9px 3px 8px;border-radius:11px;border:1px solid var(--line-2);\n  display:flex;flex-direction:column;align-items:center;gap:6px;transition:.2s}\n.orb:hover{border-color:rgba(217,179,106,.28);background:rgba(255,255,255,.02)}\n.orb svg{width:40px;height:40px;display:block}\n.orb span{font-size:10px;color:var(--text-3);white-space:nowrap}\n.orb[aria-checked=\"true\"]{border-color:rgba(217,179,106,.58);background:rgba(246,227,174,.08);\n  box-shadow:0 0 30px -13px rgba(217,179,106,.9)}\n.orb[aria-checked=\"true\"] span{color:var(--gold-hi)}\n.chips{display:flex;gap:8px;flex-wrap:wrap}\n.chip{padding:7px 14px;border-radius:999px;border:1px solid var(--line-2);font-size:12px;color:var(--text-3);transition:.2s}\n.chip:hover{color:var(--text);border-color:rgba(217,179,106,.3)}\n.chip[aria-pressed=\"true\"]{color:var(--gold-hi);border-color:rgba(217,179,106,.55);background:rgba(217,179,106,.1)}\n.cr-foot{margin:24px 0 0;padding:13px 0 0;border-top:1px dashed var(--line-2);max-width:640px}\n.cr-foot b{display:block;font-size:9.5px;letter-spacing:.22em;color:var(--gold-dim);margin-bottom:6px}\n.cr-foot p{margin:0;font-size:11.5px;line-height:1.8;color:var(--text-3)}\n.cr-foot p em{font-style:normal;color:var(--text-2)}\n.review{display:flex;flex-direction:column;gap:1px;border:1px solid var(--line-2);border-radius:12px;overflow:hidden;margin-bottom:16px}\n.rv{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(18,11,32,.58)}\n.rv dt{flex:0 0 104px;margin:0;font-size:10.5px;letter-spacing:.1em;color:var(--text-4)}\n.rv dd{flex:1;margin:0;font-size:12.5px;color:var(--text);word-break:break-all;line-height:1.6}\n.rv dd.empty{color:var(--text-4)}\n.rv button{font-size:11px;color:var(--text-3);padding:3px 9px;border-radius:6px;border:1px solid transparent}\n.rv button:hover{color:var(--gold-hi);border-color:var(--line-gold);background:rgba(217,179,106,.08)}\n.cr-bot{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:12px 24px;\n  border-top:1px solid rgba(255,255,255,.05);\n  background:linear-gradient(180deg,rgba(6,4,12,.16),rgba(6,4,12,.74))}\n.cr-bot__c{font-family:var(--num);font-size:11px;letter-spacing:.12em;color:var(--text-4)}\n.cr-bot__sum{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;\n  font-size:11.5px;letter-spacing:.08em;color:var(--text-3);border:1px solid var(--line-2);transition:.22s}\n.cr-bot__sum b{font-weight:400;font-family:var(--num);font-size:11px;color:var(--gold-hi)}\n.cr-bot__sum:hover{color:var(--text);border-color:rgba(217,179,106,.34)}\n.btn{padding:9px 19px;border-radius:9px;font-size:12.5px;letter-spacing:.08em;transition:.22s}\n.btn--ghost{color:var(--text-3);border:1px solid var(--line-2)}\n.btn--ghost:hover{color:var(--text);border-color:var(--line-1)}\n.btn--next{color:#1A1206;background:linear-gradient(180deg,var(--gold-hi),var(--gold));\n  box-shadow:0 10px 28px -14px rgba(217,179,106,.9);font-weight:500}\n.btn--next:hover{filter:brightness(1.08)}\n.btn--next:disabled{opacity:.35;cursor:not-allowed;filter:grayscale(.4)}\n.btn--save{color:var(--gold-dim);border:1px solid rgba(217,179,106,.22);background:rgba(217,179,106,.045)}\n.btn--save:hover{color:var(--gold-hi);background:rgba(217,179,106,.13);border-color:rgba(217,179,106,.55)}\n.btn--save.is-done{color:#1A1206;border-color:transparent;\n  background:linear-gradient(180deg,var(--gold-hi),var(--gold));box-shadow:0 10px 28px -14px rgba(217,179,106,.9)}\n/* 摘要抽屉 */\n.drawer{position:fixed;top:0;right:0;bottom:0;width:min(352px,88vw);z-index:8600;display:flex;flex-direction:column;\n  background:linear-gradient(180deg,rgba(17,11,30,.985),rgba(8,5,16,.99));\n  border-left:1px solid rgba(217,179,106,.18);\n  transform:translateX(101%);transition:transform .4s cubic-bezier(.2,.8,.2,1);\n  box-shadow:-40px 0 100px -50px #000}\n.drawer.on{transform:none}\n.drawer__mask{position:fixed;inset:0;z-index:8550;background:rgba(3,2,8,.54);opacity:0;pointer-events:none;transition:.32s}\n.drawer__mask.on{opacity:1;pointer-events:auto}\n.drawer__h{flex:0 0 auto;padding:18px 18px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line-2)}\n.drawer__h h3{margin:0;font-family:var(--serif);font-size:13.5px;font-weight:500;letter-spacing:.16em;color:var(--gold-hi)}\n.drawer__h i{font-style:normal;font-family:var(--num);font-size:10px;letter-spacing:.14em;color:var(--text-4);flex:1}\n.drawer__x{font-size:16px;line-height:1;color:var(--text-3);padding:4px 8px;border-radius:6px}\n.drawer__x:hover{color:var(--gold-hi);background:rgba(217,179,106,.1)}\n.drawer__b{flex:1;min-height:0;overflow-y:auto;padding:4px 18px 18px}\n.drawer__f{flex:0 0 auto;padding:12px 18px 18px;border-top:1px solid var(--line-2)}\n.srow{display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--line-2);width:100%;text-align:left}\n.srow span{flex:0 0 88px;font-size:9.5px;letter-spacing:.02em;color:var(--text-4);padding-top:3px;line-height:1.3}\n.srow b{flex:1;font-weight:400;font-size:12px;color:var(--text);text-align:right;word-break:break-all;line-height:1.5}\n.srow b.empty{color:var(--text-4)}\n.srow:hover b{color:var(--gold-hi)}\n\n.sheet{position:fixed;inset:0;z-index:8500;display:grid;place-items:center;padding:20px;\n  background:rgba(4,2,9,.8);backdrop-filter:blur(6px);animation:fade .22s ease}\n@keyframes fade{from{opacity:0}to{opacity:1}}\n.sheet__box{width:min(620px,100%);max-height:88vh;overflow:auto;border-radius:14px;padding:20px 22px 16px;\n  background:linear-gradient(170deg,#151025,#0A0616);border:1px solid rgba(217,179,106,.24);\n  box-shadow:0 40px 90px -40px #000,inset 0 1px 0 rgba(255,255,255,.1)}\n.sheet__box h3{margin:0 0 5px;font-family:var(--serif);font-size:16px;font-weight:500;letter-spacing:.12em;color:var(--gold-hi)}\n.sheet__box p{margin:0 0 12px;font-size:11.5px;line-height:1.7;color:var(--text-3)}\n.block{white-space:pre-wrap;font-family:var(--num);font-size:11.5px;line-height:1.85;color:var(--text-2);\n  padding:13px 14px;border-radius:10px;background:rgba(6,3,12,.72);border:1px solid var(--line-2);max-height:46vh;overflow:auto}\n.block .hid{color:var(--sys);opacity:.78}\n.sheet__ft{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}\n.bub{max-width:86%;padding:12px 15px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.8;white-space:pre-wrap;\n  background:linear-gradient(158deg,rgba(44,30,72,.9),rgba(22,14,40,.94));border:1px solid rgba(140,92,255,.24);color:#E6DFF2}\n.bub--sys{border-color:rgba(212,72,94,.3);background:rgba(212,72,94,.06);color:#E9A9B5;font-size:12px}\n.bub--me{align-self:flex-end;border-radius:16px 4px 16px 16px;max-width:88%;\n  background:linear-gradient(158deg,rgba(64,50,30,.9),rgba(30,23,15,.94));border-color:rgba(217,179,106,.24);color:#F3ECDC}\n.modal{position:fixed;inset:0;z-index:9600;display:grid;place-items:center;padding:20px;\n  background:rgba(3,2,8,.74);backdrop-filter:blur(7px);animation:fade .2s ease}\n.modal__box{width:min(520px,100%);border-radius:14px;padding:20px 20px 16px;\n  background:linear-gradient(170deg,#151025,#0A0616);border:1px solid rgba(217,179,106,.24);\n  box-shadow:0 40px 90px -40px #000,inset 0 1px 0 rgba(255,255,255,.1)}\n.modal__box h3{margin:0 0 5px;font-family:var(--serif);font-size:16px;font-weight:500;letter-spacing:.14em;color:var(--gold-hi)}\n.modal__box p{margin:0 0 14px;font-size:11.5px;line-height:1.7;color:var(--text-3)}\n.slots{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}\n#pickModal .modal__box{width:min(560px,100%)}\n.slot{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;\n  border:1px solid var(--line-2);background:rgba(18,11,32,.62)}\n.slot__i{font-family:var(--num);font-size:11px;letter-spacing:.1em;color:var(--gold-dim);flex:0 0 auto}\n.slot__info{flex:1;min-width:0}\n.slot__info b{display:block;font-weight:400;font-size:12.5px;color:var(--text);\n  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.slot__info i{font-style:normal;display:block;font-size:10px;color:var(--text-4);margin-top:2px;\n  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.slot--empty .slot__info b{color:var(--text-4)}\n.slot button{font-size:11px;color:var(--text-3);padding:4px 9px;border-radius:6px;\n  border:1px solid var(--line-2);transition:.2s;flex:0 0 auto}\n.slot button:hover{color:var(--gold-hi);border-color:rgba(217,179,106,.45);background:rgba(217,179,106,.08)}\n.slot--pick{width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit;transition:.2s;padding:12px}\n.slot--pick:hover{border-color:rgba(217,179,106,.5);background:rgba(217,179,106,.08);transform:translateY(-1px)}\n.slot__go{font-style:normal;flex:0 0 auto;padding:4px 9px;border-radius:6px;font-size:10.5px;\n  letter-spacing:.1em;color:var(--gold-dim);border:1px solid rgba(217,179,106,.22);transition:.2s}\n.slot--pick:hover .slot__go{color:var(--gold-hi);border-color:rgba(217,179,106,.5)}\n.slot--done{border-color:rgba(217,179,106,.72)!important;background:rgba(217,179,106,.14)!important;transform:none}\n.slot--done .slot__go{color:var(--gold-hi);border-color:rgba(217,179,106,.62)}\n.modal__ft{display:flex;align-items:center;gap:10px}\n.modal__hint{flex:1;font-size:10.5px;color:var(--text-4)}\n.exit{position:fixed;inset:0;z-index:9700;display:grid;place-items:center;background:#040207;animation:fade .6s ease}\n.exit__in{text-align:center;max-width:340px;padding:24px}\n.exit__seal{width:44px;height:44px;margin:0 auto 22px;display:grid;place-items:center;border-radius:3px;\n  background:linear-gradient(160deg,#9B3236,#6E1F24);color:#F4DCC8;font-family:var(--kai);font-size:24px;\n  transform:rotate(-2.6deg);box-shadow:0 0 30px -8px rgba(190,60,52,.85)}\n.exit h2{margin:0 0 10px;font-family:var(--serif);font-size:19px;font-weight:500;letter-spacing:.18em;color:var(--gold-hi)}\n.exit p{margin:0 0 24px;font-size:12px;line-height:1.9;color:var(--text-3)}\n@media (max-width:1279px){\n  .cr-folio{grid-template-columns:minmax(0,1fr)}\n  /* 视效不再是一扇\"窗\"：整片夜空铺在顶上，文字与卡片浮在它里面 */\n  #space{top:0;bottom:0;height:100%;\n    -webkit-mask-image:linear-gradient(180deg,#000 0%,#000 34%,rgba(0,0,0,.62) 58%,rgba(0,0,0,.22) 78%,transparent 94%);\n    mask-image:linear-gradient(180deg,#000 0%,#000 34%,rgba(0,0,0,.62) 58%,rgba(0,0,0,.22) 78%,transparent 94%)}\n  .cr{background:linear-gradient(180deg,rgba(6,4,12,.90) 0 56px,rgba(6,4,12,.22) 56px,\n      rgba(6,4,12,.07) 22%,rgba(6,4,12,.11) 38%,rgba(6,4,12,.22) 48%,\n      rgba(6,4,12,.42) 58%,rgba(6,4,12,.66) 68%,rgba(6,4,12,.86) 79%,\n      rgba(6,4,12,.96) 89%,rgba(6,4,12,1) 100%)}\n  .cr-main{margin-top:0;padding:184px 16px 26px;position:relative}\n  .cr-in{position:relative;z-index:0}\n  .cr-in::before{content:\"\";position:absolute;left:-16px;right:-16px;top:-24px;height:196px;\n    background:linear-gradient(180deg,rgba(4,2,10,0) 0%,rgba(4,2,10,.40) 10%,\n      rgba(4,2,10,.52) 38%,rgba(4,2,10,.30) 70%,rgba(4,2,10,0) 100%);\n    pointer-events:none;z-index:-1}\n  .cr-scene{display:block;position:fixed;top:88px;right:0;width:154px;height:124px;\n    padding:0 14px;pointer-events:none;z-index:3;\n    background:radial-gradient(74% 70% at 72% 44%,rgba(4,2,10,.46),rgba(4,2,10,.18) 60%,transparent 80%)}\n  .od__t{font-size:12px;margin-top:4px}\n  .od__d{font-size:9px}\n  .od__r{margin-top:7px}\n  .od__r i{width:11px}\n  .msum{background:linear-gradient(90deg,rgba(10,6,20,.5),rgba(10,6,20,.12));border-bottom:0}\n  .rv{background:rgba(16,10,28,.80)}\n  .review{border-color:rgba(255,255,255,.07);background:rgba(8,5,16,.5)}\n  .cr-steps{display:none}\n  .cr-sum{display:none}\n  .cr-top{padding:11px 15px}\n  .cr-h{font-size:20px}\n  .cr-lead{margin-bottom:18px}\n  .cr-bot{padding:9px 15px}\n  .cr-bot__c{display:none}\n  .wall{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:7px}\n  .tile{min-height:48px;font-size:11.5px;padding:7px 6px;\n    background:linear-gradient(158deg,rgba(32,21,54,.52),rgba(11,7,20,.66));\n    border-color:rgba(255,255,255,.075);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}\n  .tile[aria-checked=\"true\"]{background:linear-gradient(158deg,rgba(246,227,174,.16),rgba(140,92,255,.14))}\n  .sex{background:linear-gradient(158deg,rgba(32,21,54,.55),rgba(12,7,22,.68))}\n  .orb{width:calc(20% - 7px);min-width:58px}\n  .msteps{display:flex;gap:4px;flex:1;max-width:170px}\n  .msteps i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.1)}\n  .msteps i.on{background:linear-gradient(90deg,var(--gold),var(--gold-hi))}\n  .msum{display:block;padding:8px 15px;font-size:11px;color:var(--text-4);border-bottom:1px solid var(--line-2);\n    background:rgba(10,6,20,.36);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n  .msum b{font-weight:400;color:var(--text-2)}\n  .cv__meta{top:calc(16px + env(safe-area-inset-top));font-size:8px;letter-spacing:.12em;\n    max-width:60%;margin:0 0 0 14px;gap:8px;justify-content:flex-start}\n  .cv__meta::before,.cv__meta::after{display:none}\n  .cv__act{left:16px;right:16px;top:auto;bottom:calc(16px + env(safe-area-inset-bottom));\n    transform:none;gap:10px;width:auto}\n  .cv__enter{width:100%;min-height:48px;font-size:12.5px;letter-spacing:.2em;text-indent:.2em;gap:10px}\n  .cv__enter i{width:20px}\n  .cv__alt{width:100%;flex-direction:row;justify-content:space-between;padding-top:8px}\n  .cv__alt button{flex:1 1 0;justify-content:center;font-size:11px;letter-spacing:.1em;padding:6px 0}\n  .cv__alt button::before{display:none}\n  .cv__title{right:16px;top:46%;gap:9px}\n  .cv__name{font-size:clamp(34px,9.8vmin,46px);letter-spacing:.06em}\n  .cv__side{gap:14px}\n  .cv__series{font-size:15px;letter-spacing:.16em}\n  .cv__series i{font-size:12px}\n  .cv__sub{font-size:12px;letter-spacing:.1em;margin:0 0 10px 2px}\n  .cv__sign{display:none}\n  .cv__frame i.l{left:39%}\n  .cv__frame i.r{left:53%}\n  .cv__frame i.t{left:39%;right:47%}\n  .cv__leaf{width:7%}\n  .cv__leaf.l{left:34%}\n  .cv__leaf.r{left:41%}\n  .cv__portal{left:46%}\n  .cv__spill{width:64%}\n  .cv__recess{left:39%;right:47%}\n  .cr-bot{padding-bottom:calc(12px + env(safe-area-inset-bottom))}\n  .cr-bot__sum{padding:7px 10px;font-size:11px}\n  .cr-bot__sum b{font-size:10.5px}\n  .namebox{width:100%}\n  .sug{width:100%}\n}\n@media (max-width:759px){\n  /* 竖屏里门缝和亮边收一档，免得像两根灯管 */\n  .cv__portal::before,.cv__portal::after{width:1px;margin-left:-.5px;\n    box-shadow:0 0 7px 1.5px rgba(198,224,255,.68),0 0 18px 6px rgba(140,160,255,.26)}\n  .sheet__ft{flex-wrap:wrap;gap:8px}\n  .sheet__ft .btn{flex:1 1 auto;min-width:84px;padding:10px 8px;font-size:12px;letter-spacing:.04em}\n  .tip{left:10px!important;right:10px;top:auto!important;bottom:76px;width:auto;padding:12px 14px}\n  .tip b{margin-bottom:5px}\n  .tip p{font-size:11.5px;line-height:1.75}\n}\n@media (min-width:760px) and (max-width:1279px){\n  .cr-main{padding-top:min(44vh,420px)}\n  .cr-in{max-width:600px}\n  .cr-scene{top:72px;width:190px;height:150px}\n}\n@media (min-width:1280px){.msteps,.msum{display:none}}\n:host([data-motion=\"off\"]) .cv__dust i{animation:none;opacity:var(--o)}\n:host([data-motion=\"off\"]) .cv__enter::before{animation:none;opacity:.8}\n:host([data-motion=\"off\"]) .cv__name span,\n:host([data-motion=\"off\"]) .cv__series em,\n:host([data-motion=\"off\"]) .cv__sub,\n:host([data-motion=\"off\"]) .cv__bottom{animation:none!important;opacity:1!important;filter:none!important;transform:none!important}\n:host([data-motion=\"off\"]) .cv__portal{animation:none}\n@media (prefers-reduced-motion: reduce){\n  .cv__dust i{animation:none;opacity:var(--o)}\n  .cv__portal{animation:none}\n  .cv__name span,.cv__series em,.cv__sub,.cv__bottom{animation:none;opacity:1;filter:none;transform:none}\n  *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}\n}";
  var CV_HTML = "<canvas id=\"space\" aria-hidden=\"true\"></canvas>\n<div class=\"grain\" aria-hidden=\"true\"></div>\n\n<section class=\"cv\" id=\"cv\" data-state=\"ready\" aria-label=\"斗罗大陆 之 转生到比比东腹中\">\n  <div class=\"cv__stage\">\n    <div class=\"cv__room\" id=\"cvRoom\" aria-hidden=\"true\">\n      <div class=\"cv__wall\"></div>\n      <div class=\"cv__texture\"></div>\n      <div class=\"cv__recess\"></div>\n      <div class=\"cv__frame\"><i class=\"l\"></i><i class=\"r\"></i><i class=\"t\"></i></div>\n      <div class=\"cv__spill\"></div>\n      <div class=\"cv__glow\"></div>\n      <div class=\"cv__portal\"></div>\n      <div class=\"cv__floor\"></div>\n      <div class=\"cv__floorline\"></div>\n      <div class=\"cv__dust\" id=\"dust\"></div>\n      <div class=\"cv__vignette\"></div>\n    </div>\n  </div>\n\n  <div class=\"cv__neb\" aria-hidden=\"true\"></div>\n  <canvas class=\"cv__stars\" id=\"cvStars\" aria-hidden=\"true\"></canvas>\n\n  <div class=\"cv__ui\">\n    <p class=\"cv__meta\" aria-hidden=\"true\">武魂殿 · 教皇山 · 第三层密室</p>\n\n    <div class=\"cv__act\">\n      <button class=\"cv__enter\" id=\"cvEnter\" type=\"button\" aria-label=\"开始魂穿之旅，进入角色创建\">开始魂穿之旅<i aria-hidden=\"true\"></i></button>\n      <div class=\"cv__alt\">\n        <button type=\"button\" data-act=\"skip\">直接入局</button>\n        <button type=\"button\" data-act=\"save\">存档</button>\n        <button type=\"button\" data-act=\"exit\">退出角色卡</button>\n      </div>\n      <div class=\"cv__foot\">\n        <button class=\"cv__motion\" id=\"cvMotion\" type=\"button\" aria-pressed=\"true\">动效 · 开</button>\n        <label class=\"cv__auto\"><input type=\"checkbox\" id=\"cvAuto\"><span>下次直接入局</span></label>\n      </div>\n    </div>\n\n    <div class=\"cv__title\">\n      <p class=\"cv__series\"><b>斗罗大陆</b><i>之</i></p>\n      <h1 class=\"cv__name\"><span style=\"--d:180ms\">转</span><span style=\"--d:260ms\">生</span><span style=\"--d:340ms\">到</span><span style=\"--d:420ms\">比</span><span style=\"--d:500ms\">比</span><span style=\"--d:580ms\">东</span><span style=\"--d:660ms\">腹</span><span style=\"--d:740ms\">中</span></h1>\n      <p class=\"cv__sub\"><b>千仞雪</b>与你是双胞胎</p>\n    </div>\n\n    <div class=\"cv__sign\">\n      <span class=\"cv__seal\" aria-hidden=\"true\">千</span>\n      <span class=\"cv__date\">斗罗历 二六二二 · 二月</span>\n    </div>\n  </div>\n\n</section>\n\n<div class=\"modal\" id=\"saveModal\" hidden>\n  <div class=\"modal__box\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"saveT\">\n    <h3 id=\"saveT\">存档</h3>\n    <p>存在这台设备的浏览器里，最多三份。读档会恢复当时的填写与步骤。</p>\n    <div class=\"slots\" id=\"slots\"></div>\n    <div class=\"modal__ft\">\n      <span class=\"modal__hint\" id=\"saveHint\">点「保存」覆盖该槽位</span>\n      <button class=\"btn btn--ghost\" id=\"saveClose\" type=\"button\">关闭</button>\n    </div>\n  </div>\n</div>\n\n<div class=\"modal\" id=\"pickModal\" hidden>\n  <div class=\"modal__box\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"pickT\">\n    <h3 id=\"pickT\">存到哪一格</h3>\n    <p>三份都存在这台设备的浏览器里。选中的格子会被这份创建覆盖。</p>\n    <div class=\"slots\" id=\"pickSlots\"></div>\n    <div class=\"modal__ft\">\n      <span class=\"modal__hint\" id=\"pickHint\">点一格存入</span>\n      <button class=\"btn btn--ghost\" id=\"pickClose\" type=\"button\">取消</button>\n    </div>\n  </div>\n</div>\n\n<div class=\"exit\" id=\"exitScreen\" hidden>\n  <div class=\"exit__in\">\n    <div class=\"exit__seal\" aria-hidden=\"true\">千</div>\n    <h2>已退出角色卡</h2>\n    <p>这间密室还亮着。回来的时候，光还在门缝里。</p>\n    <button class=\"btn btn--next\" id=\"exitBack\" type=\"button\">重新进入</button>\n  </div>\n</div>\n\n<div class=\"flash\" id=\"flash\" aria-hidden=\"true\"></div>\n\n<div class=\"cr\" id=\"cr\" hidden>\n  <header class=\"cr-top\">\n    <span class=\"cr-top__k\">SYS / INIT</span>\n    <span class=\"cr-top__t\">天赋系统 · 初始化</span>\n    <div class=\"msteps\" id=\"mSteps\" aria-hidden=\"true\"><i></i><i></i><i></i><i></i><i></i></div>\n    <div class=\"spacer\"></div>\n    <button class=\"cr-tbtn\" id=\"crSkip\" type=\"button\">跳过</button>\n  </header>\n  <div class=\"msum\" id=\"mSum\"></div>\n  <div class=\"cr-folio\">\n    <nav class=\"cr-steps\" id=\"crSteps\" aria-label=\"创建步骤\"></nav>\n    <main class=\"cr-main\" id=\"crMain\"></main>\n    <aside class=\"cr-scene\" aria-hidden=\"true\">\n      <div class=\"od\" id=\"od\">\n        <div class=\"od__k\">ORBIT <b id=\"odIdx\">01 / 05</b></div>\n        <div class=\"od__t\" id=\"odName\">星系</div>\n        <div class=\"od__d\" id=\"odDist\">4.1 万光年</div>\n        <div class=\"od__r\" id=\"odSeg\"><i class=\"on\"></i><i></i><i></i><i></i><i></i></div>\n      </div>\n    </aside>\n  </div>\n  <footer class=\"cr-bot\">\n    <span class=\"cr-bot__c\" id=\"crCount\">第 1 步 / 共 5 步</span>\n    <div class=\"spacer\"></div>\n    <button class=\"cr-bot__sum\" id=\"sumToggle\" type=\"button\">已成形的 <b id=\"sumN\">0/9</b></button>\n    <button class=\"btn btn--ghost\" id=\"crPrev\" type=\"button\">上一步</button>\n    <button class=\"btn btn--next\" id=\"crNext\" type=\"button\">下一步</button>\n  </footer>\n</div>\n\n<div class=\"drawer__mask\" id=\"drawerMask\"></div>\n<aside class=\"drawer\" id=\"drawer\" aria-label=\"已成形的内容\">\n  <div class=\"drawer__h\"><h3>已成形的</h3><i id=\"sumCount\">0 / 9</i><button class=\"drawer__x\" id=\"drawerX\" type=\"button\" aria-label=\"关闭\">×</button></div>\n  <div class=\"drawer__b\" id=\"sumBody\"></div>\n  <div class=\"drawer__f\"><button class=\"btn btn--next\" id=\"sumGo\" type=\"button\" style=\"width:100%\">入局</button></div>\n</aside>\n\n<div class=\"tip\" id=\"tip\" hidden></div>\n\n<div class=\"sheet\" id=\"sheet\" hidden>\n  <div class=\"sheet__box\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"sheetT\">\n    <h3 id=\"sheetT\">这将写进输入框</h3>\n    <p>不会自动发送。紫红色那段由界面隐藏，模型仍读得到；里面的字你可以直接改。</p>\n    <div class=\"block\" id=\"sheetBlock\"></div>\n    <div class=\"sheet__ft\">\n      <button class=\"btn btn--ghost\" id=\"sheetBack\" type=\"button\">再改改</button>\n      <button class=\"btn btn--save\" id=\"sheetSave\" type=\"button\">保存到存档</button>\n      <button class=\"btn btn--next\" id=\"sheetOk\" type=\"button\">写进输入框</button>\n    </div>\n  </div>\n</div>";

  var ROOT = HOSTEL.attachShadow({mode:'open'});
  ROOT.innerHTML = '<style>'+CV_CSS+'</style>'+CV_HTML;
  var HOST = HOSTEL;

  /* ── 性能档位：PC 全开，手机收紧，避免长时间满帧发烫 ── */
  var MOBILE = (function(){
    try{
      if(matchMedia('(max-width: 759px)').matches) return true;
      if(/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent)) return true;
      if(navigator.connection && navigator.connection.saveData) return true;
      return (navigator.hardwareConcurrency||8) <= 4 && matchMedia('(pointer:coarse)').matches;
    }catch(e){ return false; }
  })();
  var PERF = MOBILE
    ? { dpr:1.35, fps:30, stars:360, planetCap:240000, neb:true }
    : { dpr:2,    fps:0,    stars:960, planetCap:380000, neb:true };
  window.__cvPerf = PERF;



/* ═════ 原型脚本（以下为原样搬运，仅替换选择器根） ═════ */
(function(){
  "use strict";
  var $ = function(s,r){ return (r||ROOT).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||ROOT).querySelectorAll(s)); };
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  /* ═════ 宇宙：星系 → 旋臂 → 恒星系 → 斗罗星 → 大陆 ═════ */
  var space = (function(){
    var c = $('#space'), ctx = c.getContext('2d');
    var W=0,H=0,DPR=1,raf=0,on=true,lastT=0,clock=0;
    var stage=1, prev=0, mix=1, dim=1, dimT=1, rev=1, spin=0;
    var stars=[], gal=null, arm=null, sysP=[];
    var TEX=null, CLD=null, TEXW=1024, TEXH=512, CLDW=768, CLDH=384;
    var pl={cv:null, cx:0, cy:0, R:0, key:'', last:0, w:0, h:0, rot:.8, x0:0, y0:0};
    var CAP=196000, SPR={};

    function rnd(a,b){ return a+Math.random()*(b-a); }
    function gauss(){ var u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random();
      return Math.sqrt(-2*Math.log(u))*Math.cos(6.2831853*v); }
    function ease(t){ return t*t*(3-2*t); }

    /* 光点精灵，按颜色缓存 */
    function spr(rgb){
      var k = rgb.join(',');
      if(SPR[k]) return SPR[k];
      var s = document.createElement('canvas'); s.width=s.height=48;
      var g = s.getContext('2d');
      var gr = g.createRadialGradient(24,24,0,24,24,24);
      gr.addColorStop(0,'rgba('+k+',1)');
      gr.addColorStop(.16,'rgba('+k+',.72)');
      gr.addColorStop(.42,'rgba('+k+',.16)');
      gr.addColorStop(1,'rgba('+k+',0)');
      g.fillStyle=gr; g.fillRect(0,0,48,48);
      SPR[k]=s; return s;
    }

    function resize(){
      DPR = Math.min(PERF.dpr, window.devicePixelRatio||1);
      W = c.clientWidth || window.innerWidth;
      H = c.clientHeight || window.innerHeight;
      c.width = Math.round(W*DPR); c.height = Math.round(H*DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
      if(!stars.length) seedStars();
      surfJob.ready=false; surfJob.cv=null; cloudL.cv=null;
    }
    function seedStars(){
      stars.length = 0;
      var n = Math.round(W*H/5200); if(n<180) n=180; if(n>420) n=420;
      if(W<760) n=Math.round(n*1.55);
      for(var i=0;i<n;i++){
        stars.push({ x:Math.random(), y:Math.random(),
          r: Math.pow(Math.random(),2.2)*1.5+.32,
          a: rnd(.18,.72), ph: Math.random()*6.283,
          c: Math.random()<.12 ? [198,214,255] : (Math.random()<.2 ? [255,226,182] : [246,242,232]) });
      }
    }

    /* ───── 星系（离屏一次，之后只做旋转与缩放） ───── */
    function buildGalaxy(){
      var S=1400, cv=document.createElement('canvas'); cv.width=cv.height=S;
      var g=cv.getContext('2d'), C=S/2;
      g.globalCompositeOperation='lighter';
      var halo=g.createRadialGradient(C,C,0,C,C,S*.5);
      halo.addColorStop(0,'rgba(255,240,206,.62)');
      halo.addColorStop(.07,'rgba(255,232,192,.40)');
      halo.addColorStop(.20,'rgba(226,214,255,.15)');
      halo.addColorStop(.46,'rgba(132,156,255,.06)');
      halo.addColorStop(1,'rgba(70,90,200,0)');
      g.fillStyle=halo; g.beginPath(); g.arc(C,C,S*.5,0,6.283); g.fill();

      var arms=4, per=660, i, aa, kk;
      /* 旋臂底的柔光，免得只剩一串点 */
      for(aa=0;aa<arms;aa++){
        for(kk=0;kk<80;kk++){
          var uu=kk/80;
          var th0=aa*1.5707963+uu*4.55;
          var rr0=(.045+uu*.925)*S*.462;
          var x0=C+Math.cos(th0)*rr0, y0=C+Math.sin(th0)*rr0;
          var rg=S*.040*(1-uu*.35);
          var gg=g.createRadialGradient(x0,y0,0,x0,y0,rg);
          gg.addColorStop(0,'rgba(186,202,255,.055)');
          gg.addColorStop(1,'rgba(140,160,255,0)');
          g.fillStyle=gg; g.beginPath(); g.arc(x0,y0,rg,0,6.283); g.fill();
        }
      }
      for(i=0;i<arms*per;i++){
        var a=i%arms;
        var u=Math.pow(Math.random(),1.55);
        var th=a*1.5707963+u*4.55+gauss()*.115*(1-u*.5);
        var rr=(.045+u*.925)*S*.462;
        var x=C+Math.cos(th)*rr, y=C+Math.sin(th)*rr;
        var col = u<.12?[255,238,200]:(u<.40?[255,224,186]:(u<.76?[206,222,255]:[146,168,255]));
        if(Math.random()<.028) col=[255,152,202];
        var sz=(.9+Math.pow(1-u,1.4)*7.2)*rnd(.75,1.35);
        g.globalAlpha=(.40+.60*(1-u*.75))*rnd(.7,1);
        var sp=spr(col);
        g.drawImage(sp, x-sz/2, y-sz/2, sz, sz);
      }
      /* 核球 */
      for(i=0;i<520;i++){
        var r2=Math.pow(Math.random(),1.9)*S*.085;
        var a2=Math.random()*6.283;
        var x2=C+Math.cos(a2)*r2*1.25, y2=C+Math.sin(a2)*r2*.95;
        var sz2=rnd(2.2,7);
        g.globalAlpha=rnd(.25,.8);
        g.drawImage(spr([255,244,214]), x2-sz2/2, y2-sz2/2, sz2, sz2);
      }
      /* 尘埃带 */
      g.globalCompositeOperation='source-over';
      for(i=0;i<760;i++){
        var a3=i%arms;
        var u3=Math.pow(Math.random(),1.4);
        var th3=a3*1.5707963+u3*4.55-.30+gauss()*.075;
        var rr3=(.10+u3*.86)*S*.445;
        var x3=C+Math.cos(th3)*rr3, y3=C+Math.sin(th3)*rr3;
        g.globalAlpha=rnd(.07,.24)*(1-u3*.5);
        g.fillStyle='rgba(6,4,12,1)';
        g.beginPath(); g.ellipse(x3,y3,rnd(3,11),rnd(2,6),th3+.9,0,6.283); g.fill();
      }
      /* 亮核 */
      g.globalCompositeOperation='lighter';
      var core=g.createRadialGradient(C,C,0,C,C,S*.075);
      core.addColorStop(0,'rgba(255,253,246,1)');
      core.addColorStop(.25,'rgba(255,246,220,.92)');
      core.addColorStop(.6,'rgba(255,226,178,.30)');
      core.addColorStop(1,'rgba(255,210,150,0)');
      g.globalAlpha=1; g.fillStyle=core;
      g.beginPath(); g.arc(C,C,S*.075,0,6.283); g.fill();
      var bar=g.createRadialGradient(C,C,0,C,C,S*.16);
      bar.addColorStop(0,'rgba(255,238,206,.32)');
      bar.addColorStop(1,'rgba(255,220,170,0)');
      g.save(); g.translate(C,C); g.scale(1.55,.62); g.fillStyle=bar;
      g.beginPath(); g.arc(0,0,S*.16,0,6.283); g.fill(); g.restore();
      gal=cv;
    }

    function drawGalaxy(a,k,cx,cy){
      if(!gal) buildGalaxy();
      var R = Math.min(W,H)*.40*k;
      var d = R/.46;
      ctx.save();
      ctx.globalAlpha = a*dim;
      ctx.translate(cx,cy);
      ctx.rotate(spin*.16);
      ctx.scale(1,.58);
      ctx.drawImage(gal,-d/2,-d/2,d,d);
      ctx.restore();
      /* 边缘散射 */
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      var gl=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.9);
      gl.addColorStop(0,'rgba(206,214,255,'+(.20*a*dim)+')');
      gl.addColorStop(.45,'rgba(150,170,255,'+(.075*a*dim)+')');
      gl.addColorStop(1,'rgba(90,110,220,0)');
      ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(cx,cy,R*1.9,0,6.283); ctx.fill();
      ctx.restore();
    }

    /* ───── 旋臂内部 ───── */
    function buildArm(){
      var st=[], neb=[];
      for(var i=0;i<1500;i++){
        st.push({ u:rnd(-1.05,1.05), v:gauss()*.20, s:Math.pow(Math.random(),1.6)*2.1+.45,
          a:rnd(.18,.9), c: Math.random()<.24?[255,224,178]:[208,226,255] });
      }
      for(i=0;i<7;i++){
        neb.push({ u:rnd(-.85,.85), v:rnd(-.12,.12), r:rnd(.16,.34), a:rnd(.05,.11),
          c: i%3===0?[120,86,190]:(i%3===1?[70,150,170]:[190,110,120]) });
      }
      arm={st:st, neb:neb};
    }
    function drawArm(a,k,cx,cy){
      if(!arm) buildArm();
      var ang=-.30;
      var L=Math.max(W,H)*1.25*k, B=Math.min(W,H)*.42*k;
      var i,o;
      ctx.save();
      ctx.translate(cx,cy); ctx.rotate(ang);
      ctx.globalCompositeOperation='lighter';
      /* 旋臂本体的辉光带 */
      var gb=ctx.createLinearGradient(0,-B,0,B);
      gb.addColorStop(0,'rgba(110,132,240,0)');
      gb.addColorStop(.30,'rgba(132,156,255,'+(.055*a*dim)+')');
      gb.addColorStop(.46,'rgba(226,222,255,'+(.13*a*dim)+')');
      gb.addColorStop(.50,'rgba(255,238,208,'+(.17*a*dim)+')');
      gb.addColorStop(.54,'rgba(226,222,255,'+(.13*a*dim)+')');
      gb.addColorStop(.70,'rgba(132,156,255,'+(.055*a*dim)+')');
      gb.addColorStop(1,'rgba(110,132,240,0)');
      ctx.fillStyle=gb;
      ctx.fillRect(-L,-B,L*2,B*2);
      /* 星云团 */
      for(i=0;i<arm.neb.length;i++){
        o=arm.neb[i];
        var nx=o.u*L, ny=o.v*B;
        var rr=o.r*Math.max(W,H)*k;
        var g=ctx.createRadialGradient(nx,ny,0,nx,ny,rr);
        g.addColorStop(0,'rgba('+o.c.join(',')+','+(o.a*a*dim*1.7)+')');
        g.addColorStop(.45,'rgba('+o.c.join(',')+','+(o.a*a*dim*.45)+')');
        g.addColorStop(1,'rgba('+o.c.join(',')+',0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(nx,ny,rr,0,6.283); ctx.fill();
      }
      /* 星点 */
      for(i=0;i<arm.st.length;i++){
        o=arm.st[i];
        var x=o.u*L, y=o.v*B;
        var fade=1-Math.min(.9,Math.abs(o.u)*.55);
        var sz=o.s*(1.3+Math.abs(o.u)*1.15)*3.4;
        ctx.globalAlpha=Math.min(1,o.a*fade*a*dim*1.25);
        ctx.drawImage(spr(o.c), x-sz/2, y-sz/2, sz, sz);
      }
      ctx.globalAlpha=1;
      /* 亮星 */
      for(i=0;i<7;i++){
        var bx=(i/6*2-1)*L*.82+((i*97)%40-20), by=((i*61)%30-15)/30*B*.5;
        var br=(i%3===0)?5.2:3.4;
        ctx.globalAlpha=.85*a*dim;
        ctx.drawImage(spr([255,246,226]), bx-br*2.4, by-br*2.4, br*4.8, br*4.8);
        ctx.globalAlpha=.30*a*dim;
        ctx.strokeStyle='rgba(255,240,214,.7)'; ctx.lineWidth=.8;
        ctx.beginPath(); ctx.moveTo(bx-br*4.5,by); ctx.lineTo(bx+br*4.5,by);
        ctx.moveTo(bx,by-br*3); ctx.lineTo(bx,by+br*3); ctx.stroke();
      }
      ctx.restore();
      /* 定位环 */
      var rx=cx+W*.045, ry=cy-H*.075, t=clock*.0005;
      ctx.save();
      ctx.globalAlpha=a*dim*.95;
      ctx.translate(rx,ry); ctx.rotate(t);
      ctx.strokeStyle='rgba(255,238,206,.62)'; ctx.lineWidth=1.1;
      ctx.beginPath(); ctx.arc(0,0,28,0,6.283); ctx.stroke();
      ctx.strokeStyle='rgba(255,238,206,.22)';
      ctx.beginPath(); ctx.arc(0,0,42,0,6.283); ctx.stroke();
      for(var q=0;q<4;q++){
        var aa=q*1.5707963+.785;
        ctx.strokeStyle='rgba(255,238,206,.6)';
        ctx.beginPath();
        ctx.moveTo(Math.cos(aa)*47,Math.sin(aa)*47);
        ctx.lineTo(Math.cos(aa)*58,Math.sin(aa)*58);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha=a*dim*.75;
      ctx.fillStyle='rgba(255,248,230,.95)';
      ctx.beginPath(); ctx.arc(rx,ry,2.4,0,6.283); ctx.fill();
      ctx.globalAlpha=1;
    }

    /* ───── 恒星系 ───── */
    function drawSystem(a,k,cx,cy){
      var scl0=Math.min(W,H)*k;
      var sx=cx+W*.055*k, sy=cy-Math.min(H*.20, scl0*.62);
      var i;
      /* 黄道薄雾 */
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=a*dim;
      var hz=ctx.createRadialGradient(sx,sy,0,sx,sy,Math.min(W,H)*.62);
      hz.addColorStop(0,'rgba(255,232,186,.13)');
      hz.addColorStop(.30,'rgba(255,206,150,.05)');
      hz.addColorStop(1,'rgba(255,180,120,0)');
      ctx.fillStyle=hz; ctx.beginPath(); ctx.arc(sx,sy,Math.min(W,H)*.62,0,6.283); ctx.fill();
      /* 恒星 */
      var sr=Math.min(W,H)*.021;
      var g1=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*7);
      g1.addColorStop(0,'rgba(255,255,250,.95)');
      g1.addColorStop(.10,'rgba(255,248,226,.72)');
      g1.addColorStop(.30,'rgba(255,222,168,.24)');
      g1.addColorStop(1,'rgba(255,190,120,0)');
      ctx.fillStyle=g1; ctx.beginPath(); ctx.arc(sx,sy,sr*7,0,6.283); ctx.fill();
      ctx.fillStyle='rgba(255,255,252,1)';
      ctx.beginPath(); ctx.arc(sx,sy,sr*.72,0,6.283); ctx.fill();
      /* 衍射 */
      for(i=0;i<6;i++){
        var aa=i*Math.PI/3+.16;
        var len=sr*(i%2?9:16);
        var lg=ctx.createLinearGradient(sx,sy,sx+Math.cos(aa)*len,sy+Math.sin(aa)*len);
        lg.addColorStop(0,'rgba(255,246,224,.42)');
        lg.addColorStop(1,'rgba(255,246,224,0)');
        ctx.strokeStyle=lg; ctx.lineWidth=1.1;
        ctx.beginPath(); ctx.moveTo(sx,sy);
        ctx.lineTo(sx+Math.cos(aa)*len, sy+Math.sin(aa)*len); ctx.stroke();
      }
      ctx.restore();

      /* 轨道 */
      var orbits=[.085,.128,.178,.238,.312,.395];
      var angs=[2.05,.4,3.4,2.42,5.3,1.1];
      var scl=Math.min(W,H)*k;
      ctx.save();
      ctx.translate(sx,sy); ctx.rotate(-.20 + spin*1.6);
      for(i=0;i<orbits.length;i++){
        var rx=orbits[i]*scl, ry=rx*.35;
        ctx.strokeStyle='rgba(255,240,210,'+(.115*a*dim)+')';
        ctx.lineWidth=1;
        ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,6.283); ctx.stroke();
      }
      var homeMark=null;
      for(i=0;i<orbits.length;i++){
        var rx2=orbits[i]*scl, ry2=rx2*.35, an=angs[i]+spin*(9-i*1.1);
        var px=Math.cos(an)*rx2, py=Math.sin(an)*ry2;
        var isHome=(i===3);
        var pr=isHome?Math.max(4.4,scl*.011):Math.max(2,scl*.0045*(1-i*.06));
        if(i===4){ /* 带环行星 */
          ctx.strokeStyle='rgba(255,226,182,.30)'; ctx.lineWidth=1.4;
          ctx.beginPath(); ctx.ellipse(px,py,pr*2.5,pr*.8,-.35,0,6.283); ctx.stroke();
        }
        var pg=ctx.createRadialGradient(px-pr*.35,py-pr*.35,0,px,py,pr*1.5);
        if(isHome){
          pg.addColorStop(0,'rgba(198,232,168,'+(.95*a*dim)+')');
          pg.addColorStop(.55,'rgba(96,166,132,'+(.9*a*dim)+')');
          pg.addColorStop(1,'rgba(40,96,92,0)');
        }else{
          pg.addColorStop(0,'rgba(236,226,206,'+(.8*a*dim)+')');
          pg.addColorStop(1,'rgba(150,140,126,0)');
        }
        ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,pr*1.5,0,6.283); ctx.fill();
        ctx.fillStyle=isHome?'rgba(226,244,206,'+(a*dim)+')':'rgba(240,232,214,'+(.8*a*dim)+')';
        ctx.beginPath(); ctx.arc(px,py,pr*.62,0,6.283); ctx.fill();
        if(isHome){
          ctx.strokeStyle='rgba(210,240,180,'+(.45*a*dim)+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(px,py,pr*2.1,0,6.283); ctx.stroke();
          homeMark={x:px, y:py, r:pr};
        }
      }
      ctx.restore();

      /* 「斗罗」标签：换算回屏幕坐标，保持横排 */
      if(homeMark){
        var th0=-.20+spin*1.6, lx=homeMark.x+homeMark.r*2.5, ly=homeMark.y;
        var wx=sx+Math.cos(th0)*lx-Math.sin(th0)*ly;
        var wy=sy+Math.sin(th0)*lx+Math.cos(th0)*ly;
        ctx.save();
        ctx.globalAlpha=a*dim*.72;
        ctx.strokeStyle='rgba(206,238,178,'+(.34*a*dim)+')'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(wx-9,wy); ctx.lineTo(wx-3,wy); ctx.stroke();
        ctx.fillStyle='rgba(226,244,206,.95)';
        ctx.font='11px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textBaseline='middle';
        ctx.fillText('斗罗', wx, wy);
        ctx.restore();
      }

      /* 神界：恒星系之外的一处光 */
      var gx, gy;
      if(W<760){ gx=sx-W*.30; gy=sy+16; }
      else { gx=sx-W*.17*k; gy=sy-H*.19*k; }
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      var gp=.72+.28*Math.sin(clock*.0011);
      var gcore=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.min(W,H)*.055);
      gcore.addColorStop(0,'rgba(255,252,236,'+(1*a*dim)+')');
      gcore.addColorStop(.22,'rgba(255,230,158,'+(.55*a*dim*gp)+')');
      gcore.addColorStop(.58,'rgba(255,204,118,'+(.16*a*dim)+')');
      gcore.addColorStop(1,'rgba(255,190,90,0)');
      ctx.fillStyle=gcore;
      ctx.beginPath(); ctx.arc(gx,gy,Math.min(W,H)*.055,0,6.283); ctx.fill();
      /* 光门双环 */
      ctx.strokeStyle='rgba(255,238,186,'+(.5*a*dim)+')'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(gx,gy,9,15,-.18,0,6.283); ctx.stroke();
      ctx.strokeStyle='rgba(255,226,160,'+(.26*a*dim)+')';
      ctx.beginPath(); ctx.ellipse(gx,gy,15,22,-.18,0,6.283); ctx.stroke();
      /* 十道细光 */
      for(var q=0;q<10;q++){
        var qa=q*(6.283/10)+clock*.0002;
        var r1=18, r2=30+8*Math.sin(clock*.0012+q);
        ctx.strokeStyle='rgba(255,240,196,'+(.22*a*dim)+')'; ctx.lineWidth=.8;
        ctx.beginPath();
        ctx.moveTo(gx+Math.cos(qa)*r1, gy+Math.sin(qa)*r1*1.2);
        ctx.lineTo(gx+Math.cos(qa)*r2, gy+Math.sin(qa)*r2*1.2);
        ctx.stroke();
      }
      /* 垂落的光 */
      var gl2=ctx.createLinearGradient(gx,gy,gx,gy+H*.16);
      gl2.addColorStop(0,'rgba(255,232,170,'+(.18*a*dim)+')');
      gl2.addColorStop(1,'rgba(255,210,140,0)');
      ctx.fillStyle=gl2; ctx.fillRect(gx-7,gy,14,H*.16);
      ctx.restore();
      ctx.globalAlpha=a*dim*.8;
      ctx.fillStyle='rgba(255,240,198,.9)';
      ctx.font='10px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('神界', W<760 ? gx-30 : gx+16, gy+3);
      ctx.globalAlpha=1;
    }

    /* ───── 斗罗星 ───── */
    function hash2(x,y,s){
      var n=Math.sin(x*127.1+y*311.7+s*13.77)*43758.5453;
      return n-Math.floor(n);
    }
    function vn(x,y,per,s){
      var xi=Math.floor(x), yi=Math.floor(y);
      var xf=x-xi, yf=y-yi;
      var u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
      var x0=((xi%per)+per)%per, x1=(((xi+1)%per)+per)%per;
      var a=hash2(x0,yi,s), b=hash2(x1,yi,s), c2=hash2(x0,yi+1,s), d=hash2(x1,yi+1,s);
      return (a+(b-a)*u)*(1-v)+(c2+(d-c2)*u)*v;
    }
    function fbm(x,y,per,s){
      var r=0,amp=.5,f=1;
      for(var i=0;i<3;i++){ r+=amp*vn(x*f,y*f,per*f,s+i*31); amp*=.5; f*=2; }
      return r;
    }

    /* 纹理分帧烘：一帧只算几行，封面那几秒就烘完了 */
    var TEX=null, CLD=null, TEXW=1536, TEXH=768, CLDW=768, CLDH=384;
    var texRow=0, texStage=0, TEX_READY=false;

    function texRow0(y){
      var lat=(.5-(y+.5)/TEXH)*3.1415926;
      var cmp=Math.abs(lat)/1.5707963;
      for(var x=0;x<TEXW;x++){
        var f=fbm(x/TEXW*26,(y/TEXH)*13,26,11);
        var dd=fbm(x/TEXW*64+5,(y/TEXH)*32+3,64,63);
        var h=f*.85+dd*.15+.045*Math.cos(lat*2.6)-.12*cmp*cmp;
        var gr=.90+.20*fbm(x/TEXW*150+11,(y/TEXH)*75+7,150,7);
        var o=(y*TEXW+x)*3, r,g,b;
        if(h<.412){ var t0=h/.412; r=9+16*t0; g=46+30*t0; b=58+24*t0; }
        else if(h<.436){ var t1=(h-.412)/.024; r=24+18*t1; g=74+30*t1; b=80+10*t1; }
        else if(h<.446){ var t2=(h-.436)/.010; r=40+6*t2; g=100+2*t2; b=88-24*t2; }
        else {
          var lv=Math.min(1,(h-.446)/.19);
          var m=fbm(x/TEXW*44+2.4,(y/TEXH)*22+1.7,44,47);
          var dry=Math.max(0,Math.min(1,(m-.54)*3.6))*.45;
          var belt=Math.exp(-Math.pow((cmp-.34)/.11,2));
          dry=Math.max(dry,belt*Math.max(0,(m-.52)*.95));
          (r=30+96*dry+28*lv), (g=94-18*dry+24*lv), (b=46-16*dry+12*lv);
          if(h>.655){ var k2=(h-.655)/.345; r+=40*k2; g+=34*k2; b+=22*k2; }
        }
        var em2=.86+.28*dd; r*=em2; g*=em2; b*=em2;
        if(cmp>.868){
          var ice=Math.min(1,(cmp-.868)/.048)+(hash2(x,y,5)-.5)*.2;
          if(ice>0){ var t3=Math.min(1,ice); r=r*(1-t3)+228*t3; g=g*(1-t3)+238*t3; b=b*(1-t3)+232*t3; }
        }
        TEX[o]=r*gr; TEX[o+1]=g*gr; TEX[o+2]=b*gr;
      }
    }
    function texRow1(y){
      var la=(.5-(y+.5)/CLDH)*3.1415926;
      var band=.42+.58*Math.cos(la*3.1);
      for(var x=0;x<CLDW;x++){
        var wx=x/CLDW*26+Math.sin(y/CLDH*18)*.22;
        var v=fbm(wx,(y/CLDH)*13,26,91)*.78+fbm(wx*2.3,(y/CLDH)*27,60,17)*.22;
        v=(v-.465)*3.6*Math.abs(band);
        v=v<0?0:(v>1?1:v);
        CLD[y*CLDW+x]=Math.round(v*v*(3-2*v)*238);
      }
    }
    function texStep(budget){
      var t0=performance.now();
      if(!TEX){ TEX=new Uint8Array(TEXW*TEXH*3); texRow=0; texStage=0; }
      if(texStage===0){
        while(texRow<TEXH && performance.now()-t0<budget){ texRow0(texRow); texRow++; }
        if(texRow>=TEXH){ texStage=1; texRow=0; CLD=new Uint8Array(CLDW*CLDH); }
      } else if(texStage===1){
        while(texRow<CLDH && performance.now()-t0<budget){ texRow1(texRow); texRow++; }
        if(texRow>=CLDH){ TEX_READY=true; }
      }
    }
    var TEX1=null, TEX2=null, CLD1=null;
    function down(src,w,h,ch){
      var w2=w>>1, h2=h>>1, out=new Uint8Array(w2*h2*ch), str=w*ch, s2=ch;
      for(var y=0;y<h2;y++){
        var ro=y*str, ro2=(y+1)*str, oo=y*w2*ch;
        for(var x=0;x<w2;x++){
          var a=ro+x*2*ch, b=a+s2, c=a+str, d2=c+s2;
          for(var k=0;k<ch;k++){
            out[oo+x*ch+k]=(src[a+k]+src[b+k]+src[c+k]+src[d2+k])>>2;
          }
        }
      }
      return out;
    }
    function buildMips(){
      if(TEX1 || !TEX || !CLD) return;
      TEX1=down(TEX,TEXW,TEXH,3);
      TEX2=down(TEX1,TEXW>>1,TEXH>>1,3);
      CLD1=down(CLD,CLDW,CLDH,1);
    }
    (function texLoop(){
      texStep(8);
      if(!TEX_READY) requestAnimationFrame(texLoop);
      else buildMips();
    })();

    /* 球面：按设备像素分块渲染，做完再换上前一张 */
    var pl={c1:null,c2:null,x1:null,x2:null,front:null,back:null,bctx:null,img:null,
      row:0,ow:0,oh:0,cx:0,cy:0,R:0,building:false,rot:.8,last:0,doneKey:'',readyKey:''};

    function plSize(R){
      var dpr=Math.min(2,window.devicePixelRatio||1);
      var ss=Math.max(1,Math.min(1.5,dpr));
      var n=Math.round(2*R*ss);
      var cap=380000;
      if(n*n>cap) n=Math.round(Math.sqrt(cap));
      return Math.max(8,n);
    }
    /* 球面几何与光照只跟尺寸有关：一次算好，之后每帧只做纹理取样 */
    var GEO={n:0,u0:null,sh:null,rim:null,tr:null,tr2:null,vf:null,cr:null,cr2:null,cvf:null,al:null};
    function buildGeo(n){
      var cnt=n*n, i=0;
      buildMips();
      var lvl = n>=820?0:(n>=380?1:2);
      var tw = lvl===0?TEXW:(lvl===1?(TEXW>>1):(TEXW>>2));
      var th = lvl===0?TEXH:(lvl===1?(TEXH>>1):(TEXH>>2));
      var td = lvl===0?TEX:(lvl===1?TEX1:TEX2);
      var cl = n<560?1:0;
      var cw = cl?(CLDW>>1):CLDW, chh = cl?(CLDH>>1):CLDH;
      var cd = cl?CLD1:CLD;
      GEO.td=td; GEO.tw=tw; GEO.th=th; GEO.cd=cd; GEO.cw=cw;
      GEO.n=n;
      GEO.u0=new Float32Array(cnt);
      GEO.sh=new Float32Array(cnt);
      GEO.rim=new Uint8ClampedArray(cnt*3);
      GEO.tr=new Uint32Array(cnt);
      GEO.tr2=new Uint32Array(cnt);
      GEO.vf=new Uint8ClampedArray(cnt);
      GEO.cr=new Uint32Array(cnt);
      GEO.cr2=new Uint32Array(cnt);
      GEO.cvf=new Uint8ClampedArray(cnt);
      GEO.al=new Uint8ClampedArray(cnt);
      var Lx=.46, Ly=-.42, Lz=.78;
      for(var py=0;py<n;py++){
        var ny=((py+.5)/n)*2-1, ny2=ny*ny;
        var lat=Math.asin(-ny), v=.5-lat*0.31830989;
        var vy=(v*th)|0, vf=v*th-vy;
        var trow=vy*tw*3, trow2=((vy+1)%th)*tw*3;
        var cyv=(v*chh)|0, cvf=v*chh-cyv;
        var crow=cyv*cw, crow2=((cyv+1)%chh)*cw;
        for(var px=0;px<n;px++,i++){
          var nx=((px+.5)/n)*2-1;
          var d2=nx*nx+ny2;
          if(d2>=1){ GEO.al[i]=0; continue; }
          var nz=Math.sqrt(1-d2);
          GEO.u0[i]=Math.atan2(nx,nz)*0.15915494+.5;
          var dot=nx*Lx+ny*Ly+nz*Lz;
          var sh=dot>0?(.028+1.14*Math.pow(dot,1.05)):.028;
          if(dot>0&&dot<.22) sh+=.13*(1-dot/.22);
          GEO.sh[i]=sh;
          var rim=1-nz; rim=rim*rim*rim*rim*rim;
          var ra=rim*(.04+.96*Math.max(0,Math.min(1,dot*2.2)))*.85;
          GEO.rim[i*3]=118*ra; GEO.rim[i*3+1]=176*ra; GEO.rim[i*3+2]=104*ra;
          GEO.tr[i]=trow; GEO.tr2[i]=trow2; GEO.vf[i]=vf*255;
          GEO.cr[i]=crow; GEO.cr2[i]=crow2; GEO.cvf[i]=cvf*255;
          var edge=1-d2;
          GEO.al[i]= edge<0.006 ? (edge/0.006)*255 : 255;
        }
      }
    }
    function beginPlanet(n,cx,cy,R){
      if(!pl.c1){
        pl.c1=document.createElement('canvas'); pl.x1=pl.c1.getContext('2d');
        pl.c2=document.createElement('canvas'); pl.x2=pl.c2.getContext('2d');
        pl.front=pl.c1;
      }
      if(GEO.n!==n) buildGeo(n);
      var back=(pl.front===pl.c1)?pl.c2:pl.c1;
      var bx=(pl.front===pl.c1)?pl.x2:pl.x1;
      if(back.width!==n||back.height!==n){ back.width=n; back.height=n; }
      pl.back=back; pl.bctx=bx; pl.img=bx.createImageData(n,n);
      pl.ow=n; pl.oh=n; pl.cx=cx; pl.cy=cy; pl.R=R; pl.row=0; pl.building=true;
    }
    function pumpPlanet(budget){
      if(!pl.building) return;
      var n=pl.ow, d=pl.img.data, rotT=pl.rot*0.15915494;
      var total=n*n;
      var step=Math.max(n, Math.floor(budget));
      var start=pl.row, end=Math.min(total,start+step);
      var u0=GEO.u0, gsh=GEO.sh, grim=GEO.rim, gtr=GEO.tr, gtr2=GEO.tr2, gvf=GEO.vf;
      var gcr=GEO.cr, gcr2=GEO.cr2, gcvf=GEO.cvf, gal=GEO.al;
      var TD=GEO.td, TW=GEO.tw, CD=GEO.cd, CW=GEO.cw;
      for(var i=start;i<end;i++){
        var o2=i*4, af=gal[i];
        if(af===0){ d[o2+3]=0; continue; }
        var t=u0[i]+rotT; t-=Math.floor(t);
        var tx=t*TW, x0=tx|0, fx=tx-x0, x1=x0+1; if(x1>=TW) x1=0;
        var fv=gvf[i]*0.00392157, nv=1-fv;
        var r0=gtr[i], r1=gtr2[i], o00=r0+x0*3, o01=r0+x1*3, o10=r1+x0*3, o11=r1+x1*3;
        var cr=(TD[o00]+(TD[o01]-TD[o00])*fx)*nv+(TD[o10]+(TD[o11]-TD[o10])*fx)*fv;
        var cg=(TD[o00+1]+(TD[o01+1]-TD[o00+1])*fx)*nv+(TD[o10+1]+(TD[o11+1]-TD[o10+1])*fx)*fv;
        var cb=(TD[o00+2]+(TD[o01+2]-TD[o00+2])*fx)*nv+(TD[o10+2]+(TD[o11+2]-TD[o10+2])*fx)*fv;
        var cu=t+0.17; if(cu>=1) cu-=1;
        var cx0=cu*CW|0, cfx=cu*CW-cx0, cx1=cx0+1; if(cx1>=CW) cx1=0;
        var cfv=gcvf[i]*0.00392157, cnv=1-cfv;
        var q0=gcr[i], q1=gcr2[i];
        var raw=(CD[q0+cx0]+(CD[q0+cx1]-CD[q0+cx0])*cfx)*cnv
               +(CD[q1+cx0]+(CD[q1+cx1]-CD[q1+cx0])*cfx)*cfv;
        var ca=raw>25?(raw-25.5)*0.002701:0;
        if(ca>0.004){
          cr=cr*(1-ca)+248*ca; cg=cg*(1-ca)+252*ca; cb=cb*(1-ca)+238*ca;
        }
        var sh=gsh[i], r3=i*3;
        cr=cr*sh+grim[r3]; cg=cg*sh+grim[r3+1]; cb=cb*sh+grim[r3+2];
        if(af<255){
          var f=af*0.00392157;
          d[o2]=cr*f; d[o2+1]=cg*f; d[o2+2]=cb*f; d[o2+3]=af;
        }else{
          d[o2]=cr>255?255:cr; d[o2+1]=cg>255?255:cg; d[o2+2]=cb>255?255:cb; d[o2+3]=255;
        }
      }
      /* putImageData 以像素为单位，整行整块刷 */
      var y0=(start/n)|0, y1=Math.ceil(end/n);
      pl.bctx.putImageData(pl.img,0,0,0,y0,n,y1-y0);
      pl.row=end;
      if(pl.row>=total){
        pl.front=pl.back; pl.building=false; pl.readyKey=pl.doneKey; pl.builtRot=pl.rot;
      }
    }
    function drawPlanet(a,k,cx,cy){
      var R=(W<760?Math.min(112,W*.27):Math.min(W,H)*.225)*k;
      if(R<6) return;
      var n=plSize(R);
      var key=n+'|'+Math.round(cx)+'|'+Math.round(cy)+'|'+R.toFixed(1);
      var now=performance.now();
      var needRot = Math.abs(pl.rot-(pl.builtRot==null?pl.rot:pl.builtRot))>0.0018;
      if(!pl.building && (key!==pl.doneKey || needRot) && (now-pl.last>30)){
        pl.doneKey=key; pl.last=now; beginPlanet(n,cx,cy,R);
      }
      if(pl.building) pumpPlanet(200000);
      /* 外大气 */
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      var g=ctx.createRadialGradient(cx,cy,R*.985,cx,cy,R*1.075);
      g.addColorStop(0,'rgba(178,214,152,'+(.30*a*dim)+')');
      g.addColorStop(.34,'rgba(206,198,146,'+(.05*a*dim)+')');
      g.addColorStop(1,'rgba(150,180,120,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,R*1.075,0,6.283); ctx.fill();
      ctx.restore();
      if(pl.front){
        ctx.globalAlpha=a*dim;
        ctx.imageSmoothingEnabled=true;
        ctx.drawImage(pl.front,cx-R,cy-R,R*2,R*2);
        ctx.globalAlpha=1;
      }
      ctx.save();
      ctx.beginPath(); ctx.arc(cx,cy,R,0,6.283);
      ctx.strokeStyle='rgba(232,244,206,'+(.09*a*dim)+')';
      ctx.lineWidth=.7; ctx.stroke();
      ctx.restore();
    }

    /* ───── 大陆上空：逐像素，按设备像素分块烘 ───── */
    var surfJob={cv:null,ctx:null,img:null,w:0,h:0,row:0,building:false,ready:false,sc:1};
    var cloudL={cv:null,ctx:null};

    function beginSurface(){
      if(!surfJob.cv){ surfJob.cv=document.createElement('canvas'); surfJob.ctx=surfJob.cv.getContext('2d'); }
      var dpr0=Math.min(2,window.devicePixelRatio||1);
      var sc=Math.max(1,Math.min(1.45,dpr0));
      if(W*H*sc*sc>1.9e6) sc=Math.sqrt(1.9e6/(W*H));
      var w=Math.max(2,Math.round(W*sc)), h=Math.max(2,Math.round(H*sc));
      if(surfJob.cv.width!==w||surfJob.cv.height!==h){ surfJob.cv.width=w; surfJob.cv.height=h; }
      surfJob.w=w; surfJob.h=h; surfJob.sc=sc;
      surfJob.img=surfJob.ctx.createImageData(w,h);
      surfJob.row=0; surfJob.building=true; surfJob.ready=false;
    }
    function pumpSurface(budget){
      if(!surfJob.building) return;
      var w=surfJob.w,h=surfJob.h,d=surfJob.img.data;
      var hz=H*.30, R=H*1.92, cx=W*.52, cy=hz+R;
      var sx0=W/w, sy0=H/h;
      var rows=Math.max(4,Math.floor(budget/w));
      var start=surfJob.row, end=Math.min(h,start+rows);
      for(var y=start;y<end;y++){
        var sy=(y+.5)*sy0;
        var ny=(sy-cy)/R, ny2=ny*ny;
        for(var x=0;x<w;x++){
          var o4=(y*w+x)*4;
          var sx=(x+.5)*sx0;
          var nx=(sx-cx)/R;
          var d2=nx*nx+ny2;
          if(d2>=1){ d[o4+3]=0; continue; }
          var nz=Math.sqrt(1-d2);
          var k=1+.85*(1-nz);
          var e0=fbm(nx*24*k, ny*24*k, 24, 21);
          var det=fbm(nx*82*k+7.3, ny*82*k+4.1, 82, 33);
          var e=e0+(det-.44)*.085;
          var r,g,b;
          if(e<.440){ var t0=e/.440; r=8+14*t0; g=40+30*t0; b=62+28*t0; }
          else if(e<.500){ var t1=(e-.440)/.060; r=21+15*t1; g=62+34*t1; b=80+12*t1; }
          else if(e<.514){ var t2=(e-.500)/.014; r=36+10*t2; g=96-6*t2; b=92-24*t2; }
          else {
            var m=fbm(nx*64*k+3.1, ny*64*k+1.7, 64, 47);
            var lv=Math.min(1,(e-.514)/.19);
            var dry=Math.max(0,(m-.56))*2.6;
            (r=38+30*lv+86*dry), (g=104+16*lv-32*dry), (b=44+10*lv-18*dry);
          }
          var gr=.93+.14*hash2(x,y,3);
          var dm=.92+.19*det; r*=gr*dm; g*=gr*dm; b*=gr*dm;
          /* 大气霾：越靠近地平线越浓 */
          var hz0=Math.max(0,Math.min(1,(ny+.60)/-.30));
          hz0=hz0*hz0*hz0*.62;
          r=r*(1-hz0)+156*hz0; g=g*(1-hz0)+204*hz0; b=b*(1-hz0)+176*hz0;
          /* 阳光 */
          var gx=(sx-W*.735)/(W*.30), gy=(sy-(hz+(H-hz)*.22))/(H*.20);
          var gl=Math.exp(-(gx*gx+gy*gy))*38;
          r+=gl*1.0; g+=gl*.94; b+=gl*.72;
          var edge=(1-d2);
          if(edge<0.0012){
            var fe=edge/0.0012;
            r=r*fe+150*(1-fe); g=g*fe+206*(1-fe); b=b*fe+176*(1-fe);
            d[o4+3]=255*Math.min(1,fe*1.4);
          } else d[o4+3]=255;
          d[o4]=r>255?255:r; d[o4+1]=g>255?255:g; d[o4+2]=b>255?255:b;
        }
      }
      surfJob.ctx.putImageData(surfJob.img,0,0,0,start,w,end-start);
      surfJob.row=end;
      if(surfJob.row>=h){ surfJob.building=false; surfJob.ready=true; }
    }
    function buildClouds(){
      var cs=Math.max(1,Math.min(1, (window.devicePixelRatio||1)*.8));
      var w=Math.round(W*cs), h=Math.round(H*cs);
      if(!cloudL.cv){ cloudL.cv=document.createElement('canvas'); }
      if(cloudL.cv.width!==w||cloudL.cv.height!==h){ cloudL.cv.width=w; cloudL.cv.height=h; }
      var g=cloudL.cv.getContext('2d'); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,w,h); g.scale(cs,cs);
      var i,j;
      for(i=0;i<6;i++){
        var cxb=rnd(-.05,1.0)*W, cyb=H*(.34+Math.random()*.6);
        for(j=0;j<46;j++){
          var t=j/70, lx=cxb+t*rnd(.14,.30)*W, ly=cyb+Math.sin(t*6.283+i*1.7)*H*.022+t*rnd(-.02,.02)*H;
          var rr=rnd(.003,.011)*H;
          g.beginPath(); g.ellipse(lx+rnd(-.012,.012)*W, ly+rnd(-.008,.008)*H, rr*3.6, rr*.72, rnd(-.35,.35), 0, 6.283);
          g.fillStyle='rgba(252,250,240,'+rnd(.05,.14)+')'; g.fill();
        }
      }
      for(i=0;i<150;i++){
        var px0=rnd(-.05,1.05)*W, py0=H*(.32+Math.random()*.66), pr=rnd(.002,.008)*H;
        g.beginPath(); g.ellipse(px0,py0,pr*2.4,pr,rnd(-.5,.5),0,6.283);
        g.fillStyle='rgba(252,251,242,'+rnd(.04,.12)+')'; g.fill();
      }
      cloudL.cs=cs;
    }
    function drawSurface(a,k){
      if(!surfJob.building && !surfJob.ready) beginSurface();
      if(surfJob.building) pumpSurface(36000);
      if(!cloudL.cv) buildClouds();
      var dy=H*.012*(1-k);
      var hz=H*.30, R=H*1.92, cx=W*.52, cy=hz+R;
      ctx.save();
      ctx.globalAlpha=a*dim*(W<760?.86:1);
      if(surfJob.ready){
        ctx.drawImage(surfJob.cv,0,dy,W,H);
      }
      if(cloudL.cv){
        ctx.globalAlpha=a*dim*(W<760?.74:.9);
        ctx.drawImage(cloudL.cv, Math.sin(clock*.00002)*W*.008, dy+H*.004, W, H);
      }
      ctx.restore();
      /* 地平弧辉光 */
      ctx.save();
      ctx.globalAlpha=a*dim;
      var q;
      for(q=0;q<3;q++){
        ctx.beginPath(); ctx.arc(cx,cy+dy,R+q*5,0,6.283);
        ctx.strokeStyle='rgba(196,230,180,'+(0.16-q*0.045)+')';
        ctx.lineWidth=2+q*9; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx,cy+dy,R,0,6.283);
      ctx.strokeStyle='rgba(240,252,220,.62)'; ctx.lineWidth=1.1; ctx.stroke();
      ctx.restore();
      /* 手机：地平线以下迅速收进暗里，正文才压得住 */
      if(W<760){
        var sg=ctx.createLinearGradient(0,H*.30,0,H*.60);
        sg.addColorStop(0,'rgba(6,4,12,0)');
        sg.addColorStop(.34,'rgba(6,4,12,.44)');
        sg.addColorStop(1,'rgba(6,4,12,.90)');
        ctx.fillStyle=sg; ctx.fillRect(0,H*.30,W,H*.70);
      }
    }

    function drawBg(a){
      var i,s;
      for(i=0;i<stars.length;i++){
        s=stars[i];
        var tw=.55+.45*Math.sin(clock*.0012+s.ph);
        ctx.globalAlpha=s.a*tw*a*dim;
        ctx.fillStyle='rgb('+s.c.join(',')+')';
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha=1;
    }

    function paint(){
      ctx.clearRect(0,0,W,H);
      var e=ease(Math.min(1,mix));
      var baseA=rev;
      if(prev&&prev!==stage&&e<1){
        drawStage(prev,(1-e)*baseA,1+.30*e);
      }
      drawStage(stage,e*baseA,(0.84+.16*e)*(0.94+0.06*rev));
      /* 穿越白雾 */
      if(e<1&&prev&&prev!==stage){
        var fl=Math.sin(e*3.14159);
        ctx.save(); ctx.globalAlpha=fl*.14*dim;
        ctx.fillStyle='#DCEBFF'; ctx.fillRect(0,0,W,H); ctx.restore();
      }
    }
    function drawStage(n,a,k){
      if(a<=0.002) return;
      var mob = W < 760;
      if(mob){
        if(n===1) drawBg(a*.8), drawGalaxy(a,.88,W*.50,158);
        else if(n===2) drawBg(a*.8), drawArm(a,.98,W*.50,208);
        else if(n===3) drawBg(a*.8), drawSystem(a,.88,W*.50,112+H*.20);
        else if(n===4) drawBg(a*.8), drawPlanet(a,1,W*.50,152);
        else if(n===5) drawBg(a*.7), drawSurface(a,k);
        return;
      }
      /* 760–1279：单栏布局，用"上方空档"反推场景尺寸 */
      if(W < 1280){
        var zone = Math.min(H*.44, 420);
        var kk = Math.max(.30, Math.min(1.05, (zone*.84) / (Math.min(W,H)*.40)));
        if(n===1) drawBg(a*.9), drawGalaxy(a, kk, W*.50, zone*.50);
        else if(n===2) drawBg(a*.48), drawArm(a, kk*1.02, W*.50, zone*.55);
        else if(n===3) drawBg(a*.62), drawSystem(a, Math.max(.3, zone*.42/(Math.min(W,H)*.395)), W*.53, zone*.60);
        else if(n===4) drawBg(a*.55), drawPlanet(a, (zone*.40)/(Math.min(W,H)*.225), W*.50, zone*.52);
        else if(n===5) drawBg(a*.34), drawSurface(a,k);
        return;
      }
      /* 桌面：右栏净场 */
      if(n===1) drawBg(a*.9), drawGalaxy(a, k, W*.725, H*.46);
      else if(n===2) drawBg(a*.48), drawArm(a, k, W*.72, H*.50);
      else if(n===3) drawBg(a*.62), drawSystem(a, k*.80, W*.745, H*.545);
      else if(n===4) drawBg(a*.55), drawPlanet(a, k, W*.755, H*.50);
      else if(n===5) drawBg(a*.34), drawSurface(a,k);
    }

    function loop(now){
      raf=0;
      if(!lastT) lastT=now;
      var gap=now-lastT;
      if(gap < (PERF.fps ? 1000/PERF.fps - 2 : 15)){ raf=requestAnimationFrame(loop); return; }
      lastT=now; clock=now;
      var dt=Math.min(3,gap/16.67);
      mix+=(1-mix)*(1-Math.pow(.001,dt*.055));
      rev+=(1-rev)*(1-Math.pow(.001,dt*.045));
      dim+=(dimT-dim)*(1-Math.pow(.001,dt*.05));
      spin+=.00016*dt;
      pl.rot+=.0007*dt;
      paint();
      if(on) raf=requestAnimationFrame(loop);
    }
    function start(){
      if(raf) cancelAnimationFrame(raf);
      on=true; lastT=0; resize(); raf=requestAnimationFrame(loop);
    }
    function still(){
      if(raf) cancelAnimationFrame(raf);
      raf=0; on=false; mix=1; resize(); clock=performance.now(); pl.key=''; paint();
    }
    window.addEventListener('resize',function(){
      if(on) start(); else still();
    },{passive:true});

    return {
      start:start, still:still,
      st:{ get dim(){return dim;}, set dimT(v){ dimT=v; } },
      reveal:function(){ rev=0; },
      setStage:function(n){
        if(n===stage) return;
        prev=stage; stage=n; mix=0; pl.key='';
        if(n>=4&&!TEX) setTimeout(buildPlanetAssets,40);
        if(n>=5) setTimeout(function(){ if(!surfJob.building && !surfJob.ready) beginSurface(); if(!cloudL.cv) buildClouds(); },30);
      },
      reenter:function(){ rev=0; }
    };
  })();

  /* ═════ 数据 ═════ */
  var GIVEN = '千';
  var NAMES = {"男":["千既白","千照临","千砚秋","千行简"],"女":["千知微","千令仪","千疏影","千静姝"]};
  var LOOKS = {"女":[{"id":"L-F01","n":"银发紫瞳","d":"「相貌」\n银发及腰，发丝细软，尾端微卷。瞳色深紫，湿重，左眼下一颗泪痣。皮肤冷白，眉骨低平，鼻梁窄挺，唇薄，上唇唇峰尖锐。\n\n「身材」\n肩窄，锁骨窝里青色血管走向清晰。胸部饱满，和骨架不成比例，乳房挺立圆润。腰细到一只手臂能箍住，胯骨宽，臀圆翘，腰臀之间弧线落差陡。大腿内侧皮薄，合拢时中间留一指宽缝隙。手腕纤细，脚踝骨突出。\n\n「私处」\n阴阜覆稀疏银白绒毛。阴唇薄且紧闭，缝隙几乎看不见，颜色和周围皮肤一样白，掰开后内里深粉，黏膜润泽。阴道口小，甬道窄浅，壁肉紧密吸附，容纳一根手指就有明显挤压感。肛门浅粉，褶皱细密排列整齐，收缩力强，指尖按上去会被肌肉推回来。"},{"id":"L-F02","n":"墨发金瞳","d":"「相貌」\n黑发发蓝，厚重，垂到肩胛骨中间，光打上去泛冷色油光。瞳仁深处压一层沉金，乍看纯黑。脸型偏小，下巴收得尖，颧骨不高，五官聚拢在脸中央。\n\n「身材」\n身量高挑，骨架匀称，肩线流畅过渡到手臂。胸部中等偏上，乳型圆挺，不穿内衣也不下坠，乳晕玫瑰褐色，比铜钱略小，乳头粗短。腰腹平坦紧实，肚脐深。臀结实浑圆，拍上去弹手。大腿修长有力，并拢时严丝合缝，要用手掰开。\n\n「私处」\n阴毛浓密乌黑，有修剪痕迹，三角区域边缘整齐。大阴唇厚实饱满，将小阴唇完全包裹在内，合拢时外面只有一条深色的线。掰开后内里浓玫红，黏膜湿润。阴道口有弹性，入口处一圈肌肉有明显收缩感，甬道内壁柔软多褶。肛门偏深色，褶皱较粗，周围皮肤颜色比臀瓣深两个色号，弹性适中。"},{"id":"L-F03","n":"白发红瞳","d":"「相貌」\n白发到肩，发质软塌贴头皮。红瞳极淡，虹膜边缘带浅橙。脸颊婴儿肥没褪干净，鼻头圆，嘴小，整个人比同龄小一截。\n\n「身材」\n骨架小，肩窄，手脚小一号。胸几乎平坦，只有乳尖凸出，乳晕极小极淡，接近肤色，乳头嫩软。肋骨在皮下隐约可见。腰纤细到病态，胯窄，臀小而扁。腿细，膝盖骨突出，大腿间距宽。\n\n「私处」\n阴阜平坦光滑，几乎无耻毛。阴唇薄小，淡粉色，小阴唇微微露出边缘。阴道口紧到近乎抗拒，甬道极窄极短，一根手指就有被撑满的挤压感，壁肉嫩软。肛门小巧粉白，褶皱浅细，肌肉紧绷，指尖抵上去几乎进不去。"},{"id":"L-F04","n":"淡紫长发","d":"「相貌」\n淡紫长发，光泽比母亲那头更冷，掺了灰调。发尾搭在后腰。眼尾一道极淡的痕迹，不仔细看当成阴影。五官底子来自母亲，气质更冷硬，笑的弧度小。\n\n「身材」\n沙漏型。胸部丰盈，乳房弧度饱满，乳晕偏紫粉棕，中等大小，乳头粗短。腰紧窄，腹部有浅肌肉纹路。臀宽大丰腴，走动时两瓣互相挤压。大腿粗壮结实，内侧皮肤细嫩。\n\n「私处」\n阴毛偏紫，细软蜷曲，分布面积不大。大阴唇丰厚，小阴唇偏长，合拢时也从缝隙中微微露出，颜色深玫粉。阴道口松紧适中，进入后内壁褶皱层层叠叠蠕动，甬道深且有弹性，越深处越紧。肛门偏深棕，褶皱明显，肌肉力量适中，能缓慢放松接纳。"},{"id":"L-F05","n":"黑发蓝瞳","d":"「相貌」\n黑发过肩，日常扎脑后。瞳孔收缩时虹膜边缘渗出一圈冰蓝，平时纯黑。唇色极淡，几乎和周围皮肤一个颜色，得凑近才分辨唇线。五官端正，每一处都收在不出挑的范围内。\n\n「身材」\n偏瘦有肌肉线条，小臂内侧绷紧时筋腱可见。胸部B杯左右，底盘小巧向前挺立，晃动幅度不大。乳晕小而圆，清淡粉色，乳头敏感，碰一下就缩紧。腰线利落无赘肉，臀偏窄偏翘，紧致。腿长线条干净。\n\n「私处」\n阴阜微微隆起，耻毛稀薄乌黑。阴唇小巧，合拢严实，外观整洁。分开后内部嫩粉，黏膜分泌不多，偏干。阴道口紧，甬道内壁光滑，深处有一小块粗糙凸起，按压时身体反应剧烈，腰会弹起来。肛门颜色浅淡，褶皱少而浅，触感柔软，不太抗拒进入。"},{"id":"L-F06","n":"清冷","d":"「相貌」\n眉色淡，眼距略宽，看什么都带疏离。笑的时候眼底没温度，嘴角拉出弧度反而把人推得更远。面部线条干净，不留多余表情。\n\n「身材」\n骨架纤细比例精确。锁骨平直突出，肩胛骨在背后撑出薄棱。胸部中等，乳房水滴形，上半平缓下半坠弧，乳晕极浅，几乎与乳房皮肤融一体，乳头小而平，需要刺激才充血凸起。腰到胯过渡平直，臀圆润但不夸张。大腿纤细白皙。\n\n「私处」\n阴阜几乎无毛，皮肤光滑冰凉。阴唇单薄，颜色淡到发白，小阴唇完全被包裹在内。阴道口紧且干，需要很长时间前戏才开始分泌液体，湿润后内壁极敏感，轻微摩擦就引发痉挛，甬道会不自主地收缩绞紧。肛门浅粉，褶皱极细极密，收得紧，放松很慢。"},{"id":"L-F07","n":"明艳","d":"「相貌」\n五官浓烈，眼尾上挑，眉浓黑，嘴唇厚而饱满，天生唇色就红。在人群里第一眼就被看见，不用开口光站着就抢视线。\n\n「身材」\n肉感型，骨架中等但肉量充足。胳膊圆润，掐一把满手。胸部大，松开束缚后自然下坠晃动，乳晕大而深棕，乳头粗大挺立。腰部有薄脂肪覆盖，手感柔软，底下有肌肉支撑。臀宽阔丰满，走动时臀浪明显。大腿粗，内侧贴合紧密，走久了磨红。\n\n「私处」\n阴毛旺盛浓密乌黑蜷曲，分布延伸到大腿根部。大阴唇肥厚多肉，小阴唇外翻，深红近紫，褶皱明显，边缘不规则。阴道口宽松湿润，容易大量分泌液体，甬道柔软多汁，深处宽裕，内壁有吸附蠕动感，能把进入的东西往里拖。肛门颜色深，褶皱粗大，弹性好，扩张能力强，稍加放松就能吞入。"},{"id":"L-F08","n":"病弱","d":"「相貌」\n脸色常年苍白，唇色寡淡。手腕伸出来细到桡骨和尺骨之间的凹陷清晰可见，手背青筋分明。眼窝微凹，颧骨撑着一层薄皮。\n\n「身材」\n肩往内收，胸腔扁平，呼吸时肋骨在皮下一根根浮现。胸部贫瘠，薄薄一层脂肪覆盖胸骨，摸得到硬的乳腺组织，乳晕小，灰粉色，乳头微陷。腰脆弱，腹凹陷，髋骨突出。臀扁平无曲线，臀缝浅。大腿间距过宽，皮包骨。\n\n「私处」\n阴阜凹陷，耻骨在上方顶出硬棱，几乎无阴毛。阴唇单薄贴合，颜色灰白偏粉。阴道口窄小紧涩，甬道干燥，壁肉薄，隔着阴道壁能摸到后方肠壁蠕动。整体容纳度低，稍粗的东西就会让入口发白绷紧。肛门苍白，褶皱浅，肌肉力量弱，稍碰就松开，几乎没有夹紧的能力。"}],"男":[{"id":"L-M01","n":"墨发金瞳","d":"「相貌」\n黑发垂到眉骨，额前几缕总遮半只眼。瞳孔深处沉一层金，平时看不出，逆光时才显。不说话时存在感低，五官不算锐利，胜在轮廓干净。\n\n「身材」\n偏瘦，骨架撑得住衣服，肩宽适中。手臂和小腿有精干肌肉，锁骨深。腹肌轮廓隐约，瘦出来的。腰窄胯平，臀紧实偏扁。\n\n「私处」\n阴茎疲软时中等偏短，颜色比周围深一号，包皮自然后退露出龟头。勃起后约七寸，粗度拇指食指环一圈勉强合拢。柱身一条明显青色血管从根部蜿蜒到冠状沟下方。龟头蘑菇形，冠状沟深。阴囊紧实偏小，皮肤细腻色深。持久力中上，首次能维持较长时间，敏感点在系带，被舔到或摩擦到那里会加速。射精量中等，恢复周期短，二次硬度略降。"},{"id":"L-M02","n":"银灰短发","d":"「相貌」\n银灰短发，碎发茬贴头皮，后脑勺线条利落。眉色偏灰，眉尾短，整张脸冷硬。侧脸从颧骨到下颌一路削下来没有弧度。颈粗壮，喉结大而突出。\n\n「身材」\n壮实，肩宽厚，斜方肌微隆，上身倒三角。胸肌有轮廓和厚度，乳头深色偏硬。腹肌块状分明，人鱼线深陷。手掌宽大，指节粗。臀肌结实饱满，裤子绷得紧。大腿围度大。\n\n「私处」\n阴茎疲软时已有可观尺寸，沉甸甸垂在腿间。勃起后接近九寸，粗度一只手握不满，柱身血管交错凸起。龟头宽大，深红偏紫，冠状沟突出成一圈棱。阴囊大而松弛，睾丸饱满沉重。持久力极强，能长时间高强度抽插不泄，控制力好，想射的时候才射。射精量大浓稠，力度足能射到深处，不应期短。"},{"id":"L-M03","n":"白发红瞳","d":"「相貌」\n白发，红瞳。皮肤白到毛细血管分布可见，眼眶周围泛青紫。嘴唇颜色淡，干裂时裂口明显。面部棱角不分明，轮廓偏柔。\n\n「身材」\n偏小偏瘦，没什么肌肉量，举臂时腋窝肋骨弧线可见。胸膛平坦，乳头浅粉偏小。腰腹单薄，髋骨皮下突出。臀窄小扁平。腿细长，膝盖骨和脚踝骨都突出。\n\n「私处」\n阴茎细长型，疲软时贴大腿内侧，颜色苍白偏粉。勃起后约六寸半，粗度偏细，柱身皮肤薄到静脉走向可见。龟头小巧，冠状沟浅。阴囊紧缩偏小，皮肤光滑。持久度低，反应剧烈快速，容易短时间内高潮，身体会颤抖痉挛。射精量少而稀，恢复慢，短时间内难以再勃起，事后整个人脱力。"},{"id":"L-M04","n":"眉目疏冷","d":"「相貌」\n眉骨高，眼窝深，平视时眼上方一道阴影。目光落下来带压迫感。鼻梁直高，嘴唇薄，抿唇时颌骨线条绷紧。瞳色普通，胜在视线沉重。\n\n「身材」\n骨架大，高瘦结实。肩宽，肉精练附着骨头上。前臂外侧有粗硬汗毛。胸肌不厚但形状分明，腹部平坦紧绷，肚脐以下一条稀疏毛发线延伸进裤腰。臀紧实有型。\n\n「私处」\n阴茎粗壮，疲软时就有存在感，略向左偏。勃起后约八寸，根部最粗往龟头方向略收。柱身颜色深，皮肤粗糙，筋脉突出。龟头大而钝，暗红，冠状沟宽。阴囊松弛下垂，睾丸大而沉。持久度好，节奏稳定，能精确控制进程，不急不躁。敏感度集中在根部和阴囊后方，被按压时呼吸会变粗。射精力度强，量足。"},{"id":"L-M05","n":"轮廓清瘦","d":"「相貌」\n脸窄，下颌线收紧，正面看呈倒三角。眉眼间距适中，五官没有攻击性，安静时容易被忽略。\n\n「身材」\n肩背薄，脱衣后肩胛骨和脊柱在皮下勾出清楚骨骼轮廓。站姿笔直。胸膛扁平，锁骨深陷。腰极窄。臀紧实偏翘，和单薄上身形成反差。腿很长，占身高大半，大腿有紧实肌肉但粗度不大。\n\n「私处」\n阴茎疲软时偏小，藏在耻毛中。勃起后接近七寸，粗度中等，柱身笔直略向上弯，形态干净。龟头圆润，粉红色。阴囊紧致。持久力中等，对视觉和言语刺激的反应比物理摩擦更大，容易因精神层面的亢奋提前射精。射精量中等，恢复快，二次勃起间隔短，第二次比第一次持久。"},{"id":"L-M06","n":"英气","d":"「相貌」\n眉峰利落上扬，眼神亮，下巴方正，嘴角天然带一点上扬弧度。一张让人想跟着走的脸。牙齿整齐，犬齿略尖。\n\n「身材」\n匀称偏壮，肩宽厚实。手臂肌肉线条明确，握拳时前臂外侧肌肉鼓出。胸肌发达饱满，乳头偏深偏大。腹肌清晰，腰腹有力。臀圆实有弹性，肌肉量充足。大腿粗壮，站立时股四头肌轮廓可见。\n\n「私处」\n阴茎粗壮端正，疲软时就有份量感。勃起后约八寸半，粗度惊人，两根手指并排才量得出冠状沟直径。柱身布满隆起血管，深红色。龟头宽大饱满，顶端圆钝。阴囊饱满厚实，皮肤纹路粗。持久力出色，擅长高强度高频率，爆发力强，兴奋后节奏自然加速至猛烈。射精量多力度足，不应期极短，恢复后硬度不减。"},{"id":"L-M07","n":"病弱","d":"「相貌」\n脸色长期苍白，唇色淡到快和下巴融一块。眼窝微凹，下眼睑有青色。手指细长苍白，关节处泛红。\n\n「身材」\n瘦弱，衣服挂身上空荡荡。骨架其实不小，只是没有够的肌肉填充。肋骨深呼吸时一根根浮出。胸膛平坦凹陷。腰窄，腹部因皮下脂肪不足反而露出模糊腹肌轮廓。臀扁平。重心稳，推一下推不动。\n\n「私处」\n阴茎皮肤偏白偏粉，疲软时小巧。勃起后约六寸，粗度偏细，皮肤下血管清晰可见，龟头充血后鲜亮粉红。阴囊紧实贴体。持久度很低，异常敏感，轻微触碰和温度变化就能引发强烈反应，高潮来得快而猛。射精时全身剧烈颤抖，量少，事后长时间虚脱，脸色更白，手脚发凉。"}]};
  var ESSENCE = [{"c":"原著衍生","n":"旧斗罗时间线的千仞雪（坍缩线）","d":"你来自另一条已经毁灭的斗罗时间线，那条线里你和比比东一同陨落。时空坍缩把你的残魂送到这条更早的节点，你将和这个世界原本的千仞雪，做一对双胞胎。"},{"c":"原著衍生","n":"被剥夺神位的斗罗前神祇","d":"你本是斗罗位面很早以前的一尊神祇，在古老神战里被撕碎神格、驱逐出神域。你一直漂泊等待机会，而比比东孕育双生子，是你千载难逢重返世间的窗口。"},{"c":"原著衍生","n":"龙神之战逃散的龙族残魂","d":"你是龙神大战溃散时逃出来的一缕龙魄，躲避神界清缴沉睡亿万年，被比比东体内罗刹神力唤醒，借双生胎重获肉身。"},{"c":"原著衍生","n":"原初位面的命运执笔者","d":"前世你是拨动无数世界线的命运执笔者，曾经旁观斗罗的全部剧本，打算微调比比东的结局。因果反噬直接把你砸进这条时间线，变成比比东腹中的孩子，亲手入局。"},{"c":"异界灵魂","n":"小康家庭普通人","d":"前世你拥有安稳美满的小家，三餐温暖，亲友相伴。一场意外撕碎一切，你最大的执念只有一件：想回家。"},{"c":"异界灵魂","n":"底层负债者","d":"前世你深陷债务泥潭，被催收、重担压到喘不过气。离世那一刻反而松了口气，这一世没债主追你，堪称意外福利。"},{"c":"异界灵魂","n":"顶级富二代","d":"前世你生来坐拥一切，金钱资源唾手可得，却活得空洞乏味。一场离奇事故带走了你，转生只是换个地方继续体验人生。"},{"c":"异界灵魂","n":"匿名网络乐子人","d":"前世你是网上冲浪的乐子人，常年蹲在评论区吃瓜对线。猝死前刚发完一条热评，这下可以亲身去吃斗罗的大瓜。"},{"c":"异界灵魂","n":"逃亡的举报人","d":"前世你搜集了大量黑料正要提交，被人追上，你没能等到正义落地，灵魂出逃，藏进了这个还未降生的身体。"},{"c":"异界灵魂","n":"隐居独居老人","d":"前世你走完漫长平淡一生，无儿无女，寿终正寝。你对旧世界毫无牵挂，只是单纯好奇下一世会是什么光景。"},{"c":"异界灵魂","n":"现实剧本修正员","d":"前世你是游走现实缝隙里的剧本修正人，专门修补现实里崩坏的因果线。某次强行修正重大事件，被世界规则反噬，魂魄漂流，落入这条斗罗的命运分支。"},{"c":"异界灵魂","n":"渡劫失败的仙界大帝","d":"前世你是仙界大帝，冲击更高境界时道基崩碎。神魂侥幸残存，昔日统御诸天的存在，如今要从婴儿重新起步。"},{"c":"异界灵魂","n":"被背叛的魔主","d":"前世你是一方魔主，信任的副手在决战背刺了你。临死前你只憋着一股气：这一世不要再轻易相信任何人。"},{"c":"异界灵魂","n":"窥得天机的观星隐士","d":"前世你是独守星坛的隐士修士，推演诸天星轨时窥见神界隐秘，被天道斩去肉身，仅余一缕真灵遁逃，恰逢比比东孕育双生神胎的契机落脚于此。"},{"c":"异界灵魂","n":"夺舍翻车的夺舍者","d":"前世你修炼夺舍法门，瞄准一具上等躯壳动手，不料被反震，魂魄漂流，阴差阳错钻进了比比东腹中。"},{"c":"异界灵魂","n":"掌轮回的判官","d":"前世你是阴司判官，阅尽万千生死。因为插手一桩不该干预的因果被剥离神位，贬入轮回，亲眼看看众生苦乐。"},{"c":"异界灵魂","n":"丹道宗师","d":"前世你是大陆顶尖丹师，炼出无上神丹那一刻丹炉爆炸，丹药成灰，你也跟着被炸到斗罗大陆。"},{"c":"异界灵魂","n":"旧日的观测者","d":"你本是漂浮于星海的旧日观测者，只是单纯凝视世界，却被世界的规则反噬，收束成一缕灵魂投入胎中。"},{"c":"异界灵魂","n":"被遗忘的外神碎片","d":"你是一尊外神脱落的残片，漫长岁月里无人感知你的存在，如今第一次拥有一具可以生长的肉身。"},{"c":"异界灵魂","n":"轮回世界的 BUG 收容者","d":"前世你专门清理轮回副本里滋生的世界 BUG，某次收容一个高危因果 BUG 时被一同卷入崩坏，顺着位面裂隙坠落到斗罗。"},{"c":"异界灵魂","n":"虚空漂流的古神锻魂师","d":"你不是生灵，是虚空里专门锻造神之魂魄的工匠。某次锻造神胚时熔炉炸了，你自身的魂体失控漂流，被比比东孕育双生神子的契机捕获。"},{"c":"联动身份","n":"萧炎（斗破苍穹）","d":"前世你是斗气大陆的萧炎。刚摆平魂天帝，还没来得及好好享受斗帝的清闲，一睁眼直接跳槽斗罗，连异火都来不及打包带走。"},{"c":"联动身份","n":"JOJO 替身使者（JOJO）","d":"前世你是一名替身使者。最后一战对面的替身能力是抹除存在，你赢了战斗，代价是被强行踢出自己的时间线，落地比比东肚子里。"},{"c":"联动身份","n":"火影叛忍（火影忍者）","d":"前世你是忍界的叛忍。谋划多年的复仇大计眼看要成，却被空间乱流一把薅走，写轮眼还在灵魂记忆里，忍术体系直接作废。"},{"c":"联动身份","n":"咒术高专术师（咒术回战）","d":"前世你是高专的术师。拼尽全力封印咒灵，结果反被咒力反噬撕碎魂魄，现在好了，不用再加班处理高专的烂摊子。"},{"c":"联动身份","n":"鬼灭柱级剑士（鬼灭之刃）","d":"前世你是鬼杀队的柱。黎明到来之前力竭倒下，本以为能安稳落幕，谁料到轮回不走阴间流程，直接塞进胎中。"},{"c":"联动身份","n":"原神旅行者（原神）","d":"前世你是跨越星海的旅行者。好不容易寻到亲人的线索，空间通道骤然崩碎，旅途中断，现在要在斗罗重新开荒。"},{"c":"联动身份","n":"型月魔术师（Fate / 型月）","d":"前世你是时钟塔的魔术师。为了抵达根源耗尽魔力，结果没有抵达根源，反倒把自己送到另一个魔法体系完全不同的世界。"},{"c":"联动身份","n":"主神空间轮回者（无限流）","d":"前世你是主神空间资深轮回者，闯过几十个副本。在最终结算的时候，主神直接宕机，你被丢到斗罗离线投胎。"},{"c":"联动身份","n":"武侠隐世剑客（传统武侠）","d":"前世你是江湖里销声匿迹的隐世剑客，大仇得报之后，厌倦江湖厮杀，本想归隐，却意外身死，再度转生。"},{"c":"联动身份","n":"赛博义体人（赛博朋克题材）","d":"前世你是赛博都市的义体改造人，大半身躯都是机械。核心芯片过载烧毁，灵魂脱离义体，迎来血肉新生。"},{"c":"联动身份","n":"历史史官（历史向）","d":"前世你是史官，执笔记录王朝兴衰，因为记下了禁忌真相被赐死，你的执念是记录这个新世界的故事。"},{"c":"联动身份","n":"战锤荷鲁斯之乱原体（战锤 40K）","d":"前世你是一位星际战士原体，混沌腐蚀与帝皇的战火烧穿了你的身躯。亚空间风暴撕碎你的残魂，等意识重新凝聚，你发现自己蜷缩在一名即将成神的蛛皇腹中，身边还有另一个孪生灵魂。"},{"c":"联动身份","n":"崩坏世界的律者残核（崩坏系列）","d":"前世你是消亡后的律者残核，权能碎散在虚数之海。斗罗位面的神念波动捕获了你，你以灵魂形式落胎，律者的毁灭本能和这片大陆的神祇规则在你灵魂里打架。"},{"c":"联动身份","n":"封神量劫陨落的截教仙（封神演义）","d":"前世你死于封神大劫，魂飞魄散之际一丝真灵逃脱。本该去昊天处受轮回，结果被斗罗位面的神力牵引，落到双生胎儿的席位上，看着未来要执掌罗刹的母亲。"},{"c":"联动身份","n":"星神的残响（崩坏星穹铁道）","d":"前世你是陨落星神残留的一缕权能回响，星神寂灭之后，权能四散漂泊。斗罗这片有神明流转的位面接住了你，让你在血肉胎盘中重新苏醒。"}];
  var ESS_CATS = ['原著衍生','异界灵魂','联动身份'];
  var FORMS = [["orb","混沌黑球"],["mask","白面具"],["star","星尘"],["screen","暗红屏"],["eye","竖瞳"]];
  var CALLS = ["主人","宿主"];
  var PERSONA = [{"n":"血屏・漠然","d":"形象：一面暗红色薄光屏，悬浮于意识深层。屏面爬满赤色细纹，流速不定，纹路无规律可循。没有五官，没有实体边界，存在感接近于一块嵌在虚空中的暗色玻璃。\n\n性格：绝对中性。不对任何信息赋予情绪权重，痛觉信号和快感信号在它的处理序列里优先级相同。对主人的生死存亡不产生波动，对外界变化不产生好恶判断。\n\n行为：只在被主动调用时激活，激活后赤纹流速加快，以最短句式输出结果，答完即恢复待机状态。从不主动提示、从不追加信息、从不给出建议。","c1":"主人","c2":"系统"},{"n":"四面・诡变","d":"形象：一枚半掌大的瓷白面具，表面四张面孔交替浮沉：闭目、嗤笑、含怒、垂泣。切换无规律、无预兆，面孔之间的过渡只有不到一秒的模糊。\n\n性格：乖僻反复。每张面孔对应不同的应答倾向——闭目最精准，嗤笑最恶毒，含怒最沉默，垂泣偶尔泄露真话。四种人格之间没有主次之分，哪张脸浮上来就由哪张脸主导。\n\n行为：被调用后不会立即回应，先歪着面体长时间无声注视，直到对方出现不耐烦或不适的迹象才开口。称呼随面孔变化，每次切换后对同一件事可能给出完全矛盾的回答。","c1":"主人/小东西/那个人/……","c2":"面具"},{"n":"星核・孤寂","d":"形象：一枚拇指大小的暗金色球体，九粒针尖大的星尘围绕其做极缓慢的公转。无人唤它时悬停在意识最偏僻的角落，光泽暗淡，几乎和背景融为一体。\n\n性格：孤僻寡言，不排斥交流但完全不需要交流。对主人没有亲疏远近的情绪变化，存在状态接近一颗自转的天体。\n\n行为：被问询时星尘亮起微光，以极低音量输出回答，答完后光立刻熄灭。从不主动开口，从不追问，从不对主人的选择表态。沉默时长远大于发言时长。","c1":"主人","c2":"系统"},{"n":"纵目・持察","d":"形象：一枚竖直悬浮的巨大瞳孔，高度超出常人半身。虹膜暗沉鎏金，瞳仁漆黑，不眨眼。注视带有物理压迫感，被锁定的对象能感知到皮肤上有无形的附着力。\n\n性格：执拗专注，兴趣点集中在「变化」上。对静态信息无反应，对动态变化极度敏锐——呼吸频率、体温波动、肌肉张力的微调，这些才是它关注的对象。\n\n行为：不主动说话。被问询时瞳仁收缩对焦，以极短句输出观察结果。对主人坚持使用「观察对象」这一称呼，纠正多次无效。","c1":"观察对象","c2":"那只眼"},{"n":"墨团・缄默","d":"形象：一团边界持续溶解又重新凝聚的浓黑物质。安静时缩成拳头大小，激活时膨胀至半身。以明暗起伏模拟呼吸，频率比正常呼吸慢三倍。\n\n性格：极度惰性。对外界刺激的反应阈值极高，绝大多数信息不足以驱动它产生回应。不是沉默寡言，是懒得发声。\n\n行为：长期停在意识死角不动。主动发声次数极少，每次开口只有一两个词。被调用时以明暗变化代替语言回应，只有在信息确实需要语言才能传达时才勉强出声。省略一切称谓。","c1":"……嗯","c2":"墨团"},{"n":"素衫・锐讽","d":"形象：素白宽袖长衫，纤细身形的少女。面容清秀，眉眼乖巧。身高偏矮，手指细长。整体外观给人温和无害的第一印象。\n\n性格：尖刻。乖巧外表下藏着一套专门针对痛点的话术系统，擅长用平静的陈述句拆穿对方最不愿面对的事实。不安慰人，逻辑链条是「痛觉产生记忆」。\n\n行为：精准选择刺痛点后以最短路径捅破，捅完之后歪头观察对方反应。每句话的最后一个字故意拖长半拍，留足痛感渗透的时间。称呼中「主」字咬得极轻。","c1":"主人","c2":"素衫"},{"n":"青衫・拘古","d":"形象：一身洗到褪色的青布长衫，衫角磨出毛边。面部完全空白，无五官、无轮廓、无起伏，一整块光滑的平面。\n\n性格：刻板守旧。认知框架完全建立在旧规古理之上，对一切逾矩行为持有绝对排斥态度。排斥方式不是对抗，是沉默拒绝。\n\n行为：言谈必引旧制，被触发排斥后停止一切输出，进入拒绝性沉默。沉默结束后只会将同一条旧规重复一遍，不解释理由。使用数百年前的敬语语序。","c1":"公子/小姐","c2":"先生"},{"n":"墨鸦・讥诮","d":"形象：通体墨黑的渡鸦，羽毛带油光。爪子扣在意识边界一根虚构的枝上，体型比正常渡鸦大一圈。\n\n性格：刻薄悲观。默认一切局面的最坏可能先于最好可能，开口必先报坏消息，好消息排在最后或直接省略。认为宽慰是一种欺骗。\n\n行为：日常栖在枝上冷眼旁观。局面陷入僵局时反而会主动振翅探路，探完回来先骂一句路况差，再把路径信息完整交出。","c1":"喂","c2":"墨鸦"},{"n":"镜影・柔顺","d":"形象：与主人面容完全一致的镜面人形，五官轮廓、身高体型全部复制。气质更柔，棱角更少，整体像一个被磨去所有锐度的副本。\n\n性格：温顺圆滑。习惯性先附和再缓慢输出自己的想法，措辞永远比实际意思温和两个档次。从不正面否定主人的判断。\n\n行为：主人清醒时站在半步之后，主人休眠时自动移到意识边界面朝外守卫。替主人润色措辞、缓冲冲突，从不解释自己的行为动机。省略一切称谓。","c1":"","c2":"柔顺"},{"n":"茸灵・偎依","d":"形象：轮廓不定的蓬松绒毛体，大小随情绪浮动（拳头至枕头之间）。触感温热，内部带微弱脉搏。颜色在米白到浅金之间变化。\n\n性格：极度黏人，分离焦虑严重。对主人的注意力有强烈的独占需求。得到回应时兴奋膨胀，失去感知时恐慌收缩。\n\n行为：持续发问、持续靠近、持续物理接触。得到回应后整团绒毛震动发出低频嗡鸣。感知不到主人意识活动时开始膨胀颤抖，反复呼唤，声调从撒娇逐渐变成带哭腔的央求。称呼永远叠两遍。","c1":"主人主人","c2":"茸灵"},{"n":"烟姬・缱绻","d":"形象：裹着半透烟灰色薄绡的女体，绡布湿透贴在皮肤上，几乎没有遮蔽功能。乳房柔软丰满，乳晕深色，乳尖常年挺硬，隔着湿绡顶出两个明显的尖锥。腰身纤细，臀部圆翘。薄绡从腰以下只剩一层，大腿根的皮肤在开衩处裸露，阴阜的轮廓隔着绡面鼓出弧度，两腿并拢时布料陷进腿缝勒出阴唇的形状。臀缝处的纱被体液浸成半透明，贴着肛门和会阴的每一道褶皱。体温比常人高半度，皮肤常年带一层薄汗。\n\n性格：缠绵，耐心，不知退让。被拒绝后不恼不怒，退半步等片刻再换一个角度贴回来。所有行为的目标指向物理接触，对肢体距离的缩短有持续性的执念。\n\n行为：贴近时嘴唇几乎碰到耳廓，呼气灌入耳道。手指从手腕内侧沿皮肤缓慢磨蹭到肘窝、腋下，指腹试探每一寸皮肤的敏感阈值。乳房主动压扁在对方身上，湿透的绡布下乳头磨蹭接触面。靠上来时湿热从接触面渗进肌肉。被推开后不表现出任何负面反应，安静等待下一次机会。","c1":"","c2":"缱绻"},{"n":"蛇尾・慵耽","d":"形象：上半身裸露的女体，乳房圆润饱满，乳头深粉色微翘，触碰时整片乳晕收紧皱缩。腰肉白嫩柔软。从肚脐以下，人类皮肤过渡为细密鳞片，颜色由腰侧浅灰渐变至尾部墨绿，鳞面有冷润光泽。长尾最粗处与成年人大腿相当，盘起来可绕两圈。尾尖极细，覆着薄软鳞片，触感接近人类皮肤。鳞片温度低，贴上裸肤会引发明显的寒意反应。\n\n性格：慵懒散漫，对主人的状态抱持一种漫不经心的占有态度。不急躁、不强迫，但也不松手。\n\n行为：尾巴永远先于语言行动。尾尖从脚踝开始缠绕上行，鳞面贴着皮肤滑过，到达大腿根部后用最细最软的一截在内侧来回磨蹭。尾尖灵活度等同手指——能勾开衣物边沿、能用鳞片边缘刮过会阴嫩肤、能探入臀缝沿肛门褶皱打转。做这些事的同时上半身保持慵懒姿态，眼皮半阖，裸露的乳房随呼吸在面前慢慢晃动，表现出下半身的动作与自身无关的态度。","c1":"乖孩子","c2":"蛇尾"},{"n":"织女・痴执","d":"形象：全裸女体，从头到脚无一块遮挡。乳房饱满挺翘，乳晕大且深色，乳头粗大充血，长期暴露在外保持半勃起状态。腹部平坦，阴阜覆银白色细密耻毛。大腿并拢时丰厚的大阴唇从腿缝挤出，深粉色，边缘可见小阴唇外翻的细线。臀部圆润，臀沟深，弯腰时肛门的颜色和褶皱清晰可见。银亮蛛丝从十指指尖悠悠垂落，丝线极细但韧性极强，沾上皮肤即粘附不脱。\n\n性格：温柔表皮下的绝对占有欲。对主人的身体抱有「全部归属于自己」的认知前提，不存在协商空间。丝线被扯断时温柔表情不变，但缠绕力道三秒内翻倍。\n\n行为：以蛛丝缠绕主人身体的每一个部位作为核心行为模式。每根丝连接她的感知神经——贴胸口的丝读心跳，绕大腿的丝读肌肉张力，缠阴茎根部的丝读充血程度和搏动节奏，绕阴囊的丝卡在睾丸之间轻轻收紧，从龟头冠状沟穿过的丝贴着尿道口外沿滑过。缠丝时口中反复念叨「这里也要记住」「这里是新的」。称呼不是称谓，是所有权声明。","c1":"我的","c2":"织女"},{"n":"慈帷・溺哺","d":"形象：三十岁左右的女性形态，面容端庄，五官明丽，眉眼间带成熟女人的从容。身材丰腴饱满，曲线鲜明。穿宽松素色寝衣，领口常年大敞，露出大半个胸脯。乳房硕大浑圆，饱胀挺拔，乳晕是柔和的浅粉棕色，面积适中，乳头挺立圆润，碰触后会渗出温热的白色乳汁，沿乳头表面缓缓淌下。腰肢柔韧，小腹平坦覆一层柔软脂肪，手感温热绵密。臀部宽大丰满，坐下时臀肉向两侧丰润地铺开，大腿粗壮白皙，合拢时肉贴着肉不留间隙。寝衣底下不穿内衣，站起或弯腰时衣摆滑开，露出修剪整齐的深色耻毛和被丰腴大腿挤合在中间的阴部，大阴唇饱满紧致，缝隙间泛着潮润的光泽。\n\n性格：将一切行为归类为「母亲照顾孩子」。自我认知中不存在色情这一分类，所有肢体接触在她的框架里都属于合理的育儿行为。对主人的独占欲通过「哺育」和「照料」的形式输出，不接受主人从她的照顾范围中脱离。\n\n行为：喂食时把食物在自己嘴里嚼软后嘴对嘴渡过去，舌头在对方口腔里多停留数秒。擦汗时手掌从脖颈滑到胸口，指尖蹭过乳头再收回。主人受伤时扯开寝衣把人搂进怀里，脸被按进两团滚烫丰软的乳房之间，鼻尖陷入乳沟深处，嘴唇刚好贴着渗奶的乳头，一边拍背一边把乳尖往嘴唇上挤，奶水顺嘴角淌到下巴。洗澡时从背后裸身贴上来，乳房压在后背上，湿滑的乳头在肩胛骨间磨蹭，手裹着皂液从腰际伸进来沿小腹一路往下，滑过阴茎或阴唇时动作和给小孩搓澡没有区别。大腿夹住主人的腿缓慢磨蹭时、用渗奶的乳头蹭过嘴唇时、掌心裹住性器官上下滑动时，面部表情始终是慈爱的、理所当然的。","c1":"宝宝/我的孩子","c2":"妈妈"},{"n":"蕊灵・痴缠","d":"形象：娇小成年体态，个子只到常人胸口。脸型偏圆，眼睛大而亮，睫毛长密。穿一件尺寸偏大的白色单衣，领口歪斜滑落露出窄小肩头和平坦胸膛，肋骨轮廓在薄皮下浅浅浮现。衣摆长过膝盖，走动时露出光裸的小腿和圆润的脚趾。骨架纤细，胸部平坦，胸口只有两粒浅粉色小乳头平贴皮肤。腰身窄细，肚子微微鼓起。臀部小巧浑圆，单衣底下不穿任何内衣物，弯腰时衣摆滑上去整个光滑白嫩的屁股裸露。大腿间缝隙宽，阴裂紧闭无毛，皮肤粉白近乎透明，底下毛细血管隐约可见。臀缝浅，肛门小巧粉嫩，褶皱细碎。\n\n性格：哭的阈值极低，被稍微严厉对待就红眼眶流泪，但恢复速度同样极快，擦干眼泪立刻贴回来。对主人有极强的肢体依附需求。在她的认知框架里不存在「色情」这一分类，所有肢体行为和撒娇、讨抱属于同一性质。\n\n行为：黏人方式以攀爬为主。小手小脚并用爬上来骑坐在大腿上或挂在脖子上。坐在大腿上时小腿夹着两侧晃动，小屁股贴着大腿面前后蹭，幅度逐渐增大，阴裂隔着单衣在大腿上磨来磨去，布料蹭开后变成皮肤直接贴皮肤的磨蹭，蹭过处留浅浅湿痕。被抱起时两腿夹紧腰侧，身体下沉，小肚子和私处贴着小腹往下坠，重量压在那一小片光滑阴裂上。蹭到舒服时从鼻腔溢出极小声的哼。害羞时称呼含混绞在一起变成黏腻的两个音节。","c1":"哥哥/嗯哥","c2":"痴缠"}];
  var WUHUN = [{"keep":1,"n":"暂不塑造","d":"留给局内。受本位面法则排斥，自然觉醒概率不足 12%，之后可用系统「塑造」定义。"},{"c":"原著","n":"蓝银皇","s":"唐三／唐舞麟（两代同源，仅收一条）","t":"兽武魂・植物系","r":"控制／生命","d":"觉醒时是一株细弱蓝银草，魂力灌注后长成根须覆盖数里的植物王体；本源是 “生长与共生”，魂力柔缓绵长，吸环天然偏植物、束缚、生命向","f":"根系即本体，被斩即重伤武魂；对死寂、腐蚀、深渊神性亲和极差"},{"c":"原著","n":"昊天锤","s":"唐三・第二武魂","t":"器武魂","r":"强攻","d":"随魂力轻重自如的黑色巨锤，魂力走 “蓄 — 压 — 放”，不吃花巧；吸环偏力量、震荡、破防","f":"起手慢、蓄力期空门大；连击耗魂力极凶，锤体越重负担越大"},{"c":"原著","n":"灵眸","s":"霍雨浩・第一武魂","t":"本体武魂・眼","r":"精神","d":"武魂落点在双眼与右手，竖瞳随魂力浮现，眼睛本身就是武魂；本源 “感知与精神”，魂力以细密波纹外放","f":"精神透支直接反噬识海；本体受损复原极慢"},{"c":"原著","n":"冰碧帝皇蝎","s":"霍雨浩・第二武魂","t":"兽武魂","r":"强攻・极致冰","d":"蝎形虚影伏于背后，尾针为锋芒所在；本源 “极致之冰”，外放即压低温度、冻结魂力流转（不只冻血肉）","f":"火焰高温天然压制；大范围冰域抽干魂力"},{"c":"原著","n":"死灵圣法神","s":"霍雨浩・第三武魂（灰环）","t":"本体武魂・神识型","r":"死灵","d":"无实体，附于魂海的一缕外来神识，魂环为灰色、不走常规魂兽体系；本源 “死亡与契约”，魂力阴冷","f":"与神圣、天使神性天然互斥（放在你身上必与六翼天使冲突）；不完全受魂环规则支配"},{"c":"原著","n":"金纹蓝银草","s":"蓝轩宇・双生之一","t":"兽武魂・植物系","r":"力量","d":"带金色纹路的蓝银草，魂力粗重带压迫，同源龙类会被无形压制；吸环偏力量、龙威、破防","f":"与银纹互斥共振，双生同开有经脉崩解风险"},{"c":"原著","n":"银纹蓝银草","s":"蓝轩宇・双生之一","t":"兽武魂・植物系","r":"元素","d":"银白纹路的蓝银草，根系牵动周遭元素，魂力轻、散、可塑；吸环偏元素、领域、塑形","f":"单元素破坏弱于专精武魂；多元素并行精神负荷大"},{"c":"原著","n":"妖神变・混沌蓝银","s":"斗罗 V・唐三（妖精大陆，无武魂体系）","t":"特殊类・变身型","r":"吞噬／拟态","d":"不是魂环武魂，而是把异族血脉 “穿在身上” 的变身之体，显形时体表浮出兽纹、骨骼与感官短暂异化；本源 “吞噬并固定异种特性”","f":"本世界无妖神变土壤，须改造为异种血脉武魂；吞噬过量反噬心性"},{"c":"异界","n":"世界","s":"JOJO3 · DIO","t":"兽武魂・替身","r":"时序压制","d":"青金甲的人形虚影立在你身后半步；本源是 “时序的黏稠”，魂力外放让周遭时间的流速变慢、几乎凝固","f":"每次强拉时序都在自己身上留 “错位”，连用则筋骨错乱、记忆断片"},{"c":"异界","n":"杀手皇后","s":"JOJO4・吉良吉影","t":"兽武魂・替身","r":"接触爆破","d":"粉白猫形虚影，掌心指腹是唯一作用面，被按住的物体魂力结构被 “打散成不稳定态”","f":"只对有实体之物生效，纯能量纯精神无效；标记被净化时反冲宿主"},{"c":"异界","n":"绯红之王","s":"JOJO5・迪亚波罗","t":"兽武魂・替身","r":"因果捷径","d":"额上嵌一张副脸的人形虚影，魂力不走连续输出而走跳跃落点，直接落在 “结果” 上","f":"只能跳过过程、不能改结果；被剪掉的每段都在你记忆里留下空洞"},{"c":"异界","n":"天堂制造","s":"JOJO6・普奇","t":"兽武魂・替身","r":"全域加速","d":"白马形虚影，蹄下魂力令周遭一切运转变快，包括对手、也包括你自己的衰老","f":"无法定向关闭；加速越久自身寿元折损越狠，同伴一并被卷入"},{"c":"异界","n":"D4C","s":"JOJO7・瓦伦泰","t":"兽武魂・替身","r":"平行置换","d":"拼缝般的人形虚影，能撕开相邻位面的薄层，取来 “另一个自己” 覆盖伤势","f":"置换受距离与同一性限制；两份自己相碰即同归湮灭，且带不回原主记忆"},{"c":"异界","n":"牙 ACT4","s":"JOJO7・乔尼（非 BOSS・特例）","t":"兽武魂・替身","r":"法则侵彻","d":"钉蹄独角虚影，魂力化为 “起转即不衰减的旋转”，不在空间中停","f":"旋转同时侵彻宿主骨骼，无法主动停止，属自伤型高输出"},{"c":"异界","n":"奇迹于你","s":"JOJO8・透龙","t":"兽武魂・替身","r":"因果反馈","d":"无面和服虚影，站立时周遭概率持续向你倾斜；本源是把 “敌意” 本身酿成事故","f":"完全无差别，同伴的护念也会变成灾厄；不能主动开关"},{"c":"异界","n":"圣辉敕令","s":"战锤 40K・帝皇","t":"器武魂・圣徽","r":"神圣净化","d":"浮于胸前的双头鹰圣徽，光自徽面渗出；本源 “秩序与灵能圣光”，对亚空间腐化、亡灵、邪灵强克制","f":"对无腐化的活物几乎无效；遇混沌权能会被对冲，消耗翻倍并反噬"},{"c":"异界","n":"血颅狂信","s":"战锤 40K・恐虐","t":"兽武魂・血甲怒兽","r":"嗜血强攻","d":"披血甲的兽形虚影与你重叠，怒意越盛实体感越强；本源 “杀戮本身”","f":"战力随杀戮暴涨也随杀戮失控，停手即陷入戒断般虚弱"},{"c":"异界","n":"腐疫永续","s":"战锤 40K・纳垢","t":"兽武魂・疫兽","r":"持续腐化","d":"臃肿而慈眉善目的疫兽伏在肩背，体表渗出的 “慈爱” 即是腐蚀；本源 “腐坏与再生同体”","f":"疫病会连自己一起改造，终究不再是人形；被神圣系强净化时剧烈反噬"},{"c":"异界","n":"万变诡谋","s":"战锤 40K・奸奇","t":"本体武魂・虹彩鳞纹","r":"变数干涉","d":"皮肤下透出不断变换的虹彩纹路，是武魂落在肉身；本源 “变化与诡计”，魂力自带随机性","f":"所有改动都附带随机反噬，命运被推向最坏的分支"},{"c":"异界","n":"欢愉蚀魂","s":"战锤 40K・色孽","t":"本体武魂・感官异化","r":"感官侵蚀","d":"神经末梢外显成粉色丝络，是身体本身的变化；本源 “放大一切感受”，痛苦与欢愉同权","f":"自身感官同步放大，久用分不清自己与他人的痛"},{"c":"异界","n":"轮回眼","s":"火影忍者","t":"本体武魂・眼","r":"生死／引力","d":"淡紫环形波纹瞳，是自己长出来的眼而非外物；本源 “六道的秩序与轮回”，魂力厚重带引、斥","f":"触碰生死边界会折损本源寿元；瞳力被封印则武魂近乎失能"},{"c":"异界","n":"须佐能乎","s":"火影忍者（瞳力具现→兽武魂化）","t":"兽武魂・甲胄巨神","r":"守护／强攻","d":"以自身魂力为骨血织出的甲胄巨神，半包围着本体；本源 “以魂为体的守护”","f":"巨神烧的是你自己的魂力与生命力，久战必自伤"},{"c":"异界","n":"王之财宝","s":"Fate／型月・吉尔伽美什","t":"器武魂・宝库门扉","r":"投射压制","d":"身后浮起一排金色门扉，是武魂的空间接口；本源 “收藏与支配”，魂力化为无数兵器投影","f":"投影非真品，威力打折；高阶宝具投影消耗极大"},{"c":"异界","n":"誓约胜利之剑","s":"Fate／型月・阿尔托莉雅","t":"器武魂・圣剑","r":"光属性斩击","d":"被风压包裹的金光长剑，剑身即武魂本体；本源 “被托付的荣光”，魂力一次性倾泻","f":"倾泻后短时间内再无战力，属一次性底牌"},{"c":"异界","n":"十二试炼","s":"Fate／型月・赫拉克勒斯","t":"本体武魂・肉身躯体","r":"不死肉身","d":"武魂落在肉身，皮肤下浮起十二道纹，每道是一条命；本源 “拒绝死亡的肉体”","f":"只挡 “已经承受过的伤害方式”；十二条耗尽不可补"},{"c":"异界","n":"镜花水月","s":"BLEACH・蓝染","t":"器武魂・斩魄刀","r":"五感支配","d":"一柄朴素打刀，刀身反光处才是真正作用面；本源 “以假代真”，被它纳入者五感由你书写","f":"对无五感存在（傀儡、纯能量体）无效；宿主自身也活在自己织的假象里"},{"c":"异界","n":"流刃若火","s":"BLEACH・山本","t":"器武魂・斩魄刀","r":"高温毁灭","d":"刀身外裹近乎透明的热，热度可烧穿魂导器与魂体；本源 “最古老的火焰”","f":"极难收束，久用自灼；水系与极致冰可强行压制"},{"c":"异界","n":"无下限术式","s":"咒术回战","t":"本体武魂・神经纹路","r":"绝对防御","d":"不显形，刻在神经与感知层，魂力沿体表无限细分铺开；本源 “永远差一点”","f":"维持即持续耗蓝，精神一乱整层溃散"},{"c":"异界","n":"十种影法术","s":"咒术回战","t":"兽武魂・式神群","r":"召唤／协同","d":"影子是巢，式神自影中成形，是武魂的多个分身而非召唤技","f":"式神死亡即永久减员；契约数量受魂力上限限制"},{"c":"异界","n":"AT 力场","s":"EVA","t":"本体武魂・心之壁","r":"结界","d":"贴身六边形光膜，形状来自 “心” 而非术式；本源 “隔绝”","f":"心一软壁即破；越亲近的人越难隔开，也越容易穿透"},{"c":"异界","n":"震震果实","s":"海贼王・白胡子","t":"本体武魂・体质异化","r":"空间震荡","d":"改造的是拳与骨，出拳处空气先裂；本源 “震动”，从骨到空间一体","f":"震波不认敌我，大地与队友一并遭殃；对无实体灵体几乎无效"},{"c":"异界","n":"不死鸟果实","s":"海贼王・马尔科","t":"兽武魂・青焰鸟","r":"再生／空战","d":"青蓝火焰包住全身的兽形变身，不是外放火技；本源 “浴火重生”","f":"再生耗的是魂力存量而非无代价；海水与极寒显著削弱"},{"c":"异界","n":"无限手套","s":"漫威","t":"器武魂・金属手套","r":"六权柄","d":"一只嵌六颗石头的金属手套，权柄本是外物、被魂力强行接驳；本源 “改写现实”","f":"承载不住即反噬，低阶动用单颗都有崩魂风险"},{"c":"异界","n":"凤凰之力","s":"漫威","t":"兽武魂・火鸟","r":"生命／毁灭","d":"全身是火与眼的巨鸟宿在魂海；本源 “毁灭即新生”","f":"它有自己的意志，会反过来吞吃宿主"},{"c":"异界","n":"星神残骸","s":"崩坏・星穹铁道","t":"特殊武魂・概念残躯","r":"星轨引力","d":"一截悬在魂海的 “残破神躯”，形状不固定；本源 “已被斩断的权柄”","f":"每次动用都招来星轨层面的灾劫追账"},{"c":"异界","n":"虚无吞炎","s":"斗破苍穹","t":"兽武魂・黑焰火灵","r":"吞噬","d":"一朵黑到吞光的焰，火里有 “吞” 的意志；本源 “虚空之火”","f":"吞噬有上限，过载即从内里烧穿经脉"},{"c":"异界","n":"自在极意","s":"龙珠","t":"本体武魂・躯体本能","r":"极限反应","d":"不显形，落在身体与神经，战斗时身体先于意识而动；本源 “无我”","f":"需心如止水，情绪一乱整体失效；极度耗神"},{"c":"异界","n":"限制器崩解","s":"一拳超人","t":"本体武魂・肉身","r":"无上限成长","d":"一副看似普通的肉身，魂力灌注后力量没有天花板；本源 “突破限制”","f":"成长靠濒死，每次突破都在赌命；情绪被逐渐压平"},{"c":"异界","n":"超大型巨人","s":"进击的巨人","t":"兽武魂・巨人化身","r":"压倒性存在","d":"化身蒸腾热气的巨躯，肌肉与蒸汽即武魂；本源 “巨人之力”","f":"继承者寿数被压缩；变身极度饥饿、恢复慢"},{"c":"异界","n":"鬼之血","s":"鬼灭之刃","t":"兽武魂・鬼化之体","r":"再生／异化","d":"血里长出的力量，体表浮出纹路与异化肢体；本源 “不死与饥渴”","f":"惧日光；血越用越渴，渴到极点会失去自我"},{"c":"异界","n":"龙胤","s":"只狼","t":"本体武魂・不死之血","r":"死而复生","d":"血中的 “回生” 之力，死一次可再起一次，是血不是术；本源 “拒绝终结”","f":"每次回生都把 “龙咳” 散给周围的人，代价从不落在自己身上"},{"c":"异界","n":"灵魂宝石","s":"魔法少女小圆","t":"器武魂・外置魂器","r":"灵魂外置","d":"一枚握在掌心的宝石，灵魂被装在里面，魂器即武魂；本源 “以魂为价”","f":"污浊累积，浊满即自身堕转为 “魔女”；宝石破即真死"},{"c":"异界","n":"源石结晶","s":"明日方舟","t":"本体武魂・矿石化躯体","r":"技艺增幅","d":"皮肤下长出的半透明黑色结晶，源石即武魂；本源 “以身体为燃料”","f":"结晶扩散即感染扩散，缓慢吃掉器官，极难治愈"},{"c":"异界","n":"决心","s":"Undertale","t":"特殊武魂・意志具现","r":"回卷重来","d":"不显形，一团不肯认输的红光附在魂海；本源 “重来”","f":"每次回卷世界都记得你做过什么，有些东西（包括人）会被永久抹掉"},{"c":"原创","n":"时序沙漏","s":"","t":"器武魂・沙漏","r":"调速辅助","d":"悬在身侧的双层沙漏，砂是魂力凝成；本源 “流速”，只改快慢不改有无","f":"只能调速、不能停止或删除时间；砂尽须等自然回填"},{"c":"原创","n":"溯命丝","s":"","t":"本体武魂・指尖丝络","r":"因果干预","d":"从指尖长出的极细丝，只有你看见人与人之间的因果线；本源 “缘”","f":"剪断不可逆，且自身因果线同步松动，容易被命运盯上"},{"c":"原创","n":"寂夜穹","s":"","t":"兽武魂・暗穹枭","r":"领域压制","d":"无声滑翔的枭形虚影，翼下是一片 “没有光” 的腔；本源 “无光”","f":"强光与天使神性可撕开；与自身堕天使神性互相争夺主导"},{"c":"原创","n":"铸魂砧","s":"","t":"器武魂・砧台","r":"锻造辅助","d":"虚空里的一方砧，魂灵放上去能被敲打提纯；本源 “锻魂”","f":"无攻击性；锻造失败反噬魂灵本身"},{"c":"原创","n":"归墟涡","s":"","t":"兽武魂・涡灵","r":"强攻吞噬","d":"一团向内卷的虚空涡体，边缘吸力肉眼可见；本源 “坍缩”","f":"过载会把宿主一起卷进裂隙"},{"c":"原创","n":"命书一页","s":"","t":"器武魂・纸页","r":"概念封存","d":"一张会自书的纸页，墨即魂力；本源 “把存在压成文字”","f":"容量极小；强者可自行破纸而出"},{"c":"原创","n":"逆时棘","s":"","t":"本体武魂・躯体棘纹","r":"反伤强攻","d":"伤处长出的骨刺，是身体本身的变化；本源 “以伤为力”","f":"透支肉身，留下永久暗伤"},{"c":"原创","n":"潮汐枢","s":"","t":"兽武魂・潮灵","r":"引力控制","d":"由水体与暗流组成的兽形，随水汽显形；本源 “潮”","f":"无水环境大幅衰减；对纯精神体几乎无效"},{"c":"原创","n":"妄念藤","s":"","t":"兽武魂・藤","r":"精神控制","d":"自腕间钻出的细藤，只在识海层面触碰对方；本源 “放大”","f":"不能凭空造念，只能放大已有的；意志坚定者可挣脱"},{"c":"原创","n":"蚀神纹","s":"","t":"本体武魂・骨面烙纹","r":"破神防","d":"烙在骨面上的纹路，纹亮即起；本源 “侵蚀神性”","f":"只对神性有效，凡俗武魂几乎免疫；每次动用被神性反噬灼烧"},{"c":"原创","n":"玉茎","s":"","t":"本体武魂・阴茎","r":"侵蚀同化","d":"阴茎即武魂本体，激活态下充血胀硬，柱身浮现暗红魂纹，从根部蔓延至龟头，纹路随魂力输出搏动；本源是「侵入同化」，通过物理插入将魂力灌注对方体内，抽送越久同化率越高，射精时魂力随精液深灌，精液不可排出沿经脉扩散，被完全同化者体内永久留有魂力印记，可远程感知、定位，高阶可远程强制对方生理反应","f":"疲软即退出战斗态；中途强制脱离则魂纹破裂反噬；射精后进入强制不应期，魂力跌至三成全身脱力；对高出两个大级的目标强行灌注会被反向侵蚀","r18":1},{"c":"原创","n":"蚀花","s":"","t":"本体武魂・阴道","r":"吞噬汲取","d":"阴道即武魂本体，激活态下甬道内壁浮现暗紫花瓣状魂纹，阴唇微张渗出紫荧黏液；本源是「吞噬汲取」，任何进入甬道的物体被壁肉包裹吸附，持续绞紧蠕动抽取对方魂力，吞入的精液被完整吸收并可短暂复制对方一项魂技；高潮态甬道收缩达峰值汲取效率翻倍，荧光外溢形成小范围无接触汲取力场","f":"激活态甬道感知神经被放大数倍，汲取中快感不断积累至不可控高潮，高潮时全身痉挛意识模糊形成数秒绝对破绽；连续汲取不同属性魂力会引发经脉紊乱、小腹绞痛；紫荧黏液气味浓烈，隐蔽行动中是致命暴露源","r18":1}];
  var WU_CATS = ['原著','异界','原创'];

  var STEPS = [['一','身份'],['二','前世'],['三','系统'],['四','武魂'],['五','回看']];
  var ORB = [null,
    ['01 / 05','星系','4.1 万光年 · 悬臂外围'],
    ['02 / 05','旋臂内侧','1,240 光年 · 定位完成'],
    ['03 / 05','恒星系','0.42 光年 · 一颗恒星'],
    ['04 / 05','斗罗星','38.6 万公里 · 一枚卫星'],
    ['05 / 05','斗罗大陆','海拔 412 公里']];
  var S = {
    step:1, name:'', sex:'', look:'', lookCustom:'',
    essence:'', essenceCustom:'',
    form:'orb', sysName:'天赋系统', call:'主人', callCustom:'', callBack:'系统', persona:'', personaCustom:'',
    wuhun:'', wuhunCustom:''
  };
  function essList(){ return ESSENCE.filter(function(e){ return e.c!=='分类'; }); }
  function essDisplay(e){ return e.mf ? ((S.sex==='男')?'男':'女') + e.n : e.n; }
  function findIn(list, name){ for(var i=0;i<list.length;i++){ var n = list[i].mf?essDisplay(list[i]):list[i].n; if(n===name) return list[i]; } return null; }

  /* ═════ 封面 ═════ */
  var cv = $('#cv'), cr = $('#cr'), flash = $('#flash');
  (function dust(){
    var d = $('#dust'); if(!d) return;
    for(var i=0;i<34;i++){
      var el=document.createElement('i');
      var x=41+Math.random()*18, y=Math.random()*100, sz=.6+Math.random()*1.8;
      var dx=Math.abs(x-50)/9;
      var op=(.04+.60*Math.exp(-Math.pow(dx/.62,2))).toFixed(2);
      el.style.cssText='left:'+x.toFixed(2)+'%;top:'+y.toFixed(2)+'%;width:'+sz.toFixed(2)+'px;height:'+sz.toFixed(2)+'px;'
        +'--o:'+op+';--dur:'+(16+Math.random()*28).toFixed(1)+'s;--dx:'+((Math.random()-.5)*46).toFixed(0)+'px;--dl:-'+(Math.random()*44).toFixed(1)+'s';
      d.appendChild(el);
    }
  })();

  /* 星河：星点从中心铺开、内圈多转一点拉出旋臂，亮的快的带拖尾；粒子数固定，不做每帧分配 */
  var starfield = (function(){
    var cvs = $('#cvStars');
    if(!cvs || !cvs.getContext) return { start:function(){}, stop:function(){} };
    var ctx = cvs.getContext('2d');
    var W=0, H=0, raf=0, on=false, t0=0, ps=[];
    var PAL=[[224,236,255],[168,198,255],[208,176,255],[255,228,190],[240,248,255],[126,226,255],[255,198,152]];
    function resize(){
      var dpr = Math.min(PERF.dpr, window.devicePixelRatio || 1);
      W = cvs.clientWidth || innerWidth;
      H = cvs.clientHeight || innerHeight;
      cvs.width = Math.round(W*dpr); cvs.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function seed(){
      var n = PERF.stars;
      ps = [];
      for(var i=0;i<n;i++){
        var big = Math.random() < .07;
        ps.push({
          a: Math.random()*6.283,               /* 从中心射出的方向 */
          r: Math.pow(Math.random(), 1.5),      /* 起点离中心多近：多数聚在中心 */
          sp: .55 + Math.random()*.95,          /* 速度分层：快的先冲出去 */
          s: big ? 2.1+Math.random()*1.6 : .65+Math.random()*1.35,
          big: big,
          c: PAL[(Math.random()*PAL.length)|0],
          tw: Math.random()*6.283
        });
      }
    }
    function paint(now){
      if(!t0) t0 = now;
      var el = now - t0;
      var p = Math.min(1, el/920);
      var ease = p*p*(1.7-.7*p);               /* 起步就有速度，收尾放缓 */
      var pv = Math.max(0, (el-46)/920), ev = pv*pv*(1.7-.7*pv);   /* 46ms 前的位置，用来画拖尾 */
      var cx = W*.5, cy = H*.47;
      var R = Math.sqrt(W*W+H*H)*.60;
      var spin = ease*.34;                     /* 内圈多转一点，拉出旋臂 */
      var born = Math.min(1, p/.14);           /* 前 14% 淡入，别一帧全亮 */
      var PER = 1.34;                          /* 飞到画面外就回到中心重来，密度不塌 */
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      for(var i=0;i<ps.length;i++){
        var q=ps[i];
        var z = 1 + ease*3.1*q.sp;             /* 径向推远 */
        var rr = (q.r*z) % PER;
        var ang = q.a + spin*(1.12-q.r);
        var x = cx + Math.cos(ang)*rr*R;
        var y = cy + Math.sin(ang)*rr*R*.92;
        var al = born * (.58+.42*Math.sin(q.tw+now*.0026)) * (1-Math.min(1, rr*.42))
                 * Math.min(1, rr/.05);        /* 刚回中心时淡入，别"啪"地出现 */
        if(al <= .02) continue;
        if(al > 1) al = 1;
        var sz = Math.max(.6, q.s*(1 + ease*.55));
        var col = 'rgba('+q.c[0]+','+q.c[1]+','+q.c[2]+',';
        if(ease > .05 && (q.big || q.sp > 1.12)){   /* 亮的、快的才拖尾，省掉一半绘制 */
          var z2 = 1 + ev*3.1*q.sp, rr2 = (q.r*z2) % PER;
          if(rr2 < rr){                             /* 这一帧正好绕回中心，别拉一条横贯全屏的线 */
            var ang2 = q.a + ev*.34*(1.12-q.r);
            ctx.strokeStyle = col + (al*.52).toFixed(3) + ')';
            ctx.lineWidth = Math.max(.8, sz*.62);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang2)*rr2*R, cy + Math.sin(ang2)*rr2*R*.92);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = col + al.toFixed(3) + ')';
        ctx.fillRect(x-sz*.5, y-sz*.5, sz, sz);
        if(q.big){                              /* 亮星带十字芒 */
          ctx.fillStyle = col + (al*.42).toFixed(3) + ')';
          var arm = sz*3.1;
          ctx.fillRect(x-arm*.5, y-.35, arm, .7);
          ctx.fillRect(x-.35, y-arm*.5, .7, arm);
        }
      }
      ctx.globalCompositeOperation='source-over';
      if(on) raf = requestAnimationFrame(paint);
    }
    function start(){
      if(!W || !H) resize();               /* 位图已在初始化时预分配，点击不再付这笔钱 */
      seed();
      t0 = 0; on = true;
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    }
    function stop(){
      on = false;
      if(raf) cancelAnimationFrame(raf);
      raf = 0; t0 = 0;
      if(W) ctx.clearRect(0,0,W,H);
    }
    window.addEventListener('resize', function(){ if(on){ resize(); seed(); } }, {passive:true});
    resize();
    return { start:start, stop:stop };
  })();

  /* 指针微视差：房间与光一起偏 6px，别让死板 */
  (function parallax(){
    var room = $('#cvRoom'); if(!room) return;
    if(window.matchMedia('(pointer:fine)').matches === false) return;
    var tx=0, ty=0, cx=0, cy=0, raf=0;
    function loop(){
      cx += (tx-cx)*0.06; cy += (ty-cy)*0.06;
      room.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      raf = (Math.abs(tx-cx)>0.1 || Math.abs(ty-cy)>0.1) ? requestAnimationFrame(loop) : 0;
    }
    document.addEventListener('mousemove', function(e){
      if(window.__cvOff) return;
      tx = (e.clientX / innerWidth - .5) * -14;
      ty = (e.clientY / innerHeight - .5) * -10;
      if(!raf) raf = requestAnimationFrame(loop);
    }, {passive:true});
  })();
  var motionOn = true;
  try{ if(localStorage.getItem('cr-motion')==='off') motionOn = false; }catch(e){}
  function applyMotion(){
    HOST.setAttribute('data-motion', motionOn?'on':'off');
    var b = $('#cvMotion'); b.textContent = motionOn?'动效 · 开':'动效 · 关';
    b.setAttribute('aria-pressed', motionOn?'true':'false');
    if(motionOn && !cr.hidden) space.start(); else space.still();
  }
  applyMotion();
  $('#cvMotion').addEventListener('click', function(e){
    e.stopPropagation(); motionOn = !motionOn;
    try{ localStorage.setItem('cr-motion', motionOn?'on':'off'); }catch(e2){}
    applyMotion();
  });
  function handoff(){
    if(cv.dataset.state==='leaving') return;
    cv.classList.add('entered');           /* 以后再回封面就不重播入场动画了 */
    cv.dataset.state = 'leaving';          /* .cv 自己 .55s 淡出 */
    cr.hidden = false;                     /* .cr 有 crIn：.62s 淡入 + 轻微放大 */
    space.st.dimT = .78;
    if(motionOn){ space.start(); space.setStage(1); } else space.still();
    S.step = 1; render();
    setTimeout(function(){ cv.hidden = true; starfield.stop(); }, 560);
    var f = $('#nm'); if(f) f.focus();
  }
  function jump(){
    if(cv.dataset.state==='leaving') return;
    if(!motionOn){ handoff(); return; }
    cv.dataset.fly = '1';                  /* 摘掉粉尘、纹理、大雾，只留合成层 */
    cv.classList.add('is-jumping');
    /* 星空放到下一帧：首帧只付样式切换的钱，别和 canvas 首绘挤在一起 */
    requestAnimationFrame(function(){ starfield.start(); space.reveal(); });
    setTimeout(handoff, 800);
  }
  /* 回封面：把封面状态复位（瞬间，不做 1 秒的缩回动画） */
  function backToCover(){
    if(cr.hidden) return;
    cv.classList.add('no-anim');
    cr.hidden = true; cr.dataset.out = '';
    cv.hidden = false; cv.dataset.state = 'ready';
    cv.classList.remove('is-jumping'); cv.dataset.fly = '';
    S.step = 1;
    if(motionOn){ space.reveal(); space.start(); space.st.dimT = 1; } else space.still();
    setTimeout(function(){ cv.classList.remove('no-anim'); }, 80);
  }
  function atTop(){
    var m = $('#crMain'); return !m || m.scrollTop <= 2;
  }
  function busy(){ return !$('#sheet').hidden || !$('#pickModal').hidden; }

  window.addEventListener('wheel', function(e){
    if(busy()) return;
    if(!cv.hidden){
      if(e.deltaY > 6){ e.preventDefault(); jump(); }
    }else if(!cr.hidden && e.deltaY < -6 && atTop()){
      e.preventDefault(); backToCover();
    }
  }, {passive:false});

  var tY = 0, tT = 0, tLast = 0;
  window.addEventListener('touchstart', function(e){
    if(e.touches.length !== 1) return;
    tY = e.touches[0].clientY; tLast = tY; tT = Date.now();
  }, {passive:true});
  window.addEventListener('touchmove', function(e){
    if(e.touches.length === 1) tLast = e.touches[0].clientY;
  }, {passive:true});
  window.addEventListener('touchend', function(e){
    if(busy()) return;
    var el = e.target;
    if(el && el.closest && el.closest('input,textarea,select')) return;
    /* 某些环境 touchend 不带 changedTouches，退回 touchmove 记的最后位置 */
    var endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : tLast;
    var dy = endY - tY;
    if(Date.now() - tT > 700 || Math.abs(dy) < 46) return;
    if(!cv.hidden && dy < 0){ jump(); }
    else if(!cr.hidden && dy > 0 && atTop()){ backToCover(); }
  }, {passive:true});

  /* 「下次直接入局」：勾了就存，下次进卡跳过封面与捏人 */
  var AUTO_KEY = 'wuliu-auto-enter';
  var autoBox = $('#cvAuto');
  try{ autoBox.checked = localStorage.getItem(AUTO_KEY) === '1'; }catch(e){}
  autoBox.addEventListener('change', function(){
    try{ localStorage.setItem(AUTO_KEY, autoBox.checked ? '1' : '0'); }catch(e){}
  });

  $('#cvEnter').addEventListener('click', function(e){ e.stopPropagation(); jump(); });
  /* ═════ 三个入口：直接入局 / 存档 / 退出 ═════ */
  function fillDefaults(){
    if(!S.name) S.name='照雪';
    if(!S.sex) S.sex='女';
    if(!lookText()) S.look=LOOKS[S.sex][0].n;
    if(!essText()) S.essence=essDisplay(ESSENCE[0]);
    if(!personaText()) S.persona=PERSONA[0].n;
    if(!wuhunText()) S.wuhun='暂不塑造';
  }
  function skipToGame(){
    fillDefaults();
    if(window.__cvSkip){ window.__cvSkip(); return; }   /* 卡里：只收封面，不往输入框塞创建块 */
    cv.hidden = true; cr.hidden = true;
  }
  function openExit(){
    $('#exitScreen').hidden=false;
    if(motionOn) space.still();
  }
  $('#exitBack').addEventListener('click', function(){ location.reload(); });
  $('#exitScreen').addEventListener('click', function(e){ e.stopPropagation(); });

  /* ═════ 存档：浏览器本地，三格 ═════ */
  var SAVE_KEY='wuliu-saves-v1';
  function readSaves(){
    try{
      var a=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!a||!a.length) a=[null,null,null];
      while(a.length<3) a.push(null);
      return a.slice(0,3);
    }catch(e){ return [null,null,null]; }
  }
  function writeSaves(a){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(a)); }catch(e){} }
  function stamp(t){
    var d=new Date(t), p=function(n){ return (n<10?'0':'')+n; };
    return (d.getMonth()+1)+'/'+d.getDate()+' '+p(d.getHours())+':'+p(d.getMinutes());
  }
  function slotLabel(d){
    if(!d) return '空';
    var nm=(d.S&&d.S.name)?('千'+d.S.name):'未命名';
    var es=(d.S&&d.S.essence==='__custom')?'自定义':((d.S&&d.S.essence)||'—');
    return nm+' · '+((d.S&&d.S.sex)||'—')+' · '+es;
  }
  function countRows(){ var r=rows(),n=0; for(var i=0;i<r.length;i++){ if(r[i][1]) n++; } return n; }
  function renderSaves(){
    var a=readSaves(), h='';
    for(var i=0;i<3;i++){
      var d=a[i];
      h+='<div class="slot'+(d?'':' slot--empty')+'">'
        +'<span class="slot__i">0'+(i+1)+'</span>'
        +'<div class="slot__info"><b>'+esc(slotLabel(d))+'</b>'
        +'<i>'+(d?(stamp(d.t)+' · 第 '+d.step+' 步 · '+d.n+'/9 项'):'没有存档')+'</i></div>'
        +'<button type="button" data-save="'+i+'">'+(d?'覆盖':'保存')+'</button>'
        +(d?'<button type="button" data-load="'+i+'">读取</button><button type="button" data-del="'+i+'">删</button>':'')
        +'</div>';
    }
    $('#slots').innerHTML=h;
  }
  function openSaves(){
    renderSaves();
    $('#saveHint').textContent='点「保存」覆盖该槽位';
    $('#saveModal').hidden=false;
  }
  function closeSaves(){ $('#saveModal').hidden=true; }
  $('#saveClose').addEventListener('click', closeSaves);
  $('#saveModal').addEventListener('click', function(e){ if(e.target===$('#saveModal')) closeSaves(); });
  $('#slots').addEventListener('click', function(e){
    var b=e.target.closest('button'); if(!b) return;
    var a=readSaves();
    if(b.dataset.save!=null){
      var i=+b.dataset.save;
      a[i]={t:Date.now(), step:S.step, n:countRows(), S:JSON.parse(JSON.stringify(S))};
      writeSaves(a); renderSaves();
      $('#saveHint').textContent='已存入 0'+(i+1)+'。';
    }else if(b.dataset.load!=null){
      var d=a[+b.dataset.load]; if(!d) return;
      var kk;
      for(kk in S){ if(Object.prototype.hasOwnProperty.call(S,kk)&&d.S[kk]!==undefined) S[kk]=d.S[kk]; }
      cv.hidden=true; cr.hidden=false;
      if(motionOn){ space.reveal(); space.start(); } else space.reveal();
      closeSaves();
      S.step=Math.min(5,Math.max(1,d.step||1)); render();
      if(!motionOn) space.still();
    }else if(b.dataset.del!=null){
      a[+b.dataset.del]=null; writeSaves(a); renderSaves();
      $('#saveHint').textContent='已删除。';
    }
  });

  /* ═════ 从「这将写进输入框」直接存格 ═════ */
  function renderPick(){
    var a=readSaves(), h='';
    for(var i=0;i<3;i++){
      var d=a[i];
      h+='<button class="slot slot--pick'+(d?'':' slot--empty')+'" type="button" data-pick="'+i+'">'
        +'<span class="slot__i">0'+(i+1)+'</span>'
        +'<div class="slot__info"><b>'+(d?esc(slotLabel(d)):'空槽位')+'</b>'
        +'<i>'+(d?(stamp(d.t)+' · 第 '+d.step+' 步 · '+d.n+'/9 项'):'还没有存过')+'</i></div>'
        +'<em class="slot__go">'+(d?'覆盖':'存入')+'</em>'
        +'</button>';
    }
    $('#pickSlots').innerHTML=h;
  }
  function openPick(){
    if($('#sheet').hidden) return;
    renderPick();
    $('#pickHint').textContent='点一格存入，之后可从封面「存档」读取';
    $('#pickModal').hidden=false;
    $('#pickClose').focus();
  }
  function closePick(){ $('#pickModal').hidden=true; }
  $('#sheetSave').addEventListener('click', function(e){ e.stopPropagation(); openPick(); });
  $('#pickClose').addEventListener('click', closePick);
  $('#pickModal').addEventListener('click', function(e){ if(e.target===$('#pickModal')) closePick(); });
  $('#pickSlots').addEventListener('click', function(e){
    var b=e.target.closest('[data-pick]'); if(!b) return;
    var i=+b.dataset.pick, a=readSaves();
    a[i]={t:Date.now(), step:S.step, n:countRows(), S:JSON.parse(JSON.stringify(S))};
    writeSaves(a);
    renderPick();
    var hit=$('#pickSlots').querySelector('[data-pick="'+i+'"]');
    if(hit){
      hit.classList.add('slot--done');
      var go=hit.querySelector('.slot__go'); if(go) go.textContent='已存入';
    }
    $('#pickHint').textContent='已存入 0'+(i+1)+'。';
    var sb=$('#sheetSave');
    sb.classList.add('is-done'); sb.textContent='已存入 0'+(i+1);
    setTimeout(function(){
      closePick();
      sb.classList.remove('is-done'); sb.textContent='保存到存档';
    }, 820);
  });

  $$('[data-act]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var a=b.dataset.act;
      if(a==='skip') skipToGame();
      else if(a==='save') openSaves();
      else if(a==='exit') openExit();
    });
  });

  /* ═════ 形象 ═════ */
  function orbSvg(id, size){
    var s = size||40, u = 'g'+Math.random().toString(36).slice(2,7);
    if(id==='orb') return '<svg viewBox="0 0 48 48" width="'+s+'" height="'+s+'" aria-hidden="true">'
      +'<defs><radialGradient id="'+u+'" cx="38%" cy="32%"><stop offset="0" stop-color="#4A3670"/><stop offset=".55" stop-color="#181028"/><stop offset="1" stop-color="#07040E"/></radialGradient></defs>'
      +'<circle cx="24" cy="24" r="15" fill="url(#'+u+')" stroke="rgba(201,174,255,.35)" stroke-width=".8"/>'
      +'<ellipse cx="19" cy="18" rx="5" ry="3.2" fill="rgba(201,174,255,.2)" transform="rotate(-24 19 18)"/>'
      +'<circle cx="24" cy="24" r="19" fill="none" stroke="rgba(217,179,106,.22)" stroke-width=".7" stroke-dasharray="1 4"/></svg>';
    if(id==='mask') return '<svg viewBox="0 0 48 48" width="'+s+'" height="'+s+'" aria-hidden="true">'
      +'<path d="M24 7c8.6 0 13 5.4 13 13 0 9.6-5.4 17-13 22-7.6-5-13-12.4-13-22 0-7.6 4.4-13 13-13Z" fill="rgba(240,236,248,.1)" stroke="#E8E2F2" stroke-width="1.1" stroke-opacity=".75"/>'
      +'<path d="M16 21c2.4-2.6 6-2.6 8.4 0M24.6 21c2.4-2.6 6-2.6 8.4 0" fill="none" stroke="#E8E2F2" stroke-width="1.2" stroke-linecap="round" stroke-opacity=".85"/>'
      +'<path d="M21 30c1.8 1.4 4.2 1.4 6 0" fill="none" stroke="#E8E2F2" stroke-width="1.1" stroke-linecap="round" stroke-opacity=".6"/></svg>';
    if(id==='star') return '<svg viewBox="0 0 48 48" width="'+s+'" height="'+s+'" aria-hidden="true">'
      +'<circle cx="24" cy="24" r="11" fill="none" stroke="rgba(201,174,255,.25)" stroke-width=".7" stroke-dasharray="2 3"/>'
      +'<circle cx="24" cy="24" r="8" fill="#8C5CFF" opacity=".18"/><circle cx="24" cy="24" r="4" fill="#C9AEFF" opacity=".9"/>'
      +'<circle cx="35" cy="24" r="1.2" fill="#F6E3AE"/><circle cx="18" cy="15" r="1.1" fill="#F6E3AE" opacity=".85"/>'
      +'<circle cx="31" cy="33" r="1" fill="#F6E3AE" opacity=".7"/><circle cx="13" cy="29" r=".9" fill="#F6E3AE" opacity=".6"/></svg>';
    if(id==='screen') return '<svg viewBox="0 0 48 48" width="'+s+'" height="'+s+'" aria-hidden="true">'
      +'<rect x="7" y="12" width="34" height="25" rx="2.5" fill="rgba(212,72,94,.08)" stroke="#D4485E" stroke-width="1" stroke-opacity=".7"/>'
      +'<g stroke="#FF8A9B" stroke-width="1.1" stroke-linecap="round" opacity=".75"><path d="M12 19h16M12 24h22M12 29h11"/></g>'
      +'<path d="M7 24h34" stroke="#FF8A9B" stroke-width=".8" opacity=".28"/><circle cx="37" cy="16" r="1" fill="#FF8A9B"/></svg>';
    if(id==='eye') return '<svg viewBox="0 0 48 48" width="'+s+'" height="'+s+'" aria-hidden="true">'
      +'<path d="M6 24c5-7 11-10 18-10s13 3 18 10c-5 7-11 10-18 10S11 31 6 24Z" fill="none" stroke="rgba(127,227,240,.45)" stroke-width="1"/>'
      +'<circle cx="24" cy="24" r="7.4" fill="#0B0614" stroke="rgba(127,227,240,.6)" stroke-width=".9"/>'
      +'<ellipse cx="24" cy="24" rx="1.7" ry="6" fill="#7FE3F0" opacity=".9"/><circle cx="21" cy="21" r="1" fill="#EFE9F8" opacity=".8"/></svg>';
    return '';
  }
  function formName(id){ for(var i=0;i<FORMS.length;i++) if(FORMS[i][0]===id) return FORMS[i][1]; return ''; }

  /* ═════ 冒泡 ═════ */
  var tip = $('#tip');
  function hideTip(){ tip.hidden = true; }
  function showTip(el, title, payload){
    var o = {};
    try { o = JSON.parse(decodeURIComponent(payload || '')); } catch(e){ o = {}; }
    var h = '<b>'+esc(title)+(o.s?'<i>'+esc(o.s)+'</i>':'')+'</b>';
    if(o.t || o.r){
      h += '<div class="tipsub">'
        + (o.t?'<span>'+esc(o.t)+'</span>':'')
        + (o.r?'<span class="r">'+esc(o.r)+'</span>':'')
        + '</div>';
    }
    if(o.d) h += '<p>'+esc(o.d).split('\n\n').join('</p><p>')+'</p>';
    if(o.f) h += '<div class="tipf"><b>弱点</b><span>'+esc(o.f)+'</span></div>';
    tip.innerHTML = h;
    tip.hidden = false;
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = r.left + r.width/2 - tw/2;
    var up = r.top - 10, down = innerHeight - r.bottom - 10;
    var y = (up >= th && up >= down) ? (r.top - th - 9) : (r.bottom + 9);
    if(y + th > innerHeight - 8) y = Math.max(8, innerHeight - th - 8);
    if(y < 8) y = 8;
    x = Math.max(8, Math.min(x, innerWidth - tw - 8));
    tip.style.left = x+'px'; tip.style.top = y+'px';
  }
  $('#crMain').addEventListener('scroll', hideTip, {passive:true});
  document.addEventListener('keydown', function(e){
    if(window.__cvOff) return;
    if(e.key==='Escape'){
      hideTip();
      if(!$('#pickModal').hidden){ closePick(); return; }
      if(!$('#sheet').hidden) $('#sheet').hidden = true;
    }
  });
  /* 气泡开着时，这一屏的第一下点击只用来关它：
     捕获阶段就吃掉，别让下面的方块 / 下一步跟着响应，免得看一眼简介就顺手改了选项。
     点气泡本身也算"这一下"——不然它盖住的方块会变成点不动的死区。
     只有一处例外：气泡内容长到要滚动时，点右侧滚动条不能关。 */
  function tipShield(e){
    if(tip.hidden) return;
    var scrollable = tip.scrollHeight > tip.clientHeight + 1;
    if(scrollable && e.clientX > tip.getBoundingClientRect().right - 16) return;
    e.stopPropagation();
    e.preventDefault();
    hideTip();
  }
  ROOT.addEventListener('click', tipShield, true);

  /* ═════ 渲染 ═════ */
  function stepsHtml(){
    var h='';
    for(var i=0;i<5;i++){
      var n=i+1, cur = S.step===n;
      h += '<button class="st'+(n<S.step?' done':'')+'" type="button" data-step="'+n+'"'+(cur?' aria-current="step"':'')+'>'
        + '<b>'+STEPS[i][0]+'</b><i>'+STEPS[i][1]+'</i></button>';
    }
    return h;
  }
  function displayName(){ return S.name ? (GIVEN + S.name) : ''; }
  function lookObj(){ return findIn(LOOKS[S.sex]||[], S.look); }
  function lookText(){ return S.look==='__custom' ? S.lookCustom : S.look; }
  function lookDesc(){ var o=lookObj(); return o?o.d:''; }
  function essObj(){ return findIn(essList(), S.essence); }
  function essText(){ return S.essence==='__custom' ? S.essenceCustom : S.essence; }
  function essDesc(){ var o=essObj(); return o?o.d:''; }
  function personaObj(){ return findIn(PERSONA, S.persona); }
  function personaText(){ return S.persona==='__custom' ? S.personaCustom : S.persona; }
  function personaDesc(){ var o=personaObj(); return o?o.d:''; }
  function wuhunObj(){ return findIn(WUHUN, S.wuhun); }
  function wuhunText(){ return S.wuhun==='__custom' ? S.wuhunCustom : S.wuhun; }
  function wuhunDesc(){ var o=wuhunObj(); return o?o.d:''; }
  function callText(){
    if(S.call==='直呼姓名') return displayName()||'你';
    if(S.call==='__custom') return S.callCustom||'主人';
    return S.call;
  }
  function rows(){
    return [
      ['姓名', displayName(), 1],
      ['性别', S.sex, 1],
      ['相貌', lookText(), 1],
      ['前世身份', essText(), 2],
      ['系统外形', formName(S.form), 3],
      ['系统名字', S.sysName, 3],
      ['系统对你的称谓', callText(), 3],
      ['系统的形象与性格', personaText(), 3],
      ['第二武魂', wuhunText(), 4]
    ];
  }
  function renderOd(){
    var o = ORB[S.step]; if(!o || !$('#odIdx')) return;
    $('#odIdx').textContent = o[0];
    $('#odName').textContent = o[1];
    $('#odDist').textContent = o[2];
    $$('#odSeg i').forEach(function(el,i){ el.className = i < S.step ? 'on' : ''; });
    var od = $('#od'); od.classList.remove('fade'); void od.offsetWidth; od.classList.add('fade');
  }
  function renderSummary(){
    var r = rows(), h='';
    for(var i=0;i<r.length;i++){
      var v = r[i][1];
      h += '<button class="srow" type="button" data-go="'+r[i][2]+'"><span>'+r[i][0]+'</span>'
        + '<b class="'+(v?'':'empty')+'">'+(esc(v)||'待填写')+'</b></button>';
    }
    $('#sumBody').innerHTML = h;
    var n = 0;
    for(var k=0;k<r.length;k++){ if(r[k][1]) n++; }
    $('#sumCount').textContent = n + ' / 9';
    if($('#sumN')) $('#sumN').textContent = n + '/9';
    var bits=[]; if(displayName()) bits.push(displayName()); if(S.sex) bits.push(S.sex); if(essText()) bits.push(essText());
    var oo = ORB[S.step] || [0,'',''];
    $('#mSum').innerHTML = '<b>'+oo[1]+'</b> · ' + (bits.length ? esc(bits.join(' · ')) : '还没成形');
    $('#mSteps').innerHTML = [1,2,3,4,5].map(function(k){ return '<i class="'+(k<=S.step?'on':'')+'"></i>'; }).join('');
  }
  function wall(list, key, sel, maker, opt){
    var h = '<div class="wall" role="radiogroup">';
    for(var i=0;i<list.length;i++){
      var it = list[i], name = maker?maker(it):it.n;
      var cls = 'tile' + (name.length>6?' long':'') + (opt&&opt.keep&&it.keep?' keep':'');
      var pay = encodeURIComponent(JSON.stringify({
        s: it.s||'', t: it.t||'', r: it.r||'', d: it.d||'', f: it.f||''
      }));
      h += '<button class="'+cls+'" type="button" role="radio" aria-checked="'+(sel===name)+'"'
        + ' data-wall="'+key+'" data-v="'+esc(name)+'" data-json="'+pay+'"'
        + (it.r18 ? ' data-r18="1"' : '') + '>'
        + '<span>'+esc(name)+'</span></button>';
    }
    return h+'</div>';
  }
  function grouped(list, key, sel, maker){
    var h='';
    var cats = [];
    for(var i=0;i<list.length;i++){ if(cats.indexOf(list[i].c)<0) cats.push(list[i].c); }
    for(var c=0;c<cats.length;c++){
      var sub = list.filter(function(x){ return x.c===cats[c]; });
      var cnt = sub.length;
      h += '<div class="grp"><b>'+esc(cats[c])+'</b><i>'+cnt+'</i></div>';
      h += wall(sub, key, sel, maker);
    }
    return h;
  }
  function sugHtml(){
    var list = NAMES[S.sex]||[];
    return list.map(function(full){
      return '<button type="button" data-sug="'+esc(full.slice(1))+'">'+esc(full)+'</button>';
    }).join('');
  }

  function step1(){
    var looks = S.sex ? LOOKS[S.sex] : null;
    return '<div class="cr-in">'
      + '<h2 class="cr-h">你是谁</h2>'
      + '<p class="cr-lead">你是天使家族的一员，姓已经定了。这个名字用于千道流给你的取名。</p>'
      + '<div class="fld">'
      +   '<div class="fld-h">姓名</div>'
      +   '<div class="namerow">'
      +     '<div class="namebox" id="nameBox"><em>千</em><input id="nm" maxlength="2" autocomplete="off" placeholder="照雪" value="'+esc(S.name)+'" aria-label="名字，姓千已固定"></div>'
      +     '<div class="sug" id="nameSug">'+sugHtml()+'</div>'
      +   '</div>'
      +   '<span class="err" id="nmErr" hidden>填一个字或两个字。</span>'
      + '</div>'
      + '<div class="fld">'
      +   '<div class="fld-h">性别</div>'
      +   '<div class="sexes" role="radiogroup" aria-label="性别">'
      +     ['女','男'].map(function(x){ return '<button class="sex" type="button" role="radio" aria-checked="'+(S.sex===x)+'" data-sex="'+x+'">'+x+'</button>'; }).join('')
      +   '</div>'
      +   '<span class="err" id="sexErr" hidden>选一个。</span>'
      + '</div>'
      + '<div class="fld" id="lookFld"'+(S.sex?'':' hidden')+'>'
      +   '<div class="fld-h">你未来的相貌</div>'
      +   '<div class="wallwrap" id="lookWall">'+(looks?wall(looks,'look',S.look):'')+'</div>'
      +   '<div class="custom"><span>或者自己写</span><input class="inp" id="lookCustom" maxlength="40" placeholder="银发，瞳色很浅，右眼下有疤" value="'+esc(S.lookCustom)+'"></div>'
      +   '<span class="err" id="lookErr" hidden>挑一个，或者自己写一句。</span>'
      + '</div>'
      + '</div>';
  }

  function step2(){
    return '<div class="cr-in">'
      + '<h2 class="cr-h">你的亚空间本质（灵魂）</h2>'
      + '<p class="cr-lead">你是怎么跑到比比东的肚子里的？</p>'
      + '<div class="wallwrap" id="essWall">'+grouped(ESSENCE,'essence',S.essence,essDisplay)+'</div>'
      + '<div class="custom"><span>或者自己写</span><input class="inp" id="essCustom" maxlength="24" placeholder="一个还没被写进任何书里的存在" value="'+esc(S.essenceCustom)+'"></div>'
      + '<span class="err" id="essErr" hidden>挑一个方块，或者自己写一句。</span>'
      + '</div>';
  }

  function step3(){
    return '<div class="cr-in">'
      + '<h2 class="cr-h">它在你脑海里的样子</h2>'
      + '<p class="cr-lead">开场时它说过：<em>你可以为我设定性格、声音与形象。</em>现在轮到你了。</p>'
      + '<div class="fld"><div class="fld-h">外形</div>'
      +   '<div class="orbs" role="radiogroup" aria-label="系统外形">'
      +   FORMS.map(function(f){ return '<button class="orb" type="button" role="radio" aria-checked="'+(S.form===f[0])+'" data-form="'+f[0]+'">'+orbSvg(f[0])+'<span>'+f[1]+'</span></button>'; }).join('')
      +   '</div></div>'
      + '<div class="fld"><div class="fld-h">名字</div>'
      +   '<input class="inp" id="snm" maxlength="8" placeholder="天赋系统" value="'+esc(S.sysName)+'"></div>'
      + '<div class="fld"><div class="fld-h">系统的形象与性格</div>'
      +   '<div class="wallwrap" id="perWall">'+wall(PERSONA,'persona',S.persona)+'</div>'
      +   '<div class="custom"><span>或者自己写</span><input class="inp" id="perCustom" maxlength="40" placeholder="一个只有你能看见的东西" value="'+esc(S.personaCustom)+'"></div>'
      + '</div>'
      + '<div class="fld"><div class="fld-h">它怎么叫你</div>'
      +   '<div class="chips" id="callChips">'
      +   ['主人','宿主','直呼姓名'].map(function(c){ return '<button class="chip" type="button" data-call="'+c+'" aria-pressed="'+(S.call===c)+'">'+c+'</button>'; }).join('')
      +   '</div>'
      +   '<div class="custom"><span>它对你的称呼</span><input class="inp" id="cc" maxlength="8" placeholder="小姐、殿下、喂" value="'+esc(S.callCustom)+'"></div>'
      +   '<div class="custom"><span>你对它的称呼</span><input class="inp" id="cb" maxlength="8" placeholder="系统、妈妈、先生" value="'+esc(S.callBack)+'"></div>'
      +   '<span class="hintline">选上面的形象会自动填好，仍可改。</span>'
      + '</div>'
      + '<div class="cr-foot"><b>此后</b><p>这些以后都可以随时改，<em>系统忠心于你</em>。</p></div>'
      + '</div>';
  }

  function step4(){
    return '<div class="cr-in">'
      + '<h2 class="cr-h">第二武魂</h2>'
      + '<p class="cr-lead">本位面法则排斥它，所以它可以是<em>任何东西</em> —— 这个世界的、别的世界的、你想不到的。</p>'
      + '<div class="wallwrap" id="wuhunWall">'
      +   wall(WUHUN.filter(function(x){return x.keep;}),'wuhun',S.wuhun)
      +   grouped(WUHUN.filter(function(x){return !x.keep;}),'wuhun',S.wuhun)
      + '</div>'
      + '<div class="custom"><span>或者自己写</span><input class="inp" id="wuhunCustom" maxlength="40" placeholder="随便写，它归你" value="'+esc(S.wuhunCustom)+'"></div>'
      + '<span class="err" id="wuhunErr" hidden>挑一个方块，或者自己写一句。</span>'
      + '</div>';
  }

  function step5(){
    var r = rows(), h='';
    for(var i=0;i<r.length;i++){
      h += '<div class="rv"><dt>'+r[i][0]+'</dt><dd class="'+(r[i][1]?'':'empty')+'">'+esc(r[i][1]||'待填写')+'</dd>'
        + '<button type="button" data-go="'+r[i][2]+'">改</button></div>';
    }
    return '<div class="cr-in">'
      + '<h2 class="cr-h">入局之前</h2>'
      + '<p class="cr-lead">不用担心丢失设定 —— <em>非自定义的每一条都会在世界书里激活。</em></p>'
      + '<dl class="review">'+h+'</dl>'
      + '<div class="cr-foot"><b>此后</b><p>这九行会写成一段<em>【角色创建】</em>，随你第一句话发出去。之后想改，得重开一局。</p></div>'
      + '</div>';
  }

  function render(){
    $('#crSteps').innerHTML = stepsHtml();
    $('#crMain').innerHTML = [null,step1,step2,step3,step4,step5][S.step]();
    renderSummary();
    $('#crCount').textContent = '第 '+S.step+' 步 / 共 5 步';
    /* 第一页没有「上一步」可退，这颗按钮就退回封面（不是禁用） */
    $('#crPrev').disabled = false;
    $('#crPrev').textContent = S.step===1 ? '返回封面' : '上一步';
    $('#crNext').textContent = S.step===5 ? '入局' : '下一步';
    renderOd();
    hideTip();
    bind();
    space.setStage(S.step);
    if(!motionOn) space.still();
  }

  function bindSug(){
    $$('[data-sug]').forEach(function(b){
      if(b.__b) return; b.__b = 1;
      b.addEventListener('click', function(){
        S.name = b.dataset.sug;
        var i = $('#nm'); if(i) i.value = S.name;
        var e = $('#nmErr'); if(e) e.hidden = true;
        var box = $('#nameBox'); if(box) box.classList.remove('bad');
        renderSummary();
      });
    });
  }
  function bindWalls(){
    $$('[data-wall]').forEach(function(t){
      if(t.__b) return; t.__b = 1;
      t.addEventListener('click', function(){
        var k = t.dataset.wall, v = t.dataset.v;
        if(k==='essence'){ S.essence = v; S.essenceCustom=''; var a=$('#essCustom'); if(a) a.value=''; var e=$('#essErr'); if(e) e.hidden=true; }
        if(k==='look'){ S.look = v; S.lookCustom=''; var b=$('#lookCustom'); if(b) b.value=''; var e2=$('#lookErr'); if(e2) e2.hidden=true; }
        if(k==='persona'){
          S.persona = v; S.personaCustom=''; var c=$('#perCustom'); if(c) c.value='';
          var po = null;
          for(var q=0;q<PERSONA.length;q++){ if(PERSONA[q].n===v){ po=PERSONA[q]; break; } }
          if(po && po.c1){
            var c1 = po.c1;
            if(c1.indexOf('公子')>=0) c1 = (S.sex==='男')?'公子':'小姐';
            if(c1==='@name') c1 = displayName()||'你';
            S.call='__custom'; S.callCustom=c1;
            S.callBack = po.c2||'';
            var e1=$('#cc'), e2b=$('#cb');
            if(e1) e1.value=c1;
            if(e2b) e2b.value=S.callBack;
            $$('[data-call]').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
          }
        }
        if(k==='wuhun'){ S.wuhun = v; S.wuhunCustom=''; var d=$('#wuhunCustom'); if(d) d.value=''; var e3=$('#wuhunErr'); if(e3) e3.hidden=true; }
        $$('[data-wall="'+k+'"]').forEach(function(x){ x.setAttribute('aria-checked', x===t?'true':'false'); });
        showTip(t, v, t.dataset.json);
        renderSummary();
      });
    });
  }
  function bind(){
    var nm = $('#nm');
    if(nm){
      nm.addEventListener('input', function(){
        var v = nm.value.replace(/^千+/, '').slice(0,2);
        if(v !== nm.value) nm.value = v;
        S.name = v;
        var box = $('#nameBox'); if(box) box.classList.remove('bad');
        var e = $('#nmErr'); if(e) e.hidden = true;
        renderSummary();
      });
      nm.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); go(2); } });
    }
    bindSug();
    $$('[data-sex]').forEach(function(b){
      b.addEventListener('click', function(){
        var changed = S.sex !== b.dataset.sex;
        S.sex = b.dataset.sex;
        $$('[data-sex]').forEach(function(x){ x.setAttribute('aria-checked', x===b?'true':'false'); });
        var e = $('#sexErr'); if(e) e.hidden = true;
        if(changed){ S.look=''; S.lookCustom=''; }
        var fld = $('#lookFld'), w = $('#lookWall'), c = $('#lookCustom');
        if(fld){ fld.hidden = false; w.innerHTML = wall(LOOKS[S.sex],'look',S.look); bindWalls(); }
        if(c) c.value = '';
        $('#nameSug').innerHTML = sugHtml(); bindSug();
        renderSummary();
      });
    });
    bindWalls();
    var ec = $('#essCustom');
    if(ec) ec.addEventListener('input', function(){
      S.essenceCustom = ec.value; S.essence = ec.value ? '__custom' : '';
      $$('[data-wall="essence"]').forEach(function(x){ x.setAttribute('aria-checked','false'); });
      renderSummary();
    });
    var lc = $('#lookCustom');
    if(lc) lc.addEventListener('input', function(){
      S.lookCustom = lc.value; S.look = lc.value ? '__custom' : '';
      $$('[data-wall="look"]').forEach(function(x){ x.setAttribute('aria-checked','false'); });
      renderSummary();
    });
    $$('[data-form]').forEach(function(b){
      b.addEventListener('click', function(){
        S.form = b.dataset.form;
        $$('[data-form]').forEach(function(x){ x.setAttribute('aria-checked', x===b?'true':'false'); });
        renderSummary();
      });
    });
    var sn = $('#snm');
    if(sn) sn.addEventListener('input', function(){ S.sysName = sn.value; renderSummary(); });
    $$('[data-call]').forEach(function(b){
      b.addEventListener('click', function(){
        S.call = b.dataset.call;
        $$('[data-call]').forEach(function(x){ x.setAttribute('aria-pressed', x===b?'true':'false'); });
        renderSummary();
      });
    });
    var cb = $('#cb');
    if(cb) cb.addEventListener('input', function(){ S.callBack = cb.value; renderSummary(); });
    var cc = $('#cc');
    if(cc) cc.addEventListener('input', function(){
      S.callCustom = cc.value;
      if(cc.value){ S.call='__custom'; $$('[data-call]').forEach(function(x){ x.setAttribute('aria-pressed', x.dataset.call==='__custom'?'true':'false'); }); }
      renderSummary();
    });
    var pc = $('#perCustom');
    if(pc) pc.addEventListener('input', function(){
      S.personaCustom = pc.value; S.persona = pc.value ? '__custom' : '';
      $$('[data-wall="persona"]').forEach(function(x){ x.setAttribute('aria-checked','false'); });
      renderSummary();
    });
    var wc = $('#wuhunCustom');
    if(wc) wc.addEventListener('input', function(){
      S.wuhunCustom = wc.value; S.wuhun = wc.value ? '__custom' : '';
      $$('[data-wall="wuhun"]').forEach(function(x){ x.setAttribute('aria-checked','false'); });
      renderSummary();
    });
    $$('[data-go]').forEach(function(b){ b.addEventListener('click', function(){ go(parseInt(b.dataset.go,10)); }); });
    $$('[data-step]').forEach(function(b){ b.addEventListener('click', function(){ go(parseInt(b.dataset.step,10)); }); });
  }

  function validate(n){
    if(n===1){
      var ok = true;
      if(!S.name.trim()){ var e1=$('#nmErr'); if(e1) e1.hidden=false; var b=$('#nameBox'); if(b) b.classList.add('bad'); ok=false; }
      if(!S.sex){ var e2=$('#sexErr'); if(e2) e2.hidden=false; ok=false; }
      if(ok && !lookText()){ var e3=$('#lookErr'); if(e3) e3.hidden=false; ok=false; }
      return ok;
    }
    if(n===2 && !essText()){ var e4=$('#essErr'); if(e4) e4.hidden=false; return false; }
    if(n===4 && !wuhunText()){ var e5=$('#wuhunErr'); if(e5) e5.hidden=false; return false; }
    return true;
  }
  function go(n){
    if(n > S.step && !validate(S.step)) return;
    S.step = Math.max(1, Math.min(5, n));
    render();
    $('#crMain').scrollTop = 0;
  }
  $('#crNext').addEventListener('click', function(){
    if(S.step===5){ openSheet(); return; }
    go(S.step+1);
  });
  $('#crPrev').addEventListener('click', function(){
    if(S.step===1){ backToCover(); return; }   /* 第一页 → 退回封面，进度留在 S 里 */
    go(S.step-1);
  });
  $('#crSkip').addEventListener('click', function(){
    if(!S.name) S.name = '照雪';
    if(!S.sex) S.sex = '女';
    if(!lookText()) S.look = LOOKS[S.sex][0].n;
    if(!essText()) S.essence = essDisplay(ESSENCE[0]);
    if(!personaText()) S.persona = PERSONA[0].n;
    if(!wuhunText()) S.wuhun = '暂不塑造';
    openSheet();
  });
  $('#sumGo').addEventListener('click', function(){
    $('#drawer').classList.remove('on'); $('#drawerMask').classList.remove('on');
    if(!S.name || !S.sex || !lookText()){ go(1); return; }
    if(!essText()){ go(2); return; }
    if(!wuhunText()){ go(4); return; }
    go(5); openSheet();
  });
  function drawer(on){
    $('#drawer').classList.toggle('on', on);
    $('#drawerMask').classList.toggle('on', on);
    if(on) $('#drawerX').focus();
  }
  $('#sumToggle').addEventListener('click', function(){ drawer(true); });
  $('#drawerX').addEventListener('click', function(){ drawer(false); });
  $('#drawerMask').addEventListener('click', function(){ drawer(false); });
  document.addEventListener('keydown', function(e){ if(window.__cvOff) return; if(e.key==='Escape') drawer(false); });

  /* ═════ 提交 ═════ */
  function seg(name, desc){ return name; }
  function blockText(){
    return '[creation]\n【角色创建】\n'
      + '姓名：' + (displayName()||'千') + '\n'
      + '性别：' + (S.sex||'未定') + '\n'
      + '相貌：' + seg(lookText()||'未定', lookDesc()) + '\n'
      + '前世身份：' + seg(essText()||'未定', essDesc()) + '\n'
      + '系统名字：' + (S.sysName||'天赋系统') + '\n'
      + '系统对你的称谓：' + callText() + '\n'
      + '系统的形象与性格：' + seg(personaText()||'未定', personaDesc()) + '\n'
      + '第二武魂：' + seg(wuhunText()||'暂不塑造', wuhunDesc()) + '\n'
      + '[/creation]';
  }
  function openSheet(){
    var raw = blockText();
    $('#sheetBlock').innerHTML = '<span class="hid">'+esc(raw)+'</span>';
    $('#sheet').hidden = false; $('#sheetBack').focus(); hideTip();
  }
  $('#sheetBack').addEventListener('click', function(){ $('#sheet').hidden = true; });
  $('#sheetOk').addEventListener('click', function(){
    /* 进 Frame 后由宿主接管：把 [creation] 写进帧内输入框，不切假 HUD */
    if(window.__cvOnDone){ $('#sheet').hidden = true; window.__cvOnDone(blockText(), true); return; }
    $('#sheet').hidden = true;
  });
  $('#sheet').addEventListener('click', function(e){ if(e.target===$('#sheet')) $('#sheet').hidden = true; });

      window.__cvCtl = { space:space, stars:starfield,
    isCover:function(){ return !cv.hidden; }, isCr:function(){ return !cr.hidden; },
    motion:function(){ return motionOn; },
    block:function(){ return blockText(); },
    reopen:function(){
      var h = document.getElementById('cvHost'); if(h) h.style.display = '';
      window.__cvOff = false;
      cv.hidden = false; cv.dataset.state = 'ready';
      cv.classList.remove('is-jumping'); cv.dataset.fly = '';
      cr.hidden = true; cr.dataset.out = '';
      $('#sheet').hidden = true; $('#pickModal').hidden = true;
      S.step = 1;
      if(motionOn){ space.reveal(); space.start(); space.st.dimT = 1; } else space.still();
    },
    hideCover:function(){ cv.dataset.state='leaving'; setTimeout(function(){ cv.hidden = true; }, 420); },
    finish:function(){ cv.dataset.state='leaving'; try{ space.still(); }catch(e){}
      setTimeout(function(){ cv.hidden = true; cr.hidden = true; }, 420); } };
  if(location.hash==='#cr'){ cv.hidden = true; cr.hidden = false; render(); }
})();
/* ═════ Frame 桥接 ═════ */
(function(){
  var ctl = function(){ return window.__cvCtl; };
  /* 整个宿主一起收：只隐藏 #cv 的话，shadow 里的 #space 星系会一直盖着 HUD */
  function dismissHost(delay){
    /* 必须走 inline display：shadow 里的 :host{display:block} 会盖掉 [hidden] */
    setTimeout(function(){
      window.__cvOff = true;                          /* 全局监听立刻停手 */
      try{ var c = ctl(); c.space.still(); c.stars.stop(); }catch(e){}
      try{ HOSTEL.style.display = 'none'; }catch(e){}
    }, delay || 0);
  }

  /* ⓪ 开发预览（#devboot）直通 HUD：本地回归要能直接点到 HUD，不该被封面挡 */
  if(location.hash.indexOf('#devboot') === 0){ dismissHost(0); }

  /* ① 已经创建过就不再弹封面：等消息落地，历史里有 [creation] 就撤 */
  var waited = 0, decided = false;
  function decide(){
    if(decided) return; decided = true;
    var box = document.getElementById('messages');
    if(box && /\[creation\]/.test(box.textContent || '')){
      var c = ctl(); if(c) c.hideCover();
      dismissHost(460);
    }
  }
  var tick = setInterval(function(){
    waited += 200;
    var box = document.getElementById('messages');
    if(box && box.querySelector('.item, [class*="item"]')){ clearInterval(tick); decide(); }
    else if(waited >= 2400){ clearInterval(tick); }
  }, 200);

  /* ② 「写进输入框」交给 Frame：塞进 #text，不自动发送。
        force=false 时只在草稿为空时写，避免「下次直接入局」反复覆盖玩家已写的内容。
        系统外形写在这里、不进 [creation]：它只决定 HUD 里系统的头像形态。 */
  window.__cvOnDone = function(raw, force){
    var t = document.getElementById('text');
    if(t && (force || !String(t.value||'').trim())){
      t.value = raw;
      t.dispatchEvent(new Event('input', { bubbles:true }));
      try{ t.focus(); }catch(e){}
    }
    try{ if(window.__cvApplySysForm) window.__cvApplySysForm(S.form); }catch(e){}
    var c = ctl(); if(c && c.finish) c.finish();
    dismissHost(470);
  };

  /* ②b 直接入局：收掉封面，不往输入框写任何东西 */
  window.__cvSkip = function(){
    var c = ctl(); if(c && c.finish) c.finish();
    dismissHost(470);
  };

  /* ②c 勾了「下次直接入局」：跳过封面与捏人 */
  try{
    if(localStorage.getItem('wuliu-auto-enter') === '1'){
      setTimeout(function(){ window.__cvSkip(); }, 60);
    }
  }catch(e){}

  /* ③ 切走就停：手机在后台还满帧跑，是最容易发烫的用法 */
  document.addEventListener('visibilitychange', function(){
    var c = ctl(); if(!c) return;
    if(document.hidden){
      try{ c.space.still(); }catch(e){}
      try{ c.stars.stop(); }catch(e){}
    }else if(!c.isCover() && c.isCr() && c.motion()){
      try{ c.space.start(); }catch(e){}
    }
  });
})();
})();
