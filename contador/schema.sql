-- Banco do contador (Cloudflare D1). Rodar uma vez:
--   npx wrangler d1 execute ataque-contador --remote --file=schema.sql

-- Quem está com o site aberto agora (cada aba manda um sinal a cada 30 s)
CREATE TABLE IF NOT EXISTS online (
  sid        TEXT PRIMARY KEY,   -- id aleatório da aba
  last_seen  INTEGER NOT NULL,   -- ms desde 1970
  estado     TEXT NOT NULL,      -- site | carregando | menu | partida
  mapa       TEXT,
  pais       TEXT
);
CREATE INDEX IF NOT EXISTS online_last_seen ON online(last_seen);

-- Cada entrada: visita (abriu o site), jogou (clicou em Jogar), partida (começou uma partida)
CREATE TABLE IF NOT EXISTS entradas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  quando     INTEGER NOT NULL,   -- ms desde 1970
  tipo       TEXT NOT NULL,
  sid        TEXT NOT NULL,
  visitante  TEXT NOT NULL,      -- id aleatório guardado no navegador (não é IP nem nome)
  pais       TEXT,               -- código do país (BR, PT...), vindo do Cloudflare
  regiao     TEXT,
  cidade     TEXT,
  origem     TEXT,               -- site de onde veio (google.com, discord.com...)
  mapa       TEXT
);
CREATE INDEX IF NOT EXISTS entradas_quando ON entradas(quando);
-- visita e "jogou" contam uma vez por aba; partidas podem ser várias
CREATE UNIQUE INDEX IF NOT EXISTS entradas_uma_por_aba ON entradas(sid, tipo) WHERE tipo IN ('visita', 'jogou');
