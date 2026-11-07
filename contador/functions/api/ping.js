// POST /api/ping  — cada aba aberta manda isto a cada 30 s e quando muda de estado.
// Corpo: { sid, vid, estado, mapa?, evento?, origem? }
const ESTADOS = new Set(["site", "carregando", "menu", "partida", "saiu"]);   // o Ataque usa site/carregando/partida/saiu
const EVENTOS = new Set(["visita", "jogou", "partida"]);
const ID = /^[a-z0-9-]{8,40}$/i;

const txt = (v, n) => (typeof v === "string" ? v.slice(0, n) : null);

export async function onRequestPost({ request, env }) {
  let b;
  try {
    b = await request.json();   // sendBeacon manda como texto; .json() lê igual
  } catch {
    return new Response("json inválido", { status: 400 });
  }
  if (!ID.test(b.sid || "") || !ID.test(b.vid || "") || !ESTADOS.has(b.estado)) {
    return new Response("dados inválidos", { status: 400 });
  }
  const cf = request.cf || {};
  const pais = txt(cf.country, 4) || "??";
  const agora = Date.now();
  const mapa = txt(b.mapa, 20);
  const db = env.DB;
  const stmts = [];

  if (b.estado === "saiu") {
    stmts.push(db.prepare("DELETE FROM online WHERE sid = ?1").bind(b.sid));
  } else {
    stmts.push(db.prepare(
      `INSERT INTO online (sid, last_seen, estado, mapa, pais) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(sid) DO UPDATE SET last_seen = ?2, estado = ?3, mapa = ?4`
    ).bind(b.sid, agora, b.estado, mapa, pais));
  }

  if (EVENTOS.has(b.evento)) {
    stmts.push(db.prepare(
      `INSERT OR IGNORE INTO entradas (quando, tipo, sid, visitante, pais, regiao, cidade, origem, mapa)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
    ).bind(agora, b.evento, b.sid, b.vid, pais, txt(cf.region, 60), txt(cf.city, 60),
           txt(b.origem, 80), mapa));
  }

  // limpeza de vez em quando: abas que sumiram há mais de 10 min
  if (Math.random() < 0.05) {
    stmts.push(db.prepare("DELETE FROM online WHERE last_seen < ?1").bind(agora - 600000));
  }

  await db.batch(stmts);
  return new Response(null, { status: 204 });
}
