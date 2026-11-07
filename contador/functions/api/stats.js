// GET /api/stats — números públicos mostrados na página inicial.
export const ONLINE_MS = 75000;   // conta como "agora" quem mandou sinal nos últimos 75 s

export async function onRequestGet({ env }) {
  const desde = Date.now() - ONLINE_MS;
  const [agora, totais, paises] = await env.DB.batch([
    env.DB.prepare("SELECT estado, COUNT(*) AS n FROM online WHERE last_seen > ?1 GROUP BY estado").bind(desde),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT visitante) AS pessoas,
              COALESCE(SUM(tipo = 'jogou'), 0) AS jogaram,
              COALESCE(SUM(tipo = 'partida'), 0) AS partidas
       FROM entradas`),
    env.DB.prepare(
      `SELECT pais, COUNT(DISTINCT visitante) AS pessoas FROM entradas
       GROUP BY pais ORDER BY pessoas DESC LIMIT 8`),
  ]);
  const porEstado = Object.fromEntries(agora.results.map((r) => [r.estado, r.n]));
  const total = Object.values(porEstado).reduce((a, b) => a + b, 0);
  return Response.json({
    agora: {
      total,
      partida: porEstado.partida || 0,
      menu: (porEstado.menu || 0) + (porEstado.carregando || 0),
      site: porEstado.site || 0,
    },
    totais: totais.results[0],
    paises: paises.results,
  }, { headers: { "Cache-Control": "public, max-age=10" } });
}
