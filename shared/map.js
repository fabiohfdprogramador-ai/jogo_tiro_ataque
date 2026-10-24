// Mapas do jogo. Compartilhado entre servidor e cliente.
// Unidades em metros. -z = norte (base CT), +z = sul (base TR).
// Cada caixa: { min:[x,y,z], max:[x,y,z], mat }   (mat 'house' tem também 'color' e 'roof')

// ================================================================ Deserto (inspirado na Dust2)
function buildDeserto() {
  const boxes = [];
  const block = (x0, z0, x1, z1, h, mat, y0 = 0) => boxes.push({ min: [x0, y0, z0], max: [x1, y0 + h, z1], mat });
  const crate = (cx, cz, s = 1.0, y0 = 0) => boxes.push({ min: [cx - s / 2, y0, cz - s / 2], max: [cx + s / 2, y0 + s, cz + s / 2], mat: 'crate' });
  const barrel = (cx, cz) => boxes.push({ min: [cx - 0.42, 0, cz - 0.42], max: [cx + 0.42, 1.25, cz + 0.42], mat: 'barrel' });

  // paredes externas
  block(-42, -52, 42, -50, 9, 'wallB'); block(-42, 50, 42, 52, 9, 'wallB');
  block(-42, -50, -40, 50, 9, 'wallA'); block(40, -50, 42, 50, 9, 'wallA');
  // prédios que separam os caminhos
  block(-26, -22, -12, 34, 7, 'wallA'); block(-4, -20, 14, 34, 8, 'wallB'); block(24, -4, 40, 34, 7, 'wallA');
  // portas do Long A
  block(-40, 8, -34, 10, 7, 'wallB'); block(-30, 8, -26, 10, 7, 'wallB'); block(-34, 8, -30, 10, 3.8, 'wallB', 3.2);
  // portas do Meio
  block(-12, -8, -10, -6, 6, 'wallA'); block(-6, -8, -4, -6, 6, 'wallA'); block(-10, -8, -6, -6, 2.6, 'wallA', 3.4);
  // entrada do Túnel B
  block(14, 4, 17, 6, 4, 'wallB'); block(21, 4, 24, 6, 4, 'wallB'); block(17, 4, 21, 6, 1, 'wallB', 3);
  // coberturas
  block(-4, -34, 6, -28, 3, 'wallA'); block(-8, 38, -5, 40, 1.8, 'wallA'); block(-40, -40, -34, -38, 2.2, 'wallB');
  // caixas
  crate(-37, 0, 1.6); crate(-29, -12);
  crate(-34, -30, 1.6); crate(-32.2, -30); crate(-34, -30, 1.0, 1.6);
  crate(-20, -30, 1.6); crate(-20, -28.2); crate(-28, -42, 1.6);
  crate(-5, 14); crate(-11, 24, 1.6);
  crate(20, -16, 1.6); crate(21.8, -16); crate(20, -16, 1.0, 1.6);
  crate(30, -24, 1.6); crate(34, -12, 1.6); crate(28, -8);
  crate(14, -44, 1.6);
  crate(-14, 44, 1.6); crate(16, 40); crate(0, 46);
  barrel(36, -30); barrel(36.9, -31); barrel(-38.5, 20);

  return {
    id: 'deserto', name: 'Deserto',
    size: { minX: -40, maxX: 40, minZ: -50, maxZ: 50 },
    boxes,
    spawns: {
      T: [[-8, 47], [-4, 48], [4, 48], [8, 47], [-11, 43], [11, 44], [-3, 44], [3, 43], [6, 44], [-6, 45]],
      CT: [[2, -46], [6, -47], [10, -47], [-2, -45], [4, -42], [10, -40], [-6, -42], [16, -40], [0, -40], [12, -37]],
    },
    sites: { A: { min: [-40, -50], max: [-12, -22] }, B: { min: [14, -34], max: [40, -4] } },
    nodes: {
      T0: [0, 44], T1: [-20, 42], T2: [19, 42],
      L1: [-33, 30], L2: [-32, 9], L3: [-33, -10], A1: [-30, -30], A2: [-20, -36],
      M0: [-8, 30], M1: [-8, 10], M2: [-8, -7], M3: [-8, -26],
      Bt0: [19, 30], Bt1: [19, 5], B1: [25, -12], B2: [22, -28],
      C0: [8, -44], C1: [-10, -40], C2: [16, -38],
    },
    links: [
      ['T0', 'T1'], ['T0', 'T2'], ['T0', 'M0'], ['T1', 'L1'], ['T1', 'M0'],
      ['L1', 'L2'], ['L2', 'L3'], ['L3', 'A1'], ['A1', 'A2'], ['A2', 'C1'],
      ['M0', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'C1'], ['M3', 'A2'],
      ['T2', 'Bt0'], ['Bt0', 'Bt1'], ['Bt1', 'B1'], ['B1', 'B2'], ['B2', 'C2'],
      ['C2', 'C0'], ['C0', 'C1'],
    ],
    // planos dos bots: TR atacam por um destes caminhos; CT seguram um destes pontos
    botT: [['T1', 'L1', 'L2', 'L3', 'A1'], ['M0', 'M1', 'M2', 'M3', 'A2'], ['T2', 'Bt0', 'Bt1', 'B1', 'B2']],
    botCT: ['A1', 'B1', 'M2', 'A2', 'B2'], botPush: ['T0', 'T1', 'T2'],
    staging: { A: ['L2', 'M2'], B: ['Bt1'] },
  };
}

