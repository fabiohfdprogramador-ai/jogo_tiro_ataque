// Física e colisão compartilhadas (cliente prevê, servidor valida).

export const PHYS = {
  radius: 0.35,
  standH: 1.8, crouchH: 1.05,
  eyeStand: 1.64, eyeCrouch: 0.9,
  gravity: 18, jumpV: 6.4,
  walkSpeed: 6.0, runSpeed: 7.2, crouchMul: 0.36,   // anda normal; runSpeed é a corrida dos bots
  sprintSpeed: 8.8,                                 // jogador correndo segurando Shift
  accel: 60, airAccel: 10, friction: 9,
};

export const eyeHeight = (crouch) => (crouch ? PHYS.eyeCrouch : PHYS.eyeStand);
export const bodyHeight = (crouch) => (crouch ? PHYS.crouchH : PHYS.standH);

// Move o corpo (pés em p) com velocidade v por dt, resolvendo colisões eixo a eixo.
// Retorna true se estiver no chão.
export function moveBody(p, v, dt, h, boxes) {
  const r = PHYS.radius;
  let onGround = false;
  for (const axis of [0, 2, 1]) {
    p[axis] += v[axis] * dt;
    for (const b of boxes) {
      if (p[0] + r <= b.min[0] || p[0] - r >= b.max[0] ||
          p[1] + h <= b.min[1] || p[1] >= b.max[1] ||
          p[2] + r <= b.min[2] || p[2] - r >= b.max[2]) continue;
      if (axis === 1) {
        if (v[1] <= 0) { p[1] = b.max[1]; onGround = true; } else { p[1] = b.min[1] - h - 1e-4; }
        v[1] = 0;
      } else {
        const mid = (b.min[axis] + b.max[axis]) / 2;
        const dir = v[axis] !== 0 ? Math.sign(v[axis]) : (p[axis] < mid ? 1 : -1);
        p[axis] = dir > 0 ? b.min[axis] - r - 1e-4 : b.max[axis] + r + 1e-4;
        v[axis] = 0;
      }
    }
  }
  if (p[1] <= 0) { p[1] = 0; if (v[1] < 0) v[1] = 0; onGround = true; }
  return onGround;
}

// Pode ficar em pé? (para levantar depois de agachar)
export function canStand(p, boxes) {
  const r = PHYS.radius, h = PHYS.standH;
  for (const b of boxes) {
    if (p[0] + r <= b.min[0] || p[0] - r >= b.max[0] || p[1] + h <= b.min[1] || p[1] + 0.05 >= b.max[1] ||
        p[2] + r <= b.min[2] || p[2] - r >= b.max[2]) continue;
    return false;
  }
  return true;
}

// Raio contra caixa (método das placas). Retorna distância ou Infinity.
export function rayBox(o, d, min, max) {
  let tmin = 0, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return Infinity;
    } else {
      let t1 = (min[i] - o[i]) / d[i], t2 = (max[i] - o[i]) / d[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

// Raio contra o mundo (caixas + chão). Retorna { t, normal }.
export function raycastWorld(o, d, maxDist, boxes) {
  let best = maxDist, normal = null;
  if (d[1] < -1e-6) { const t = -o[1] / d[1]; if (t < best) { best = t; normal = [0, 1, 0]; } }
  for (const b of boxes) {
    const t = rayBox(o, d, b.min, b.max);
    if (t < best) {
      best = t;
      const hp = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
      const eps = 1e-3;
      normal = Math.abs(hp[0] - b.min[0]) < eps ? [-1, 0, 0] : Math.abs(hp[0] - b.max[0]) < eps ? [1, 0, 0]
        : Math.abs(hp[2] - b.min[2]) < eps ? [0, 0, -1] : Math.abs(hp[2] - b.max[2]) < eps ? [0, 0, 1]
        : Math.abs(hp[1] - b.max[1]) < eps ? [0, 1, 0] : [0, -1, 0];
    }
  }
  return { t: best, normal };
}

function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
}

// Hitboxes do jogador: cabeça, peito, barriga, pernas.
export function rayPlayer(o, d, p, crouch) {
  const h = bodyHeight(crouch);
  const x = p[0], y = p[1], z = p[2];
  let best = Infinity, zone = null;
  const tHead = raySphere(o, d, [x, y + h - 0.14, z], 0.15);
  if (tHead < best) { best = tHead; zone = 'head'; }
  const parts = [
    ['chest', [x - 0.28, y + h * 0.62, z - 0.22], [x + 0.28, y + h - 0.27, z + 0.22]],
    ['stomach', [x - 0.26, y + h * 0.45, z - 0.2], [x + 0.26, y + h * 0.62, z + 0.2]],
    ['legs', [x - 0.25, y, z - 0.18], [x + 0.25, y + h * 0.45, z + 0.18]],
  ];
  for (const [name, mn, mx] of parts) {
    const t = rayBox(o, d, mn, mx);
    if (t < best) { best = t; zone = name; }
  }
  return { t: best, zone };
}

export function lineOfSight(a, b, boxes) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  d[0] /= len; d[1] /= len; d[2] /= len;
  return raycastWorld(a, d, len, boxes).t >= len - 0.01;
}

