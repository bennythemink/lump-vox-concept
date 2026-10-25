// Final grade: warm lift, gentle vignette and a whisper of grain
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision mediump float;
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // warm, slightly milky toy-model grade
      c.rgb = mix(c.rgb, c.rgb * vec3(1.04, 1.0, 0.94), 0.8);
      c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(0.299, 0.587, 0.114))), -0.08);
      c.rgb = c.rgb * 0.96 + 0.025;
      float d = distance(vUv, vec2(0.5, 0.48));
      c.rgb *= 1.0 - uVignette * smoothstep(0.35, 0.9, d);
      c.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * uGrain;
      gl_FragColor = c;
    }
  `,
};