// ================================================================ Bairro (vila da praia)
// Vila Residencial, montada pelas fotos do Street View e pela vista de satélite (de norte para sul):
//  - campo de futebol (base CT) e a Rua Cravos colada nele;
//  - um quarteirão só entre a Cravos e a Rua das Margaridas, da Rosas (oeste) até a Papoulas (leste): Assembleia
//    na esquina da Rosas, quadra de areia, a ruela estreita que liga a Cravos à Margaridas, a Arena coberta e,
//    viradas para a Margaridas, as lojas (bar e mercearia, mercadinho, associação de moradores, lanchonete, bar);
//  - a Margaridas chega na Papoulas junto da praça; do outro lado dela, quitanda e a Acácias descendo;
//  - praça com parquinho e a igreja azul (bombsite A): Acácias à direita, Papoulas à esquerda (lojinhas) e
//    Vitória Régia nos fundos (base TR), que dá num muro de madeira e mato do lado sul;
//  - a Papoulas vai do campo até o fim, onde termina num portão de madeira; do lado leste dela só tem mato.
// Coordenadas de planta em "px" (0,25 m cada), ruas retas na horizontal ou vertical.
const PX = 0.25, CX = 205, CY = 520;
const W = (x, y) => [(x - CX) * PX, (y - CY) * PX];

const B_STREETS = [   // [x0, y0, x1, y1, largura]
  [81, 304, 302, 304, 24],    // Rua Cravos (colada no campo)
  [81, 306, 81, 476, 24],     // Rua das Rosas (lado oeste do quarteirão da Assembleia)
  [81, 476, 302, 476, 24],    // Rua das Margaridas (embaixo do quarteirão, chega na praça)
  [205, 488, 205, 728, 28],   // Rua Acácias (lado direito da igreja)
  [302, 306, 302, 730, 28],   // Rua Papoulas (lado esquerdo da igreja, termina num portão)
  [205, 581, 302, 581, 22],   // Praça da Vila dos Funcionários (rua na frente da igreja)
  [161, 728, 302, 728, 26],   // Rua Vitória Régia (fundos da igreja, base TR)
];
const B_AREAS = {   // áreas sem casas geradas (o que tem nelas é colocado à mão)
  campo: [105, 200, 285, 288],
  assembleia: [93, 316, 141, 370],   // Igreja Assembleia de Deus (na esquina da Rosas, de frente para o campo)
  areia: [141, 320, 177, 366],       // quadra de areia cercada (bombsite B)
  trilha: [179, 316, 189, 464],      // ruela estreita e reta da Cravos até a Margaridas, que termina na quitanda verde
  arena: [189, 316, 235, 370],       // quadra coberta com teto em arco (do outro lado da ruela)
  gram: [141, 370, 177, 404],        // gramado com carro atrás da quadra de areia
  blocoW: [93, 370, 179, 464],       // lojas e casas entre a Assembleia e a Margaridas (oeste da ruela)
  blocoN: [235, 316, 288, 370],      // casas e o bar e restaurante entre a Arena e a Papoulas
  blocoE: [189, 370, 288, 464],      // casas, lanchonete e bar da esquina (leste da ruela)
  margS: [57, 488, 191, 520],        // do outro lado da Margaridas: quitanda verde (de frente para a ruela) e sobrado bege
  praca: [221, 488, 288, 568],
  parq: [223, 492, 238, 540],        // parquinho (dentro da praça)
  igreja: [219, 592, 288, 715],      // quarteirão inteiro da igreja
  lojas: [318, 592, 336, 715],       // lojinhas do outro lado da Rua Papoulas
  mato: [318, 292, 338, 590],        // mato e cerca de madeira do lado leste da Papoulas
  mato2: [289, 196, 338, 290],       // mato ao lado do campo
  fimPap: [318, 716, 338, 744],      // fim da Papoulas: barraca listrada e portão de madeira
};
const B_BOUNDS = [57, 196, 338, 744];

