// Contador de visitas (Cloudflare): quantas pessoas entram no jogo e de onde.
// Fica separado do jogo: observa a conexão WebSocket do main.js sem mexer nele.
// Guarda só um número aleatório do navegador; país/cidade vêm do Cloudflare (o IP não é guardado).
(function () {
  var local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  // no seu PC o contador fica desligado (não suja o console); para testar o contador local, abra com ?contador
  if (local && !/[?&]contador\b/.test(location.search)) return;
  var API = local ? 'http://localhost:8788' : 'https://ataque-contador.pages.dev';

  function novoId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  var vid;
  try { vid = localStorage.getItem('ataque_vid'); if (!vid) { vid = novoId(); localStorage.setItem('ataque_vid', vid); } }
  catch (e) { vid = novoId(); }
  var sid = novoId();
  var estado = 'site', mapa = null;

  function ping(evento) {
    var corpo = { sid: sid, vid: vid, estado: estado, mapa: mapa };
    if (evento) corpo.evento = evento;
    if (evento === 'visita') {
      try {
        var r = document.referrer && new URL(document.referrer);
        if (r && r.host !== location.host) corpo.origem = r.host.replace(/^www\./, '');
      } catch (e) {}
    }
    try {
      // text/plain evita a checagem extra (preflight) do navegador
      fetch(API + '/api/ping', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(corpo), keepalive: true })
        .catch(function () {});
    } catch (e) {}
  }

  // ---- observa a conexão do jogo
  var Nativo = window.WebSocket;
  if (Nativo) {
    var Observado = function (url, protocols) {
      var ws = protocols === undefined ? new Nativo(url) : new Nativo(url, protocols);
      var entrou = false;
      var send = ws.send;
      ws.send = function (d) {   // a mensagem de entrada diz o mapa escolhido
        if (!entrou && typeof d === 'string' && d.indexOf('"join"') !== -1) {
          try { var m = JSON.parse(d); if (m.map) mapa = String(m.map); } catch (e) {}
        }
        return send.apply(ws, arguments);
      };
      ws.addEventListener('open', function () { estado = 'carregando'; ping('jogou'); });
      ws.addEventListener('message', function (e) {
        if (entrou || typeof e.data !== 'string' || e.data.indexOf('"welcome"') === -1) return;
        try { var m = JSON.parse(e.data); if (m.t !== 'welcome') return; if (m.map) mapa = String(m.map); } catch (x) { return; }
        entrou = true; estado = 'partida'; ping('partida');
      });
      ws.addEventListener('close', function () { estado = 'site'; ping(); });
      return ws;
    };
    Observado.prototype = Nativo.prototype;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { Observado[k] = Nativo[k]; });
    window.WebSocket = Observado;
  }

  ping('visita');
  setInterval(function () { if (!document.hidden) ping(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) ping(); });
  addEventListener('pagehide', function () {
    try { navigator.sendBeacon && navigator.sendBeacon(API + '/api/ping', JSON.stringify({ sid: sid, vid: vid, estado: 'saiu' })); } catch (e) {}
  });

  // ---- "jogando agora" no menu
  function mostrar() {
    var sub = document.querySelector('#menu .brand .sub');
    if (!sub) return;
    var el = document.getElementById('agora');
    if (!el) {
      el = document.createElement('p');
      el.id = 'agora';
      el.style.cssText = 'margin:6px 0 0;font-size:13px;color:#9fd27a;opacity:.9;min-height:1.2em';
      sub.parentNode.insertBefore(el, sub.nextSibling);
    }
    fetch(API + '/api/stats').then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (!s) return;
      var n = s.agora.total, p = s.agora.partida;
      el.textContent = '● ' + n + (n === 1 ? ' pessoa online' : ' pessoas online') + (p ? ' · ' + p + ' em partida' : '');
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrar); else mostrar();
  setInterval(function () {
    var menu = document.getElementById('menu');
    if (!document.hidden && menu && !menu.classList.contains('hidden')) mostrar();
  }, 20000);
})();
