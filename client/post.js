// Pós-processamento: oclusão de ambiente (sombras de contato), brilho suave, vinheta e cor.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

export function createComposer(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.blendIntensity = 0.85;
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
  composer.addPass(ao);
  // limpa pixels inválidos (NaN) antes do brilho, senão eles se espalham e escurecem a tela
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      bool bad(float v){ return !(v == v) || abs(v) > 60000.0; }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        if (bad(c.r) || bad(c.g) || bad(c.b)) {
          vec2 px = vec2(1.0) / vec2(textureSize(tDiffuse, 0));
          c = texture2D(tDiffuse, vUv + vec2(px.x * 2.0, 0.0));
          if (bad(c.r) || bad(c.g) || bad(c.b)) c = vec4(0.2, 0.2, 0.2, 1.0);
        }
        gl_FragColor = c;
      }`,
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const vig = new ShaderPass(VignetteShader);
  vig.uniforms.offset.value = 0.95; vig.uniforms.darkness.value = 1.05;
  composer.addPass(vig);
  return {
    composer, ao, bloom,
    setSize(w, h) { composer.setSize(w, h); },
    render() { composer.render(); },
  };
}