function buildBairro() {
  const boxes = [];
  const add = (x0, z0, x1, z1, h, mat, extra = {}, y0 = 0) => boxes.push({ min: [x0, y0, z0], max: [x1, y0 + h, z1], mat, ...extra });
  const addPx = (r, h, mat, extra) => { const a = W(r[0], r[1]), b = W(r[2], r[3]); add(a[0], a[1], b[0], b[1], h, mat, extra); };
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const streetRect = (s) => [Math.min(s[0], s[2]) - s[4] / 2, Math.min(s[1], s[3]) - s[4] / 2, Math.max(s[0], s[2]) + s[4] / 2, Math.max(s[1], s[3]) + s[4] / 2];
  const inRect = (x, y, r, pad = 0) => x >= r[0] - pad && x <= r[2] + pad && y >= r[1] - pad && y <= r[3] + pad;
  const free = (x, y) => {
    if (!inRect(x, y, B_BOUNDS)) return false;
    for (const s of B_STREETS) if (inRect(x, y, streetRect(s), 2)) return false;
    for (const a of Object.values(B_AREAS)) if (inRect(x, y, a, 3)) return false;
    return true;
  };
  // casas: preenche os quarteirões (grade de 1 m) com lotes de 5 a 10 m de frente
  const a0 = W(B_BOUNDS[0], B_BOUNDS[1]), a1 = W(B_BOUNDS[2], B_BOUNDS[3]);
  const nx = Math.ceil(a1[0] - a0[0]), nz = Math.ceil(a1[1] - a0[1]);
  const cell = new Uint8Array(nx * nz), used = new Uint8Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const px = (a0[0] + ix + 0.5) / PX + CX, py = (a0[1] + iz + 0.5) / PX + CY;
    cell[iz * nx + ix] = free(px, py) ? 1 : 0;
  }
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    if (!cell[i] || used[i]) continue;
    const wantW = 5 + ((rnd() * 6) | 0);
    let w = 0;
    while (ix + w < nx && w < wantW && cell[iz * nx + ix + w] && !used[iz * nx + ix + w]) w++;
    const wantD = 7 + ((rnd() * 6) | 0);
    let d = 1;
    while (iz + d < nz && d < wantD) {
      let ok = true;
      for (let k = 0; k < w; k++) { const j = (iz + d) * nx + ix + k; if (!cell[j] || used[j]) { ok = false; break; } }
      if (!ok) break;
      d++;
    }
    for (let dz = 0; dz < d; dz++) for (let k = 0; k < w; k++) used[(iz + dz) * nx + ix + k] = 1;
    if (w < 2 || d < 2) continue;
    const floors = rnd() < 0.45 ? 1 : rnd() < 0.8 ? 2 : 3;
    const h = 3.1 * floors + rnd() * 0.3;
    add(a0[0] + ix, a0[1] + iz, a0[0] + ix + w, a0[1] + iz + d, h, 'house',
      { color: (rnd() * 1000) | 0, roof: floors === 1 && rnd() < 0.7 ? 1 : 0, brick: rnd() < 0.22 ? 1 : 0 });
  }
  // muro em volta do mapa (fora da vista: as casas de fora cobrem)
  const [x0, z0] = W(B_BOUNDS[0], B_BOUNDS[1]), [x1, z1] = W(B_BOUNDS[2], B_BOUNDS[3]);
  for (const [ax, az, bx, bz] of [[x0 - 1, z0 - 1, x1 + 1, z0], [x0 - 1, z1, x1 + 1, z1 + 1], [x0 - 1, z0, x0, z1], [x1, z0, x1 + 1, z1]]) add(ax, az, bx, bz, 9, 'invisible');

  // do outro lado da Acácias (em frente à igreja): sobrados amarelo, roxo e de tijolo, como nas fotos
  const ACACIAS_HOUSES = [{ hex: 0xf0c64a, floors: 3 }, { brick: 1, floors: 3 }, { hex: 0x7b5cc0, floors: 2 }, { hex: 0xefe9da, floors: 2 }, { hex: 0xe8b84a, floors: 3 }];
  let ai = 0;
  for (const b of boxes) {
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    if (b.mat !== 'house' || cx < -22 || cx > -3 || cz < -8 || cz > 50) continue;
    const s = ACACIAS_HOUSES[ai++ % ACACIAS_HOUSES.length];
    b.max[1] = 3.1 * s.floors + 0.2; b.roof = 0; b.brick = s.brick || 0; if (s.hex) b.hex = s.hex;
  }

  // ---- quarteirão da igreja (bombsite A). Medidas em metros a partir das bordas do quarteirão.
  const [IX0, IZ0] = W(B_AREAS.igreja[0], B_AREAS.igreja[1]), [IX1, IZ1] = W(B_AREAS.igreja[2], B_AREAS.igreja[3]);   // x 3.5..20.75, z 18..48.75
  const FZ = IZ0 + 6;            // linha da fachada (o pátio de concreto fica na frente)
  const NX0 = IX0 + 5.1, NX1 = NX0 + 9, TX1 = NX1 + 2.6;   // nave e torre
  add(IX0 + 0.3, FZ + 0.4, NX0, FZ + 6.2, 4.3, 'church', { part: 'anexo' });       // anexo (lado da Acácias)
  add(NX0, FZ, NX1, IZ0 + 22.5, 5.6, 'church', { part: 'nave' });                  // nave com o frontão
  add(NX1, FZ - 0.4, TX1, FZ + 2.2, 12.2, 'church', { part: 'torre' });            // torre do sino (lado da Papoulas)
  add(NX1, FZ + 2.2, TX1 - 0.2, IZ0 + 18.5, 4.2, 'church', { part: 'galeria' });   // galeria com arcos (lado da Papoulas)
  // muros brancos: Papoulas (da torre até o sobrado) e Acácias (com o portão azul que mostra o quintal)
  add(IX1 - 0.3, FZ + 2.2, IX1, IZ0 + 25, 2.2, 'muro');
  add(IX0, FZ + 6.2, IX0 + 0.3, FZ + 9.2, 2.6, 'muro');
  add(IX0 + 0.05, FZ + 9.2, IX0 + 0.25, FZ + 12.2, 2.4, 'gate');
  add(IX0, FZ + 12.2, IX0 + 0.3, IZ0 + 21, 2.6, 'muro');
  // muro de tijolo ainda sendo levantado ao lado da torre, com tijolos empilhados
  add(IX1 - 0.35, IZ0 + 1.6, IX1 - 0.05, FZ + 2.2, 2.1, 'brickwall', { steps: 1 });
  add(IX1 - 1.4, FZ - 1.4, IX1 - 0.55, FZ - 0.6, 0.8, 'bricks');
  // casas brancas dos fundos (reboco velho com mofo): térrea na Acácias, sobrado de esquina e o sobrado da Papoulas
  add(IX0, IZ0 + 21, NX0, IZ0 + 26.5, 3.3, 'house', { hex: 0xeeede6, grime: 1, roof: 0, brick: 0, color: 0 });
  // esquina da Acácias com a Vitória Régia: casa térrea comprida de telha ondulada, com o quartinho das caixas d'água
  add(IX0, IZ0 + 26.5, IX0 + 9.5, IZ1, 3.3, 'house', { hex: 0xefeee8, grime: 1, roof: 0, brick: 0, color: 0, zinc: 1 });
  add(IX0 + 6.4, IZ0 + 27.2, IX0 + 9.3, IZ1 - 0.8, 5.6, 'house', { hex: 0xd9d8d0, grime: 1, roof: 0, brick: 0, color: 0 });
  add(IX0 + 9.5, IZ0 + 25, IX1, IZ1, 6.3, 'house', { hex: 0xecebe4, grime: 1, roof: 0, brick: 0, color: 0 });

  // ---- quarteirão da Assembleia (foto 4: na esquina da Rosas, de frente para o campo do outro lado da Cravos)
  const [AX0, AZ0] = W(B_AREAS.assembleia[0], B_AREAS.assembleia[1]), [AX1, AZ1] = W(B_AREAS.assembleia[2], B_AREAS.assembleia[3]);
  add(AX0, AZ0, AX1 - 0.2, AZ1, 7.4, 'assembleia');
  // quadra de areia (fotos 6 e 7): mureta baixa e alambrado com portão para a Cravos e para a ruela
  const [QX0, QZ0] = W(B_AREAS.areia[0], B_AREAS.areia[1]), [QX1, QZ1] = W(B_AREAS.areia[2], B_AREAS.areia[3]);
  // ---- Arena (fotos 5 e 6): muro branco com o escudo pintado, cobogó vermelho e teto em arco por cima
  const [RX0, RZ0] = W(B_AREAS.arena[0], B_AREAS.arena[1]), [RX1, RZ1] = W(B_AREAS.arena[2], B_AREAS.arena[3]);
  add(RX0, RZ0, RX1, RZ1, 7.0, 'arena');

  // ---- quarteirão entre a Cravos e a Margaridas (vista de satélite + fotos): a ruela é reta e termina na quitanda verde
  const shopH = (x0, z0, x1, z1, h, extra) => add(x0, z0, x1, z1, h, 'house', { roof: 0, brick: 0, color: 0, ...extra });
  // oeste da ruela (x -28..-6.5): lojas viradas para a Margaridas e, encostada na ruela, a associação comprida de janelas azuis
  shopH(-28, -21, -22, -14, 3.3, { hex: 0xf0efe8, shop: 1, sign: 'mercearia', zinc: 1 });                    // bar e mercearia na esquina da Rosas
  shopH(-22, -21, -17, -14, 3.4, { hex: 0xf2f1ec, shop: 1, tiles: 1, roofTile: 1, sign: 'mercadinho' });       // mercadinho (azulejo azul)
  shopH(-17, -21, -12, -14, 3.4, { hex: 0xf2e6c8, shop: 1, sign: 'cantinho', zinc: 1 });                     // lanchonete Cantinho
  shopH(-12, -29, -6.5, -14, 3.4, { hex: 0xf2f1ec, tiles: 1, sign: 'associacao', zinc: 1 });                  // associação de moradores, ao longo da ruela
  shopH(-28, -29, -21, -21, 12.4, { hex: 0xcfdc92 });                                                         // prédio verde de 4 andares
  shopH(-21, -29, -12, -21, 3.3, { color: 318 });
  shopH(-28, -37.5, -22, -29, 6.2, { color: 248 });
  shopH(-22, -37.5, -16, -29, 3.3, { color: 905, roof: 1 });
  // entre a Arena e a Papoulas: casa e o bar e restaurante
  shopH(7.5, -51, 15, -37.5, 6.0, { color: 412 });
  shopH(15, -51, 20.75, -42, 3.6, { hex: 0xeeeae0, shop: 1, sign: 'restaurante', zinc: 1 });                 // bar e restaurante, virado para a Papoulas
  shopH(15, -42, 20.75, -37.5, 3.3, { color: 57, zinc: 1 });
  // leste da ruela (x -4..20.75): lanchonete vermelha colada na ruela, casas e o bar cinza na esquina da Papoulas
  shopH(-4, -20.5, 0.1, -14, 6.2, { hex: 0xd26060, shop: 1, sign: 'lanches' });
  shopH(0.1, -20.5, 6, -14, 6.2, { color: 77 });
  shopH(6, -20.5, 11, -14, 3.3, { color: 133, zinc: 1 });
  shopH(11, -20.5, 15.6, -14, 6.2, { hex: 0xe6dccb });
  shopH(15.6, -20.5, 20.75, -14, 3.6, { hex: 0x9aa0a8, shop: 1, sign: 'bar' });
  shopH(-4, -29, 3, -20.5, 9.3, { hex: 0xa8acb0 });                                                          // sobrado cinza de 3 andares ao lado da ruela
  shopH(3, -29, 12, -20.5, 6.0, { color: 701 });
  shopH(12, -29, 20.75, -20.5, 3.3, { color: 905, zinc: 1 });
  shopH(-4, -37.5, 7.5, -29, 6.2, { color: 318 });
  shopH(7.5, -37.5, 20.75, -29, 3.3, { color: 248, zinc: 1 });
  // do outro lado da Margaridas: quitanda verde bem na saída da ruela, sobrado bege atrás e o bar com mesinhas
  const [SX0, SZ0] = W(B_AREAS.margS[0], B_AREAS.margS[1]), [SX1] = W(B_AREAS.margS[2], 0);   // x -37..-3.5, z -8..0
  shopH(SX1 - 3.8, SZ0, SX1, SZ0 + 3.8, 2.9, { hex: 0x9fd8ae, green: 1 });
  shopH(SX1 - 3.8, SZ0 + 3.8, SX1, SZ0 + 8.5, 9.3, { hex: 0xe2d6bc });
  shopH(SX1 - 9.5, SZ0, SX1 - 3.8, SZ0 + 5, 3.3, { hex: 0xf0efe8, shop: 1, zinc: 1, sign: 'bar2' });
  shopH(SX1 - 9.5, SZ0 + 5, SX1 - 3.8, SZ0 + 8.5, 3.3, { color: 701, roof: 1 });
  shopH(SX0, SZ0, SX1 - 9.5, SZ0 + 8.5, 6.2, { color: 77 });

  // ---- coberturas: caixas, muretas, carrinhos etc. (sólidas)
  const props = [];
  const prop = (x, z, sx, sz, h, mat, extra = {}) => { add(x - sx / 2, z - sz / 2, x + sx / 2, z + sz / 2, h, mat, extra); };
  // campo: traves (finas) nas pontas compridas e alambrado com portões
  const c0 = W(B_AREAS.campo[0], B_AREAS.campo[1]), c1 = W(B_AREAS.campo[2], B_AREAS.campo[3]);
  const cmz = (c0[1] + c1[1]) / 2;
  for (const xx of [c0[0] + 1.2, c1[0] - 1.2]) for (const sz of [-1, 1]) prop(xx, cmz + sz * 2.5, 0.12, 0.12, 2.0, 'post');
  const fence = (ax, az, bx, bz, gates) => {   // gates: lista de [centro (0..1), largura m]
    const L = Math.hypot(bx - ax, bz - az), horiz = Math.abs(bz - az) < 0.01;
    let cuts = [[0, 0]];
    for (const [g, gw] of gates) cuts.push([g * L - gw / 2, g * L + gw / 2]);
    cuts.push([L, L]); cuts.sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < cuts.length - 1; i++) {
      const s = cuts[i][1], e = cuts[i + 1][0];
      if (e - s < 0.3) continue;
      if (horiz) add(ax + Math.sign(bx - ax) * s, az - 0.05, ax + Math.sign(bx - ax) * e, az + 0.05, 3, 'fence');
      else add(ax - 0.05, az + Math.sign(bz - az) * s, ax + 0.05, az + Math.sign(bz - az) * e, 3, 'fence');
    }
  };
  fence(c0[0], c0[1], c1[0], c0[1], []);
  const CW = c1[0] - c0[0];
  fence(c0[0], c1[1], c1[0], c1[1], [[(-12 - c0[0]) / CW, 4], [(8 - c0[0]) / CW, 4]]);   // portões para a Cravos (um na frente da quadra de areia)
  fence(c0[0], c0[1], c0[0], c1[1], []);
  fence(c1[0], c0[1], c1[0], c1[1], []);
  // quadra de areia: alambrado com portão para a Cravos (norte) e para a ruela (leste), mureta baixa com vãos nos portões
  const gx = (QX1 - QX0) * 0.45;
  fence(QX0, QZ1, QX1, QZ1, []);
  fence(QX1, QZ0, QX1, QZ1, [[(-44 - QZ0) / (QZ1 - QZ0), 2.4]]);
  fence(QX0, QZ0, QX1, QZ0, [[0.45, 2.4]]);
  fence(QX0 + 0.15, QZ0, QX0 + 0.15, QZ1, []);
  add(QX0 + 0.2, QZ1 - 0.35, QX1 - 0.1, QZ1 - 0.1, 0.35, 'curb'); add(QX0 + 0.2, QZ0 + 0.1, QX0 + 0.45, QZ1 - 0.1, 0.35, 'curb');
  add(QX0 + 0.2, QZ0 + 0.1, QX0 + gx - 1.4, QZ0 + 0.35, 0.35, 'curb'); add(QX0 + gx + 1.3, QZ0 + 0.1, QX1 - 0.1, QZ0 + 0.35, 0.35, 'curb');
  add(QX1 - 0.35, QZ0 + 0.1, QX1 - 0.1, -45.3, 0.35, 'curb'); add(QX1 - 0.35, -42.7, QX1 - 0.1, QZ1 - 0.1, 0.35, 'curb');
  prop((QX0 + QX1) / 2 - 3.6, (QZ0 + QZ1) / 2, 0.12, 0.12, 2.4, 'post'); prop((QX0 + QX1) / 2 + 3.6, (QZ0 + QZ1) / 2, 0.12, 0.12, 2.4, 'post');   // postes da rede
  // cerca de madeira separando a rua do mato (leste da Papoulas e ao lado do campo)
  const [MX0, MZ0] = W(B_AREAS.mato[0], B_AREAS.mato[1]), [, MZ1] = W(0, B_AREAS.mato[3]);
  add(MX0 - 0.1, MZ0, MX0 + 0.05, MZ1 + 1.2, 1.25, 'woodfence');
  add(c1[0] + 0.1, c1[1] + 0.9, MX0 + 0.05, c1[1] + 1.05, 1.25, 'woodfence');
  // praça: canteiros, bancos, brinquedos (parquinho com grade baixa)
  const q0 = W(B_AREAS.parq[0], B_AREAS.parq[1]), q1 = W(B_AREAS.parq[2], B_AREAS.parq[3]);
  const qmx = (q0[0] + q1[0]) / 2;
  prop(qmx, q0[1] + 2.8, 1.6, 3.4, 2.3, 'swing');               // balanço
  prop(qmx, q1[1] - 3.2, 1.1, 2.6, 2.0, 'slide');               // escorregador
  const pp = (x, y, sx, sz, h, mat, extra) => { const [cx, cz] = W(x, y); prop(cx, cz, sx, sz, h, mat, extra); };
  pp(275, 504, 1.2, 1.2, 0.8, 'table');       // mesa de concreto
  pp(226, 554, 0.5, 1.8, 0.9, 'bench');
  pp(226, 562, 0.5, 1.8, 0.9, 'bench');
  pp(232, 548, 2.2, 2.2, 0.5, 'planter');
  pp(284, 560, 1.2, 1.2, 1.9, 'shrine');      // oratório
  pp(265, 536, 4.2, 3.6, 0.5, 'stage');       // palanque com degraus vermelhos (foto 10)
  // coqueiros da praça e do pátio da igreja (o tronco é sólido; as folhas ficam acima da cabeça)
  for (const [x, y, h] of [[275, 492, 8.5], [283, 528, 10], [222, 548, 9], [253, 565, 8], [251, 522, 9.5], [285, 540, 7.5]]) pp(x, y, 0.42, 0.42, 3, 'palm', { ph: h });
  // parquinho: grade baixa (só o desenho; dá para pular por cima)
  add(q0[0], q0[1], q1[0], q0[1] + 0.1, 1.1, 'lowfence');
  add(q0[0], q1[1] - 0.1, q1[0], q1[1], 1.1, 'lowfence');

  // pátio da igreja: frades (pilaretes brancos), banco azul, lixeira, placas de contramão e o coqueiro
  for (let k = 0; k < 4; k++) prop(IX0 + 0.9 + k * 1.3, IZ0 + 0.9, 0.22, 0.22, 0.75, 'bollard');
  prop(IX1 - 1.35, IZ0 + 2.4, 0.42, 0.42, 3, 'palm', { ph: 7 });
  prop(IX1 - 2.8, IZ0 + 2.0, 1.8, 0.5, 0.9, 'bench', { blue: 1 });
  prop(NX0 + 4.6, FZ - 2.5, 0.5, 0.5, 0.95, 'trash');
  prop(NX0 + 6.9, FZ - 1.2, 0.12, 0.12, 2.6, 'sign');
  prop(IX1 - 0.6, IZ0 + 1.2, 0.12, 0.12, 2.6, 'sign');

  // carros estacionados (cobertura): rente às calçadas, sem fechar o meio da rua
  const car = (x, z, alongZ, hex, kind = 'car') => {
    const L = kind === 'kombi' ? 4.3 : 4.1, Wd = kind === 'kombi' ? 1.75 : 1.7, h = kind === 'kombi' ? 1.95 : 1.45;
    prop(x, z, alongZ ? Wd : L, alongZ ? L : Wd, h, 'car', { hex, kind, dir: alongZ ? (x > 10 ? 1 : -1) : 0 });
  };
  car(1.3, FZ + 7.5, true, 0x2e4a40); car(1.3, FZ + 12.6, true, 0x5c6064); car(1.3, FZ + 18.2, true, 0xb8bcc0);   // Acácias (muro da igreja)
  car(22.9, IZ0 + 4, true, 0xc9b98a); car(22.9, IZ0 + 19.5, true, 0x6a6460); car(22.9, IZ0 + 24.6, true, 0xb4b8bc); car(22.9, IZ0 + 29.2, true, 0x7ab0d8);   // Papoulas (lado da igreja)
  car(25.6, IZ0 + 8.5, true, 0xb8bab8); car(25.6, IZ0 + 13.6, true, 0xf2f0ea, 'kombi');                                // Papoulas (lado das lojas)
  car(17.5, IZ1 + 1.95, false, 0x2448a8); car(12.4, IZ1 + 1.95, false, 0xeeeeee); car(7.3, IZ1 + 1.95, false, 0x6a6460);   // Vitória Régia (foto 3)
  car(25.6, -22, true, 0x30343a);                                                                                       // Papoulas, perto da rua da praça
  car(-22, -52.7, false, 0xc8ccd0, 'kombi'); car(3, -52.7, false, 0xf2f2f0);                                         // Cravos: furgão na Assembleia, picape na Arena
  car(-11.5, -34.6, false, 0xf4f4f2);                                                                                   // picape no gramado atrás da quadra

  // lojinhas do outro lado da Papoulas (portas de enrolar, barraca de palha, toldo azul)
  const [LX0] = W(B_AREAS.lojas[0], 0), [LX1] = W(B_AREAS.lojas[2], 0);
  for (const [z0, z1, extra] of [[0, 5, { hex: 0xc8302a }], [5, 8.6, { hex: 0xeeeeea }], [8.6, 12.6, { thatch: 1 }], [12.6, 17.6, { hex: 0xc8302a }],
    [17.6, 21.4, { hex: 0x9a9da2 }], [21.4, 26, { hex: 0xd03a30, awning: 1 }], [26, 30.5, { hex: 0xc8302a }]]) {
    add(LX0, IZ0 + 0.3 + z0, LX1, IZ0 + 0.3 + z1, extra.thatch ? 2.8 : 3.2, 'shop', extra);
  }

  // enfeites sem colisão: cones, árvore grande do quintal e o guindaste do estaleiro lá no fundo
  const decor = [
    { type: 'cone', x: 2.7, z: IZ0 - 0.6 }, { type: 'cone', x: 26.5, z: IZ0 + 11 },
    { type: 'bigtree', x: IX1 - 1.6, z: IZ0 + 21.2, s: 1.9 }, { type: 'bigtree', x: NX0 + 1.8, z: IZ0 + 23.5, s: 1.3 },
    { type: 'yardtree', x: IX0 + 2.6, z: FZ + 10.5, s: 1.2 },
    { type: 'crane', x: -34, z: 92 },
    { type: 'banana', x: -12, z: -57.6 }, { type: 'banana', x: -14.5, z: -57.4 },                     // bananeira na frente do campo (foto 4)
    { type: 'woodgate', x: 24.25, z: 55.7 },                                                          // fim da Papoulas (foto 1)
    { type: 'tent', x: 30.4, z: 52.2 },                                                               // barraca listrada na esquina (foto 3)
    { type: 'silo', x: -34, z: -118 }, { type: 'silo', x: -27, z: -121 }, { type: 'silo', x: -20, z: -118 },   // silos da fábrica atrás do campo
    { type: 'factory', x0: -80, x1: -38, z0: -112, z1: -98, h: 10 },
  ];
  for (let z = MZ0 + 2; z < MZ1; z += 6.5) decor.push({ type: 'bigtree', x: 31 + Math.sin(z) * 1.2, z, s: 1.3 + (Math.cos(z * 1.7) + 1) * 0.35 });
  for (let x = 22; x < 33; x += 6) decor.push({ type: 'bigtree', x, z: -62 - (x % 4), s: 1.5 });
  // mesinhas de plástico dos bares (fotos 9 e 10) e caixotes da quitanda
  for (const x of [-26, -23.8]) prop(x, -12.95, 0.9, 0.9, 0.75, 'ptable');     // bar e mercearia
  for (const x of [-11.6, -9.2]) prop(x, -9.0, 0.9, 0.9, 0.75, 'ptable');      // bar do outro lado da Margaridas
  prop(-2.9, -6.2, 0.8, 0.8, 0.8, 'crate'); prop(-2.9, -5.3, 0.6, 0.6, 0.6, 'crate');   // caixotes da quitanda
  // caixas nas ruas (cobertura)
  for (const [x, y, s] of [[291, 450, 1.4], [313, 556, 1.4], [313, 561, 1.0]]) {   // perto da calçada (fora do caminho do meio)
    const [cx, cz] = W(x, y); prop(cx, cz, s, s, s, 'crate');
  }
  // postes (finos, sólidos embaixo)
  const poles = [];
  for (const s of B_STREETS) {
    const r = streetRect(s), horiz = s[1] === s[3];
    const L = (horiz ? r[2] - r[0] : r[3] - r[1]) * PX;
    if (L < 15) continue;
    const n = Math.floor(L / 22) + 1;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const px = horiz ? r[0] + 6 + (r[2] - r[0] - 12) * t : r[0] + 3.5;
      const py = horiz ? r[1] + 3.5 : r[1] + 6 + (r[3] - r[1] - 12) * t;
      if (!inRect(px, py, B_BOUNDS, -1)) continue;
      const [x, z] = W(px, py);
      if (poles.some(q => Math.hypot(q[0] - x, q[1] - z) < 5)) continue;
      poles.push([x, z, horiz ? 1 : 0]);
      add(x - 0.13, z - 0.13, x + 0.13, z + 0.13, 8.5, 'pole', { axis: horiz ? 'z' : 'x' });
    }
  }

  // ---- rede de caminhos dos bots: cruzamentos das ruas
  const nodes = {}, links = [];
  const N = (id, x, y) => { nodes[id] = W(x, y); };
  N('cA', 230, 240); N('cB', 180, 240);                          // dentro do campo (base CT)
  N('gS1', 157, 280); N('gS2', 237, 280);                        // portões do alambrado
  N('R0', 81, 304); N('R1', 157, 304); N('R2', 184, 304); N('R2b', 237, 304); N('R3', 302, 304);   // Cravos
  N('B1', 157, 350); N('Be', 184, 344);                          // quadra de areia e o portão para a ruela
  N('T2', 184, 396); N('G1', 166, 396); N('T3', 184, 476);       // ruela reta até a Margaridas e o gramado
  N('W2', 81, 476); N('N1', 205, 476); N('N2', 302, 476);        // Margaridas
  N('pN', 245, 490); N('pA', 245, 516); N('pB', 243, 560);       // praça
  N('iA', 253, 596);                                             // pátio da igreja
  N('a2', 205, 547); N('a3', 302, 547); N('p1', 205, 581); N('p2', 302, 581);
  N('t2', 205, 668); N('t3', 302, 668);
  N('r1', 170, 728); N('r2', 205, 728); N('r3', 302, 728);
  const L = (a, b) => links.push([a, b]);
  L('cA', 'cB'); L('cB', 'gS1'); L('cA', 'gS1'); L('cA', 'gS2'); L('gS1', 'R1'); L('gS2', 'R2b');
  L('R0', 'R1'); L('R1', 'R2'); L('R2', 'R2b'); L('R2b', 'R3'); L('R1', 'B1'); L('B1', 'Be'); L('Be', 'R2');
  L('Be', 'T2'); L('T2', 'G1'); L('T2', 'T3');
  L('R0', 'W2'); L('W2', 'T3'); L('T3', 'N1'); L('N1', 'N2'); L('R3', 'N2');
  L('N1', 'a2'); L('N2', 'a3'); L('a2', 'p1'); L('a3', 'p2'); L('p1', 't2'); L('p2', 't3'); L('t2', 'r2'); L('t3', 'r3');
  L('r1', 'r2'); L('r2', 'r3'); L('p1', 'p2');
  L('pN', 'N1'); L('pN', 'N2'); L('pN', 'pA'); L('pA', 'pB'); L('pB', 'a3'); L('pB', 'p1'); L('iA', 'p1'); L('iA', 'p2');

  const sz = W(B_BOUNDS[0], B_BOUNDS[1]), ez = W(B_BOUNDS[2], B_BOUNDS[3]);
  const spawnsT = [], spawnsCT = [];
  for (let i = 0; i < 10; i++) spawnsT.push(W(168 + (i % 5) * 23, 730 + ((i / 5) | 0) * 8));
  for (let i = 0; i < 10; i++) spawnsCT.push(W(160 + (i % 5) * 26, 218 + ((i / 5) | 0) * 50));
  const siteA = [W(213, 482), W(292, 604)], siteB = [W(137, 300), W(191, 370)];   // B: quadra de areia, começo da ruela e frente da Cravos
  return {
    id: 'bairro', name: 'Bairro',
    size: { minX: sz[0], maxX: ez[0], minZ: sz[1], maxZ: ez[1] },
    boxes, poles, decor,
    streets: B_STREETS.map(s => { const r = streetRect(s); const p = W(r[0], r[1]), q = W(r[2], r[3]); return [p[0], p[1], q[0], q[1]]; }),
    areas: Object.fromEntries(Object.entries(B_AREAS).map(([k, r]) => { const p = W(r[0], r[1]), q = W(r[2], r[3]); return [k, [p[0], p[1], q[0], q[1]]]; })),
    spawns: { T: spawnsT, CT: spawnsCT },
    sites: { A: { min: siteA[0], max: siteA[1] }, B: { min: siteB[0], max: siteB[1] } },
    nodes, links,
    botT: [['r2', 't2', 'p1', 'pB'], ['r3', 't3', 'p2', 'iA'], ['r2', 't2', 'p1', 'a2', 'N1', 'T3', 'T2', 'Be', 'B1'], ['r3', 't3', 'p2', 'a3', 'N2', 'R3', 'R2b', 'R2', 'R1', 'B1']],
    botCT: ['pA', 'iA', 'B1', 'Be', 'G1', 'N2'], botPush: ['r1', 'r2', 'r3'],
    staging: { A: ['t2', 't3'], B: ['T3', 'N2'] },
  };
}

export const MAPS = { deserto: buildDeserto(), bairro: buildBairro() };
export const MAP_IDS = Object.keys(MAPS);
// mapa em uso (o servidor escolhe; o cliente troca quando o servidor avisa)
export const MAP = { ...MAPS.deserto };
export function useMap(id) {
  const m = MAPS[id] || MAPS.deserto;
  for (const k of Object.keys(MAP)) delete MAP[k];
  Object.assign(MAP, m);
  return MAP;
}
