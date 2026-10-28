/* rex-ping · statusbar 入口。这里只负责「喊一声」，不负责装配 ——
   statusbar 可能比正文先执行，也可能在切会话时单独重挂，所以必须等内核就位。 */
(function () {
  var tries = 0;
  function tick() {
    var R = window.__REX__;
    if (R && (R.boot || R.afterReady)) {
      try { R.afterReady ? R.afterReady() : R.boot(); } catch (e) {}
      return;
    }
    if (tries++ < 120) setTimeout(tick, 50);
  }
  tick();
})();
