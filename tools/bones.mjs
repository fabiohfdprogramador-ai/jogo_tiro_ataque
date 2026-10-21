import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const skin = doc.getRoot().listSkins()[0];
const joints = new Set(skin.listJoints());
const pr = (n, d) => { if (joints.has(n) && !/_end/.test(n.getName())) console.log('  '.repeat(d) + n.getName() + ' t=' + n.getTranslation().map(v => +v.toFixed(2)).join(',')); n.listChildren().forEach(c => pr(c, d + (joints.has(n) ? 1 : 0))); };
doc.getRoot().listScenes()[0].listChildren().forEach(n => pr(n, 0));
console.log('anims', doc.getRoot().listAnimations().map(a => a.getName() + ':' + a.listChannels().length));
