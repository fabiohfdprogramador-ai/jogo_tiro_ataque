# Ataque: jogo de tiro online (estilo Counter-Strike)

Jogo de tiro em primeira pessoa que roda no navegador. TR contra CT no modo bomba, em dois mapas: **Bairro** (ruas do campo, bar, restaurante, praça, igreja e a rua de trás da igreja) e **Deserto**. O servidor é feito em Node.js e tem bots que completam os times.

## Como rodar

Você precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm run dev
```

Depois abra **http://localhost:3000** no Chrome, digite seu nome, escolha o mapa e o time e clique em **Jogar**. Quem entra primeiro escolhe o mapa da partida.

### Jogar com amigos
- **Mesma rede (Wi-Fi/casa):** ao iniciar, o terminal mostra o endereço "Na mesma rede", por exemplo `http://192.168.0.10:3000`. Seus amigos abrem esse endereço no navegador deles. Se não abrir, libere a porta 3000 no Firewall do Windows.
- **Pela internet:** é preciso hospedar o servidor (Render, Railway, uma VPS etc.) ou abrir a porta 3000 no roteador.

### Opções do servidor
| Variável | Padrão | O que faz |
|---|---|---|
| `PORT` | 3000 | Porta do servidor |
| `BOTS` | 4 | Tamanho de cada time completado com bots (0 desliga os bots) |
| `START_MONEY` | 800 | Dinheiro inicial (útil para testes) |
| `MAP` | bairro | Mapa inicial (`bairro` ou `deserto`) |
| `SO_BOTS` | — | `1` = partida só de bots (para testar) |
| `DEBUG` | — | `1` = mostra abates, rounds e posições no terminal |

Exemplo no Git Bash: `BOTS=2 npm run dev`

## Controles
| Tecla | Ação |
|---|---|
| W A S D | Andar |
| Espaço | Pular |
| C | Agachar / levantar (aperta uma vez) · Ctrl segurando também agacha |
| Shift (segurar) | Correr |
| Mouse | Mirar · botão esquerdo atira |
| Botão direito (segurar) | Mirar pela mira da arma · na AWP, luneta (2 níveis de zoom) |
| R | Recarregar |
| 1 / 2 / 3, roda do mouse, Q | Trocar de arma |
| 4 | AWP |
| 5 | Granadas (aperte 5 de novo para trocar entre explosiva, luz e fumaça) · clique lança |
| F (segurar) | Plantar a bomba (TR no bombsite) ou desarmar (CT perto da bomba) |
| E | Pegar arma do chão (troca pela sua) |
| G | Largar a arma da mão |
| B | Loja (durante o tempo de compra) |
| Tab | Placar |
| Y | Chat |
| Esc | Menu (sensibilidade, volume, gráficos, trocar de time) |

## Regras
- Round de 1:55 com 5 segundos de preparação (só dá para comprar nos primeiros 20 segundos).
- Um TR recebe a bomba. Ele planta segurando **F** por 3 s no bombsite A (praça/igreja) ou B (lote ao lado do bar); depois de plantada, ela explode em 40 s.
- Os CT desarmam segurando **F** por 6 s perto da bomba. Se quem carrega morrer, a bomba cai e outro TR pode pegá-la passando por cima.
- Vence o round quem eliminar o time adversário, explodir a bomba (TR) ou desarmá-la (CT). Se o tempo acabar sem bomba plantada, os CT vencem.
- O primeiro time a ganhar 13 rounds vence a partida.
- Dinheiro como no CS: $800 no início, $3.250 por vitória, de $1.400 a $3.400 por derrota e recompensa por abate.
- Todo mundo começa cada vida com 200 de vida, faca, pistola, fuzil (AK-47 no TR, M4A1 no CT), AWP e uma granada de cada tipo.
- Granada explosiva causa dano em área; a de luz cega quem está olhando; a de fumaça cria uma nuvem que bloqueia a visão (também a dos bots).
- Quem morre deixa a arma no chão: qualquer jogador pode pegar com **E** (ou passando por cima, se o espaço estiver vazio).
- O dano é 40% menor que no CS, então os jogadores aguentam mais tiros.

## Armas
AK-47 (TR), M4A1 (CT), AWP com luneta, Desert Eagle, Glock-18 (TR), USP-S (CT), faca e granadas (explosiva, luz e fumaça). Também dá para comprar colete, capacete e granadas extras. As recargas são 20% mais rápidas que no CS.

## Estrutura
- `server/index.js`: servidor HTTP + WebSocket, rounds, economia, tiros (o servidor confere cada acerto) e bots
- `shared/`: mapa, física/colisão e tabela de armas (usados pelo servidor e pelo navegador)
- `client/`: jogo no navegador (Three.js): mapa 3D, armas em primeira pessoa, jogadores, efeitos, sons e HUD
- `preview/`: as cenas de prévia usadas para aprovar o visual

## Créditos dos sons
Os tiros da AK-47, M4A1, AWP, Desert Eagle e Glock são gravações reais da
[The Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library), em domínio público (CC0).
Detalhes em `client/sounds/CREDITOS.txt`.

## Créditos dos modelos 3D
As armas e os soldados são modelos gratuitos do Sketchfab com licença CC BY 4.0. Os autores estão listados
em `client/models/CREDITOS.txt` e na tela inicial do jogo (botão **Créditos**).
Os arquivos originais baixados ficam em `client/models/baixados/` (não são usados pelo jogo; o jogo usa as versões otimizadas).
Para otimizar novos modelos: `npx gltf-transform optimize entrada.glb saida.glb --texture-compress webp --texture-size 2048`.
