import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const sb = getBounds(doc.getRoot().listScenes()[0]);
const f = (a) => a.map(v => +v.toFixed(3)).join(',');
console.log('CENA', f(sb.min), '|', f(sb.max));
doc.getRoot().listScenes()[0].traverse(n => {
  if (!n.getMesh()) return;
  const b = getBounds(n);
  const mats = n.getMesh().listPrimitives().map(p => p.getMaterial()?.getName()).join('+');
  console.log(n.getName().slice(0, 40).padEnd(40), mats.slice(0, 30).padEnd(30), f(b.min), '|', f(b.max));
});
