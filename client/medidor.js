// Medidor de travadas: só liga abrindo o jogo com ?medidor no endereço (ex.: https://.../?medidor).
// Mostra FPS, ping e de onde vêm as travadas: da tela (computador), do servidor ou da rede.
// Fica separado do jogo: observa a conexão WebSocket sem mexer no main.js.
(function () {
  var ligado = /[?&]medidor\b/.test(location.search);
  try { if (ligado) localStorage.setItem('ataque_medidor', '1'); if (/[?&]medidor=0\b/.test(location.search)) { localStorage.removeItem('ataque_medidor'); ligado = false; } else if (localStorage.getItem('ataque_medidor')) ligado = true; } catch (e) {}
  if (!ligado) return;

  var ESPERADO = 1000 / 30;          // o servidor manda o estado 30 vezes por segundo
  var JANELA = 60000;                // contagem de travadas no último minuto
  var ev = [];                       // [tempo, tipo] das travadas: 'tela' | 'servidor' | 'rede'
  var pior = { quadro: 0, servidor: 0, rede: 0 };
  var fps = 0, quadros = 0, piorQuadro = 0, ultimoQ = performance.now(), inicioFps = ultimoQ;
  var msgs = 0, msgsSeg = 0, ultimaChegada = 0, ultimoSt = 0, atrasoSrv = 0, atrasoRede = 0, ping = 0;

  function marca(tipo) { ev.push([performance.now(), tipo]); }

  // ---- FPS e quadros lentos (travada no computador)
  function quadro(t) {
    var d = t - ultimoQ; ultimoQ = t; quadros++;
    if (d > piorQuadro) piorQuadro = d;
    if (d > 70 && !document.hidden) { marca('tela'); if (d > pior.quadro) pior.quadro = d; }
    if (t - inicioFps >= 1000) { fps = Math.round(quadros * 1000 / (t - inicioFps)); quadros = 0; inicioFps = t; }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  // ---- atualizações do servidor: compara o relógio do servidor (st) com a hora em que chegaram
  var Anterior = window.WebSocket;
  var Medido = function (url, protocols) {
    var ws = protocols === undefined ? new Anterior(url) : new Anterior(url, protocols);
    ws.addEventListener('message', function (e) {
      if (typeof e.data !== 'string' || e.data.indexOf('"t":"state"') === -1) return;
      var m = /"st":([\d.]+)/.exec(e.data); if (!m) return;
      var agora = performance.now(), st = parseFloat(m[1]) * 1000;
      msgs++;
      if (ultimaChegada && ultimoSt && !document.hidden) {
        var chegada = agora - ultimaChegada, srv = st - ultimoSt;
        atrasoSrv = srv; atrasoRede = Math.max(0, chegada - srv);
        if (srv > ESPERADO * 2.2) { marca('servidor'); if (srv > pior.servidor) pior.servidor = srv; }          // o servidor atrasou a volta
        else if (chegada > ESPERADO * 3) { marca('rede'); if (chegada > pior.rede) pior.rede = chegada; }      // servidor em dia, mas chegou atrasado
      }
      ultimaChegada = agora; ultimoSt = st;
    });
    ws.addEventListener('close', function () { ultimaChegada = 0; ultimoSt = 0; });
    return ws;
  };
  Medido.prototype = Anterior.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { Medido[k] = Anterior[k]; });
  window.WebSocket = Medido;
  setInterval(function () { msgsSeg = msgs; msgs = 0; }, 1000);

  // ---- ping: ida e volta até o servidor do jogo
  function medePing() {
    var t0 = performance.now();
    fetch('/contador.js?ping=' + Math.random(), { method: 'HEAD', cache: 'no-store' }).then(function () { ping = Math.round(performance.now() - t0); }).catch(function () {});
  }
  setInterval(function () { if (!document.hidden) medePing(); }, 2000);
  medePing();

  // ---- painel na tela
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:14px;top:244px;z-index:99999;pointer-events:none;background:rgba(8,9,12,.78);color:#e8e6df;' +
    'font:12px/1.45 ui-monospace,Consolas,monospace;padding:8px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15);white-space:pre;min-width:230px';
  function cor(v, bom, ruim) { return v <= bom ? '#9fd27a' : v <= ruim ? '#f0c060' : '#ff6a5a'; }
  function linha(txt, c) { return '<span style="color:' + c + '">' + txt + '</span>'; }
  function desenha() {
    if (!box.parentNode && document.body) document.body.appendChild(box);
    var t = performance.now();
    while (ev.length && ev[0][0] < t - JANELA) ev.shift();
    var n = { tela: 0, servidor: 0, rede: 0 };
    ev.forEach(function (x) { n[x[1]]++; });
    var jogando = msgsSeg > 0;
    box.innerHTML =
      '<b>MEDIDOR</b>  <span style="opacity:.6">(?medidor=0 desliga)</span>\n' +
      linha('FPS ' + fps + '  (pior quadro ' + Math.round(piorQuadro) + ' ms)', cor(-fps, -55, -30)) + '\n' +
      linha('Ping ' + (ping || '–') + ' ms', cor(ping, 120, 250)) + '\n' +
      (jogando
        ? linha('Servidor ' + msgsSeg + '/s (ideal 30)', cor(30 - msgsSeg, 2, 8)) + '\n' +
          linha('Última volta do servidor ' + Math.round(atrasoSrv) + ' ms', cor(atrasoSrv, 45, 80)) + '\n'
        : 'Servidor: entre numa partida\n') +
      '\nTravadas no último minuto:\n' +
      linha('  tela (computador) ' + n.tela + '   pior ' + Math.round(pior.quadro) + ' ms', n.tela ? '#f0c060' : '#9fd27a') + '\n' +
      linha('  servidor (CPU)    ' + n.servidor + '   pior ' + Math.round(pior.servidor) + ' ms', n.servidor ? '#ff6a5a' : '#9fd27a') + '\n' +
      linha('  rede (internet)   ' + n.rede + '   pior ' + Math.round(pior.rede) + ' ms', n.rede ? '#f0c060' : '#9fd27a');
    piorQuadro = 0;
  }
  setInterval(desenha, 1000);
})();
