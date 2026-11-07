// Malha de navegação dos bots (estilo dos jogos de mundo aberto, como Far Cry):
// o mapa vira uma grade fina de células onde dá para pisar. O bot calcula a rota com A*,
// "estica" o caminho para andar em linha reta e fazer curvas suaves, prefere o meio da rua
// a raspar nas paredes e conhece os pontos de cobertura (atrás de muros, carros e caixas).
// Vale para os mapas planos (VR Divineia e Deserto). A Ilha do Fundão continua com a rede antiga.

const CELL = 0.75;          // tamanho da célula (m)
const MARGIN = 0.5;         // raio do corpo (0,35) + folga: o centro do bot não chega mais perto que isso da parede
const MAX_EXPAND = 15000;   // limite de células visitadas por busca (protege a CPU)

export function buildNav(boxes, { isSeeThrough = () => false } = {}) {
  const t0 = performance.now();
  // só o que bloqueia quem está andando no chão (o que fica acima da cabeça não conta)
  const solid = boxes.filter(b => b.min[1] < 1.7 && b.max[1] > 0.05);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const b of boxes) { minX = Math.min(minX, b.min[0]); maxX = Math.max(maxX, b.max[0]); minZ = Math.min(minZ, b.min[2]); maxZ = Math.max(maxZ, b.max[2]); }
  minX -= 2; minZ -= 2; maxX += 2; maxZ += 2;
  const W = Math.ceil((maxX - minX) / CELL), H = Math.ceil((maxZ - minZ) / CELL), N = W * H;
  const blocked = new Uint8Array(N);       // 1 = parede/objeto
  const door = new Int16Array(N).fill(-1); // índice da porta (passa só se ela estiver aberta)
  const doors = [];
  const cx = (i) => minX + (i % W + 0.5) * CELL, cz = (i) => minZ + (((i / W) | 0) + 0.5) * CELL;
  const cellOf = (x, z) => {
    const gx = Math.floor((x - minX) / CELL), gz = Math.floor((z - minZ) / CELL);
    return gx < 0 || gz < 0 || gx >= W || gz >= H ? -1 : gz * W + gx;
  };
  const mark = (b, fn) => {
    const x0 = Math.max(0, Math.floor((b.min[0] - MARGIN - minX) / CELL)), x1 = Math.min(W - 1, Math.floor((b.max[0] + MARGIN - minX) / CELL));
    const z0 = Math.max(0, Math.floor((b.min[2] - MARGIN - minZ) / CELL)), z1 = Math.min(H - 1, Math.floor((b.max[2] + MARGIN - minZ) / CELL));
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
      const x = minX + (gx + 0.5) * CELL, z = minZ + (gz + 0.5) * CELL;
      if (x > b.min[0] - MARGIN && x < b.max[0] + MARGIN && z > b.min[2] - MARGIN && z < b.max[2] + MARGIN) fn(gz * W + gx);
    }
  };
  for (const b of solid) {
    if (b.mat === 'door') { const k = doors.push(b) - 1; mark(b, (i) => { if (!blocked[i]) door[i] = k; }); }
    else mark(b, (i) => { blocked[i] = 1; door[i] = -1; });
  }
  const free = (i) => i >= 0 && !blocked[i] && (door[i] < 0 || doors[door[i]].open);

  // distância até a parede mais próxima (em células, até 3): o bot prefere o meio da rua
  const clear = new Uint8Array(N).fill(3);
  { let q = []; for (let i = 0; i < N; i++) if (blocked[i]) { clear[i] = 0; q.push(i); }
    for (let d = 1; d < 3 && q.length; d++) {
      const nq = [];
      for (const i of q) { const gx = i % W; for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j < 0 || j >= N || clear[j] <= d || (j === i - 1 && gx === 0) || (j === i + 1 && gx === W - 1)) continue;
        clear[j] = d; nq.push(j);
      } }
      q = nq;
    } }
  const PENAL = [0, 1.2, 0.35, 0];

  // célula livre mais perto de (x, z)
  function snap(x, z, maxR = 8) {
    const c = cellOf(x, z);
    if (free(c)) return c;
    const gx0 = Math.floor((x - minX) / CELL), gz0 = Math.floor((z - minZ) / CELL);
    let best = -1, bd = Infinity;
    for (let r = 1; r <= maxR && best < 0; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const gx = gx0 + dx, gz = gz0 + dz;
        if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
        const i = gz * W + gx;
        if (!free(i)) continue;
        const d = Math.hypot(cx(i) - x, cz(i) - z);
        if (d < bd) { bd = d; best = i; }
      }
    }
    return best;
  }

  // dá para andar em linha reta de a até b sem encostar em nada?
  function walkLine(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (CELL * 0.45));
    for (let k = 0; k <= n; k++) {
      const t = n ? k / n : 0;
      if (!free(cellOf(ax + (bx - ax) * t, az + (bz - az) * t))) return false;
    }
    return true;
  }

  // ---- A* com fila de prioridade (heap binário)
  const g = new Float32Array(N), from = new Int32Array(N), seen = new Uint32Array(N), shut = new Uint32Array(N);
  let stamp = 0;
  const heap = [], hf = [];
  function push(i, f) {
    heap.push(i); hf.push(f); let k = heap.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= hf[k]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; [hf[p], hf[k]] = [hf[k], hf[p]]; k = p; }
  }
  function pop() {
    const top = heap[0], li = heap.pop(), lf = hf.pop();
    if (heap.length) {
      heap[0] = li; hf[0] = lf; let k = 0;
      for (;;) { const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r;
        if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; }
    }
    return top;
  }
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

  // rota de (ax, az) até (bx, bz): lista de pontos [x, z] já esticada (sem o ponto de partida). null = sem caminho
  function findPath(ax, az, bx, bz) {
    const s = snap(ax, az, 4), e = snap(bx, bz);
    if (s < 0 || e < 0) return null;
    if (walkLine(ax, az, cx(e), cz(e))) return [[cx(e), cz(e)]];
    stamp++; heap.length = 0; hf.length = 0;
    const ex = e % W, ez = (e / W) | 0;
    const h = (i) => { const dx = Math.abs(i % W - ex), dz = Math.abs(((i / W) | 0) - ez); return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)); };
    g[s] = 0; from[s] = -1; seen[s] = stamp; push(s, h(s));
    let found = false, expanded = 0;
    while (heap.length) {
      const i = pop();
      if (shut[i] === stamp) continue;
      shut[i] = stamp;
      if (i === e) { found = true; break; }
      if (++expanded > MAX_EXPAND) break;
      const gx = i % W, gz = (i / W) | 0;
      for (const [dx, dz, c] of NB) {
        const nx = gx + dx, nz = gz + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const j = nz * W + nx;
        if (!free(j) || shut[j] === stamp) continue;
        if (dx && dz && (!free(gz * W + nx) || !free(nz * W + gx))) continue;   // não corta quina
        const ng = g[i] + c + PENAL[clear[j]];
        if (seen[j] === stamp && ng >= g[j]) continue;
        seen[j] = stamp; g[j] = ng; from[j] = i; push(j, ng + h(j));
      }
    }
    if (!found) return null;
    const cells = [];
    for (let i = e; i >= 0; i = from[i]) cells.push(i);
    cells.reverse();
    // estica: de cada ponto, pula para o mais longe que dá para alcançar em linha reta
    const out = [];
    let ax0 = ax, az0 = az, k = 0;
    while (k < cells.length - 1) {
      let j = Math.min(cells.length - 1, k + 40);
      while (j > k + 1 && !walkLine(ax0, az0, cx(cells[j]), cz(cells[j]))) j--;
      ax0 = cx(cells[j]); az0 = cz(cells[j]); out.push([ax0, az0]); k = j;
    }
    if (!out.length) out.push([cx(e), cz(e)]);
    return out;
  }

  // ---- pontos de cobertura: células livres coladas em algo que esconde (muro, carro, caixa)
  const covers = [];   // [x, z, alturaDoObstáculo]
  const BUCK = 8, buckets = new Map();
  const bkey = (x, z) => Math.floor(x / BUCK) + ',' + Math.floor(z / BUCK);
  {
    const tall = new Float32Array(N);   // altura do obstáculo que bloqueia a célula
    for (const b of solid) if (b.mat !== 'door' && !isSeeThrough(b) && b.max[1] >= 1.0) mark(b, (i) => { tall[i] = Math.max(tall[i], b.max[1]); });
    for (let i = 0; i < N; i++) {
      if (!free(i) || clear[i] !== 1) continue;
      const gx = i % W, gz = (i / W) | 0;
      if ((gx + gz) % 2) continue;   // metade das células basta
      let top = 0;
      for (const [dx, dz] of NB) { const nx = gx + dx, nz = gz + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H) top = Math.max(top, tall[nz * W + nx]); }
      if (top < 1.0) continue;
      const c = [cx(i), cz(i), top];
      covers.push(c);
      const k = bkey(c[0], c[1]);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(c);
    }
  }

  // cobertura perto de (x, z) que o inimigo (olho em threat) não enxerga. losFn(a, b) = true se a vê b
  function findCover(x, z, threat, losFn, maxDist = 12, maxTests = 14) {
    const cand = [];
    const r = Math.ceil(maxDist / BUCK);
    const bx = Math.floor(x / BUCK), bz = Math.floor(z / BUCK);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const list = buckets.get((bx + dx) + ',' + (bz + dz)); if (!list) continue;
      for (const c of list) { const d = Math.hypot(c[0] - x, c[1] - z); if (d <= maxDist) cand.push([d, c]); }
    }
    cand.sort((a, b) => a[0] - b[0]);
    const tdist = Math.hypot(threat[0] - x, threat[2] - z);
    let tests = 0;
    for (const [, c] of cand) {
      if (tests >= maxTests) break;
      if (Math.hypot(threat[0] - c[0], threat[2] - c[1]) < tdist - 3) continue;   // não corre na direção do inimigo
      tests++;
      const crouch = c[2] < 1.6, h = crouch ? 0.85 : 1.5;
      if (losFn(threat, [c[0], h, c[1]])) continue;
      return { p: [c[0], c[1]], crouch };
    }
    return null;
  }

  const ms = performance.now() - t0;
  return { W, H, cells: N, covers: covers.length, buildMs: ms, free, walkLine, findPath, findCover, snapPoint: (x, z) => { const i = snap(x, z); return i < 0 ? null : [cx(i), cz(i)]; } };
}
