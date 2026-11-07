// O jogo roda em outro endereço (Render), então a API precisa aceitar chamadas de fora (CORS).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Chave",
  "Access-Control-Max-Age": "86400",
};

export async function onRequest({ request, next }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const res = await next();
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}
