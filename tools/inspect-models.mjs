// Mostra um resumo de cada modelo .glb: tamanho, malhas, texturas, esqueleto e animações.
// Uso: node tools/inspect-models.mjs arquivo1.glb [arquivo2.glb ...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  console.log('\n=====', file);
  for (const scene of root.listScenes()) {
    const b = getBounds(scene);
    const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
    console.log('cena', JSON.stringify(scene.getName()), 'min', b.min.map(v => +v.toFixed(3)), 'max', b.max.map(v => +v.toFixed(3)), 'tamanho', size);
  }
  let tris = 0, verts = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'); verts += pos ? pos.getCount() : 0;
    const idx = p.getIndices(); tris += (idx ? idx.getCount() : (pos ? pos.getCount() : 0)) / 3;
  }
  console.log('malhas', root.listMeshes().length, 'vértices', verts, 'triângulos', Math.round(tris));
  console.log('materiais', root.listMaterials().map(m => m.getName()).join(' | '));
  for (const t of root.listTextures()) {
    const img = t.getImage();
    let dim = '';
    if (img && t.getMimeType() === 'image/png') dim = `${img[16] << 24 | img[17] << 16 | img[18] << 8 | img[19]}x${img[20] << 24 | img[21] << 16 | img[22] << 8 | img[23]}`;
    console.log('  textura', t.getName() || t.getURI(), t.getMimeType(), dim, Math.round((img?.byteLength || 0) / 1024) + ' KB');
  }
  const skins = root.listSkins();
  for (const s of skins) console.log('esqueleto', s.listJoints().length, 'ossos:', s.listJoints().slice(0, 70).map(j => j.getName()).join(', '));
  for (const a of root.listAnimations()) {
    let dur = 0; for (const s of a.listSamplers()) { const inp = s.getInput(); if (inp) dur = Math.max(dur, inp.getMax([])[0]); }
    console.log('animação', JSON.stringify(a.getName()), dur.toFixed(2) + 's');
  }
  const tops = root.listScenes()[0].listChildren();
  const tree = (n, d) => { if (d > 3) return; console.log('  '.repeat(d) + '- ' + n.getName() + (n.getMesh() ? ' [malha]' : '') + (n.getSkin() ? ' [skin]' : '')); n.listChildren().slice(0, 25).forEach(c => tree(c, d + 1)); };
  tops.forEach(n => tree(n, 1));
}