// yaw = 0 olha para -z. pitch positivo = olhar para cima.
export function dirFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

// ---------------------------------------------------------------- granadas (voo igual no servidor e no cliente)
export const NADE = { gravity: 11, speed: 15.5, fuse: { he: 1.6, flash: 1.4, smoke: 1.9 }, smokeTime: 16, smokeRadius: 4.3, heRadius: 9, heDamage: 130 };

// Avança a granada n = { p:[x,y,z], v:[x,y,z], rest:false } por dt (quica nas paredes e no chão).
// Retorna true se bateu em algo (para o som do quique).
export function stepNade(n, dt, boxes) {
  if (n.rest) return false;
  const v = n.v;
  v[1] -= NADE.gravity * dt;
  const len = Math.hypot(v[0], v[1], v[2]) * dt;
  if (len < 1e-6) return false;
  const d = [v[0] * dt / len, v[1] * dt / len, v[2] * dt / len];
  const hit = raycastWorld(n.p, d, len, boxes);
  if (hit.t < len && hit.normal) {
    const nn = hit.normal;
    n.p = [n.p[0] + d[0] * hit.t + nn[0] * 0.04, n.p[1] + d[1] * hit.t + nn[1] * 0.04, n.p[2] + d[2] * hit.t + nn[2] * 0.04];
    const dot = v[0] * nn[0] + v[1] * nn[1] + v[2] * nn[2];
    for (let i = 0; i < 3; i++) v[i] = (v[i] - 2 * dot * nn[i]) * 0.45;
    if (nn[1] > 0.7 && Math.hypot(v[0], v[1], v[2]) < 1.3) { v[0] = v[1] = v[2] = 0; n.rest = true; }
    return Math.hypot(v[0], v[1], v[2]) > 2;
  }
  n.p = [n.p[0] + v[0] * dt, n.p[1] + v[1] * dt, n.p[2] + v[2] * dt];
  return false;
}

// A linha de a até b passa por dentro de alguma fumaça? smokes = [[x,y,z, até], ...]
export function smokeBlocks(a, b, smokes, t) {
  for (const s of smokes) {
    if (t > s[3]) continue;
    const c = [s[0], s[1] + 1.4, s[2]];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1e-6;
    const k = Math.max(0, Math.min(1, ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / L2));
    if (Math.hypot(a[0] + ab[0] * k - c[0], a[1] + ab[1] * k - c[1], a[2] + ab[2] * k - c[2]) < NADE.smokeRadius) return true;
  }
  return false;
}

// Quanto a granada de luz em pos cega quem olha de eye com yaw/pitch (0..1).
export function flashAmount(eye, yaw, pitch, pos, boxes) {
  const d = Math.hypot(eye[0] - pos[0], eye[1] - pos[1], eye[2] - pos[2]);
  if (d > 32 || !lineOfSight([pos[0], pos[1] + 0.2, pos[2]], eye, boxes)) return 0;
  const look = dirFromAngles(yaw, pitch);
  const to = [(pos[0] - eye[0]) / d, (pos[1] - eye[1]) / d, (pos[2] - eye[2]) / d];
  const facing = look[0] * to[0] + look[1] * to[1] + look[2] * to[2];
  const dirK = 0.3 + 0.7 * Math.max(0, Math.min(1, (facing + 0.2) / 1.2));   // de costas cega bem menos
  return Math.max(0, Math.min(1, 1.15 - d / 30)) * dirK;
}
