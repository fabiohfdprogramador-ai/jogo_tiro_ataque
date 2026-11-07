// GET /api/painel — detalhes só para o dono (cabeçalho X-Chave igual à variável PAINEL_CHAVE).
const ONLINE_MS = 75000;

function igual(a, b) {   // comparação sem vazar o tamanho/tempo
  if (typeof a !== "string" || typeof b !== "string") return false;
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

export async function onRequestGet({ request, env }) {
  if (!env.PAINEL_CHAVE) {
    return Response.json({ erro: "Defina a variável PAINEL_CHAVE no Cloudflare para usar o painel." }, { status: 503 });
  }
  if (!igual(request.headers.get("X-Chave") || "", env.PAINEL_CHAVE)) {
    return Response.json({ erro: "Chave errada." }, { status: 401 });
  }
  const url = new URL(request.url);
  const dias = Math.min(365, Math.max(1, parseInt(url.searchParams.get("dias") || "30", 10) || 30));
  const desde = Date.now() - dias * 86400000;
  const db = env.DB;
  const [porDia, cidades, paises, origens, mapas, online] = await db.batch([
    db.prepare(
      `SELECT date(quando / 1000, 'unixepoch', '-3 hours') AS dia,
              COUNT(DISTINCT visitante) AS pessoas,
              SUM(tipo = 'visita') AS visitas, SUM(tipo = 'jogou') AS jogaram, SUM(tipo = 'partida') AS partidas
       FROM entradas WHERE quando > ?1 GROUP BY dia ORDER BY dia DESC`).bind(desde),
    db.prepare(
      `SELECT pais, regiao, cidade, COUNT(DISTINCT visitante) AS pessoas, SUM(tipo = 'partida') AS partidas
       FROM entradas WHERE quando > ?1 GROUP BY pais, regiao, cidade ORDER BY pessoas DESC LIMIT 50`).bind(desde),
    db.prepare(
      `SELECT pais, COUNT(DISTINCT visitante) AS pessoas, SUM(tipo = 'partida') AS partidas
       FROM entradas WHERE quando > ?1 GROUP BY pais ORDER BY pessoas DESC`).bind(desde),
    db.prepare(
      `SELECT COALESCE(origem, '(direto)') AS origem, COUNT(DISTINCT visitante) AS pessoas
       FROM entradas WHERE quando > ?1 AND tipo = 'visita' GROUP BY 1 ORDER BY pessoas DESC LIMIT 20`).bind(desde),
    db.prepare(
      `SELECT mapa, COUNT(*) AS partidas FROM entradas
       WHERE quando > ?1 AND tipo = 'partida' GROUP BY mapa ORDER BY partidas DESC`).bind(desde),
    db.prepare(
      `SELECT estado, pais, COUNT(*) AS n FROM online WHERE last_seen > ?1 GROUP BY estado, pais ORDER BY n DESC`)
      .bind(Date.now() - ONLINE_MS),
  ]);
  return Response.json({
    dias,
    porDia: porDia.results, cidades: cidades.results, paises: paises.results,
    origens: origens.results, mapas: mapas.results, online: online.results,
  }, { headers: { "Cache-Control": "no-store" } });
}
