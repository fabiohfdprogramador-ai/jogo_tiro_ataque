// Tabela de armas (valores inspirados no CS). Compartilhada entre servidor e cliente.

export const WEAPONS = {
  knife: {
    name: 'Faca', slot: 3, dmg: 40, rpm: 110, melee: true, range: 2.2,
    mag: 0, reserve: 0, price: 0, speed: 1.04, armorPen: 0.85, reward: 1500,
  },
  glock: {
    name: 'Glock-18', slot: 2, team: 'T', dmg: 28, rpm: 400, auto: false, mag: 20, reserve: 120,
    price: 200, reload: 1.55, speed: 1.0, armorPen: 0.47, reward: 300,
    spread: 0.008, moveSpread: 0.035, jumpSpread: 0.12, kick: 0.012, range: 60,
  },
  usp: {
    name: 'USP-S', slot: 2, team: 'CT', dmg: 33, rpm: 352, auto: false, mag: 12, reserve: 24,
    price: 200, reload: 1.55, speed: 1.0, armorPen: 0.5, reward: 300,
    spread: 0.006, moveSpread: 0.03, jumpSpread: 0.12, kick: 0.012, range: 70,
  },
  deagle: {
    name: 'Desert Eagle', slot: 2, dmg: 63, rpm: 267, auto: false, mag: 7, reserve: 35,
    price: 700, reload: 1.55, speed: 0.92, armorPen: 0.93, reward: 300,
    spread: 0.006, moveSpread: 0.08, jumpSpread: 0.2, kick: 0.045, range: 90,
  },
  ak47: {
    name: 'AK-47', slot: 1, team: 'T', dmg: 36, rpm: 600, auto: true, mag: 30, reserve: 90,
    price: 2700, reload: 1.76, speed: 0.86, armorPen: 0.775, reward: 300,
    spread: 0.004, moveSpread: 0.09, jumpSpread: 0.25, kick: 0.0085, sway: 1.0, range: 200,
  },
  m4a4: {
    name: 'M4A1', slot: 1, team: 'CT', dmg: 33, rpm: 666, auto: true, mag: 30, reserve: 90,
    price: 3100, reload: 2.18, speed: 0.9, armorPen: 0.7, reward: 300,
    spread: 0.0035, moveSpread: 0.08, jumpSpread: 0.25, kick: 0.0068, sway: 0.75, range: 200,
  },
  awp: {
    name: 'AWP', slot: 4, dmg: 115, rpm: 41, auto: false, mag: 5, reserve: 30,
    price: 4750, reload: 2.53, speed: 0.8, armorPen: 0.975, reward: 100,
    spread: 0.0005, unscopedSpread: 0.07, moveSpread: 0.15, jumpSpread: 0.3, kick: 0.03, scope: true, range: 300,
  },
  // armas especiais (espaço 4, no lugar da AWP): disparam projéteis que voam de verdade (shared/physics.js: PROJ)
  rpg: {
    name: 'Bazuca', slot: 4, dmg: 0, rpm: 30, auto: false, mag: 1, reserve: 2,
    price: 5500, reload: 2.8, speed: 0.78, armorPen: 1, reward: 0,
    spread: 0.002, moveSpread: 0.03, jumpSpread: 0.1, kick: 0.05, range: 300, projectile: 'rocket',
  },
  bow: {
    name: 'Arco', slot: 4, dmg: 150, rpm: 60, auto: false, mag: 1, reserve: 12,
    price: 2800, reload: 0.9, speed: 0.95, armorPen: 0.9, reward: 200,
    spread: 0.001, moveSpread: 0.02, jumpSpread: 0.08, kick: 0.012, range: 200, projectile: 'arrow',
  },
  // granadas (espaço 5): "melee" para não terem munição nem recarga
  he: { name: 'Granada explosiva', slot: 5, grenade: true, melee: true, dmg: 0, rpm: 60, range: 1, mag: 0, reserve: 0, price: 300, speed: 1, armorPen: 1, reward: 300 },
  flash: { name: 'Granada de luz', slot: 5, grenade: true, melee: true, dmg: 0, rpm: 60, range: 1, mag: 0, reserve: 0, price: 200, speed: 1, armorPen: 1, reward: 300 },
  smoke: { name: 'Granada de fumaça', slot: 5, grenade: true, melee: true, dmg: 0, rpm: 60, range: 1, mag: 0, reserve: 0, price: 300, speed: 1, armorPen: 1, reward: 300 },
};
export const NADES = ['he', 'flash', 'smoke'];
export const MAX_HP = 200;              // vida cheia (no CS é 100)
export const EXTRA_NAMES = { c4: 'Bomba', fall: 'Queda', rocket: 'Bazuca' };
export const weaponName = (k) => (WEAPONS[k] ? WEAPONS[k].name : EXTRA_NAMES[k] || k);
// bomba
export const BOMB = { plant: 3.0, defuse: 6.0, timer: 40, radius: 22, damage: 450, plantReward: 300, defuseReward: 300 };

export const ITEMS = {
  kevlar: { name: 'Colete', price: 650 },
  helmet: { name: 'Colete + Capacete', price: 1000 },
};

// ordem e atalhos do menu de compra
export const BUY_MENU = [
  { key: '1', item: 'deagle' },
  { key: '2', item: 'ak47' },
  { key: '3', item: 'm4a4' },
  { key: '4', item: 'awp' },
  { key: '5', item: 'rpg' },
  { key: '6', item: 'bow' },
  { key: '7', item: 'kevlar' },
  { key: '8', item: 'helmet' },
  { key: '9', item: 'he' },
  { key: '0', item: 'flash' },
  { key: '-', item: 'smoke' },
];

export const ZONE_MULT = { head: 4, chest: 1, stomach: 1.25, legs: 0.75 };
// todos aguentam mais tiros que no CS (dano reduzido em 40%)
export const DAMAGE_SCALE = 0.6;

export function computeDamage(weaponKey, zone, dist, victim) {
  const W = WEAPONS[weaponKey];
  let dmg = W.dmg * ZONE_MULT[zone] * DAMAGE_SCALE;
  if (!W.melee) dmg *= Math.pow(0.98, dist / 10); // queda de dano com a distância
  let armorDmg = 0;
  const armored = victim.armor > 0 && zone !== 'legs' && (zone !== 'head' || victim.helmet);
  if (armored) {
    const hpDmg = dmg * W.armorPen;
    armorDmg = (dmg - hpDmg) * 0.5;
    dmg = hpDmg;
  }
  return { hp: Math.round(dmg), armor: Math.round(armorDmg) };
}

// Padrão de spray (offsets acumulados de pitch/yaw em radianos) para o tiro n de uma rajada.
export function sprayOffset(weaponKey, n) {
  const W = WEAPONS[weaponKey];
  if (!W.auto) return [0, 0];
  const k = W.kick;
  const climb = Math.min(n, 10);
  const up = k * (climb - climb * climb * 0.035) + Math.max(0, n - 10) * k * 0.1;
  let side = 0;
  if (n > 7) side = Math.sin((n - 7) * 0.42) * k * 5 * W.sway;
  else side = -n * k * 0.12 * W.sway;
  return [up, side];
}

export const fireInterval = (weaponKey) => 60 / WEAPONS[weaponKey].rpm;
export const defaultPistol = (team) => (team === 'T' ? 'glock' : 'usp');
