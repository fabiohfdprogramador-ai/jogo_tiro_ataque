// Vozes das falas dos bots ("Contato!", "Granada!"...), faladas pela voz em português do próprio
// navegador: não precisa de arquivo de áudio nem de serviço pago. No Edge as vozes "Natural"
// (Francisca, Antonio, Thalita...) soam bem humanas; no Chrome usa a voz do Google.
// Cada bot tem um timbre (tom e velocidade) e o volume cai com a distância.
// F7 liga/desliga as vozes (fica salvo no navegador).
const synth = window.speechSynthesis;
const FEM_BOT = /^(BOT )?(Bia|Nina|Gabi|Lia|Duda)\b/i;                  // bots com nome de mulher
const FEM_VOZ = /maria|francisca|thalita|leila|yara|manuela|giovanna|brenda|elza|leticia|let[ií]cia|vit[oó]ria|luciana|female|feminina/i;
let todas = [], homens = [], mulheres = [];

function carregar() {
  if (!synth) return;
  const v = synth.getVoices();
  let pt = v.filter(x => /^pt[-_]BR/i.test(x.lang));
  if (!pt.length) pt = v.filter(x => /^pt/i.test(x.lang));
  // as vozes "naturais" (online) primeiro: são as mais parecidas com gente
  const boa = (x) => /natural|online|google/i.test(x.name) ? 1 : 0;
  pt.sort((a, b) => boa(b) - boa(a));
  todas = pt;
  mulheres = pt.filter(x => FEM_VOZ.test(x.name));
  homens = pt.filter(x => !FEM_VOZ.test(x.name));
}
if (synth) { carregar(); synth.addEventListener?.('voiceschanged', carregar); }

let ligado = true;
try { ligado = localStorage.getItem('ataque_vozes') !== '0'; } catch (e) {}

// número fixo por bot (0..1), para o timbre não mudar a cada fala
const hash = (id) => (((id + 1) * 2654435761) >>> 0) / 4294967296;

// fala o texto do bot. dist = distância até você (m); vol = volume geral do jogo (0..1)
export function falar(id, texto, dist, vol, nome = '') {
  if (!synth || !ligado || !todas.length || !texto) return;
  if (dist > 38) return;                                    // longe demais: não dá para ouvir
  if (synth.speaking || synth.pending) return;              // gritos rápidos: não acumula fila
  const volume = Math.min(1, vol * 1.15 * Math.max(0, 1 - dist / 42));
  if (volume < 0.05) return;
  const h = hash(id);
  const lista = FEM_BOT.test(nome) ? (mulheres.length ? mulheres : todas) : (homens.length ? homens : todas);
  const voz = lista[Math.floor(h * 997) % lista.length];
  const u = new SpeechSynthesisUtterance(texto);
  u.voice = voz; u.lang = voz.lang;
  u.pitch = 0.8 + h * 0.4;                                  // cada bot com um timbre
  u.rate = 1.1 + ((id * 7) % 5) * 0.05;                     // falam rápido, como quem grita no meio do tiroteio
  u.volume = volume;
  try { synth.speak(u); } catch (e) {}
}

// F7: liga/desliga, com um aviso rápido na tela
function aviso(txt) {
  const el = document.createElement('div');
  el.textContent = txt;
  el.style.cssText = 'position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:99999;background:rgba(8,9,12,.82);color:#e8e6df;' +
    'font:600 15px system-ui,sans-serif;padding:8px 14px;border-radius:6px;pointer-events:none;transition:opacity .4s';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 450); }, 1300);
}
addEventListener('keydown', (e) => {
  if (e.code !== 'F7') return;
  e.preventDefault();
  ligado = !ligado;
  try { localStorage.setItem('ataque_vozes', ligado ? '1' : '0'); } catch (x) {}
  if (!ligado && synth) synth.cancel();
  aviso(ligado ? (todas.length ? 'Vozes dos bots: ligadas (F7)' : 'Este navegador não tem voz em português') : 'Vozes dos bots: desligadas (F7)');
}, true);

// ---- falas gravadas (MP3 em /sounds/vozes/): som 3D, vindo da posição do bot, com um pouco de eco
const gravadas = {};   // nome -> AudioBuffer (ou a promessa enquanto carrega)
async function carregarGravacao(ctx, nome) {
  if (!gravadas[nome]) {
    gravadas[nome] = fetch('/sounds/vozes/' + nome + '.mp3')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => ctx.decodeAudioData(b))
      .catch(() => null);
  }
  return gravadas[nome];
}
// sound = o Sound do jogo (audio2.js); pos = [x, y, z] da boca do bot; dist = distância até você.
// Devolve true se tocou (senão quem chamou pode usar a voz do navegador).
export async function tocarGravacao(sound, nome, pos, dist) {
  if (!ligado || !sound || !sound.ctx || dist > 60) return false;
  const ctx = sound.ctx, buf = await carregarGravacao(ctx, nome);
  if (!buf) return false;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = 1.0;
  const p = ctx.createPanner();
  // grito: dá para ouvir de longe (cai mais devagar que os passos)
  p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 9; p.rolloffFactor = 1; p.maxDistance = 120;
  if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } else p.setPosition(...pos);
  src.connect(g); g.connect(p);
  p.connect((sound.bus && sound.bus.avisos) || sound.master);
  if (sound.reverb) { const send = ctx.createGain(); send.gain.value = 0.18 + Math.min(0.4, dist * 0.01); g.connect(send); send.connect(sound.reverb); }
  src.start();
  return true;
}

// Anúncio para o seu time (não vem de um lugar do mapa: toca "na cabeça", como um narrador).
// Ex.: bomba plantada. Também respeita o F7.
export async function tocarAnuncio(sound, nome, atraso = 0, vol = 1) {
  if (!ligado || !sound || !sound.ctx) return false;
  const ctx = sound.ctx, buf = await carregarGravacao(ctx, nome);
  if (!buf) return false;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g); g.connect((sound.bus && sound.bus.avisos) || sound.master);
  src.start(ctx.currentTime + atraso);
  return true;
}
