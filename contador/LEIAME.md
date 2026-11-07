# Contador de visitas do Ataque

O jogo continua no Render. Esta pasta é só o contador, no Cloudflare (Pages + banco D1):
- `client/contador.js` (no jogo) avisa o contador: abriu o site, clicou em Jogar, entrou na partida e "ainda online" a cada 30 s.
- O menu do jogo mostra "● N pessoas online".
- Painel privado: https://ataque-contador.pages.dev/painel.html (pede a chave `PAINEL_CHAVE`).

Guarda só um número aleatório do navegador e país/estado/cidade aproximados (do Cloudflare). O IP não é guardado.

## Atualizar o contador
Dentro desta pasta:
```
npx wrangler pages deploy
```

## Testar no PC
```
npx wrangler d1 execute ataque-contador --local --file=schema.sql
npx wrangler pages dev --port 8788
```
Com o jogo rodando em localhost, o `contador.js` usa http://localhost:8788. Para o painel local, crie `.dev.vars` com `PAINEL_CHAVE=teste-local`.
