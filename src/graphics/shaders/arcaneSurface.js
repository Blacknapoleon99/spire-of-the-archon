/** Rim-lit, moving energy surfaces retain the existing pooled material API. */
export const arcaneTime = { value: 0 };
export function arcaneSurface(material) {
  material.depthWrite = false;
  material.transparent = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.uArcaneTime = arcaneTime;
    shader.fragmentShader = 'uniform float uArcaneTime;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
      float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
      vec3 flow = vViewPosition * 2.8;
      float veins = pow(0.5 + 0.5 * sin(flow.y*3.0 + sin(flow.x*2.0 + uArcaneTime*1.2) + sin(flow.z*2.5-uArcaneTime)), 8.0);
      gl_FragColor.rgb *= 0.7 + rim*1.5 + veins*0.5;
      gl_FragColor.a *= clamp(0.04 + rim*0.72 + veins*0.16, 0.0, 0.9);
      #include <dithering_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'arcane-flow-rim-v1';
  material.needsUpdate = true;
  return material;
}
