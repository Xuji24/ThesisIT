'use client';

/**
 * WebGL Orb — ported from React Bits (DavidHDev/react-bits) using native WebGL
 * instead of the `ogl` wrapper so no extra dependency is needed.
 *
 * Props:
 *   active          — when true, hover distortion + rotation are forced on (AI speaking)
 *   hue             — hue-rotate degrees applied to the base purple/cyan palette (default 0)
 *   hoverIntensity  — wave distortion amplitude (default 0.32, matches reactbits.dev demo)
 *   backgroundColor — hex colour of the host background (default '#ffffff' = white)
 */

import { useEffect, useRef } from 'react';

interface OrbProps {
  active: boolean;
  hue?: number;
  hoverIntensity?: number;
  backgroundColor?: string;
}

function hexToRGB(color: string): [number, number, number] {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    return [r, g, b];
  }
  return [1, 1, 1];
}

// ── GLSL shaders (verbatim from React Bits Orb source) ──────────────────────
const VERT = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float iTime;
  uniform vec3  iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  uniform vec3  backgroundColor;
  varying vec2  vUv;

  vec3 rgb2yiq(vec3 c) {
    return vec3(
      dot(c, vec3(0.299,  0.587,  0.114)),
      dot(c, vec3(0.596, -0.274, -0.322)),
      dot(c, vec3(0.211, -0.523,  0.312))
    );
  }
  vec3 yiq2rgb(vec3 c) {
    return vec3(
      c.x + 0.956*c.y + 0.621*c.z,
      c.x - 0.272*c.y - 0.647*c.z,
      c.x - 1.106*c.y + 1.703*c.z
    );
  }
  vec3 adjustHue(vec3 col, float deg) {
    float rad = deg * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(col);
    float c = cos(rad), s = sin(rad);
    yiq.y = yiq.y*c - yiq.z*s;
    yiq.z = yiq.y*s + yiq.z*c;
    return yiq2rgb(yiq);
  }

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z) * p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i  = floor(p + (p.x+p.y+p.z)*K1);
    vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
    vec3 e  = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e*(1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy*(1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)), 0.0);
    vec4 n = h*h*h*h * vec4(
      dot(d0, hash33(i)),
      dot(d1, hash33(i+i1)),
      dot(d2, hash33(i+i2)),
      dot(d3, hash33(i+1.0))
    );
    return dot(vec4(31.316), n);
  }

  vec4 extractAlpha(vec3 c) {
    float a = max(max(c.r, c.g), c.b);
    return vec4(c / (a + 1e-5), a);
  }

  const vec3  baseColor1   = vec3(0.611765, 0.262745, 0.996078);
  const vec3  baseColor2   = vec3(0.298039, 0.760784, 0.913725);
  const vec3  baseColor3   = vec3(0.062745, 0.078431, 0.600000);
  const float innerRadius  = 0.6;
  const float noiseScale   = 0.65;

  float light1(float i, float a, float d) { return i/(1.0+d*a); }
  float light2(float i, float a, float d) { return i/(1.0+d*d*a); }

  vec4 draw(vec2 uv) {
    vec3 c1 = adjustHue(baseColor1, hue);
    vec3 c2 = adjustHue(baseColor2, hue);
    vec3 c3 = adjustHue(baseColor3, hue);

    float ang    = atan(uv.y, uv.x);
    float len    = length(uv);
    float invLen = len > 0.0 ? 1.0/len : 0.0;
    float bgLum  = dot(backgroundColor, vec3(0.299, 0.587, 0.114));

    float n0 = snoise3(vec3(uv*noiseScale, iTime*0.5))*0.5 + 0.5;
    float r0 = mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
    float d0 = distance(uv, (r0*invLen)*uv);
    float v0 = light1(1.0, 10.0, d0);
    v0 *= smoothstep(r0*1.05, r0, len);
    float iF = smoothstep(r0*0.8, r0*0.95, len);
    v0 *= mix(iF, 1.0, bgLum*0.7);

    float cl  = cos(ang + iTime*2.0)*0.5 + 0.5;
    float aa  = iTime * -1.0;
    vec2  pos = vec2(cos(aa), sin(aa)) * r0;
    float dd  = distance(uv, pos);
    float v1  = light2(1.5, 5.0, dd) * light1(1.0, 50.0, d0);
    float v2  = smoothstep(1.0, mix(innerRadius, 1.0, n0*0.5), len);
    float v3  = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

    vec3 colBase  = mix(c1, c2, cl);
    float fadeAmt = mix(1.0, 0.1, bgLum);

    vec3 darkCol  = clamp((mix(c3, colBase, v0) + v1)*v2*v3, 0.0, 1.0);
    vec3 lightCol = clamp(mix(backgroundColor, (colBase+v1)*mix(1.0,v2*v3,fadeAmt), v0), 0.0, 1.0);
    return extractAlpha(mix(darkCol, lightCol, bgLum));
  }

  void main() {
    vec2 fc     = vUv * iResolution.xy;
    vec2 center = iResolution.xy * 0.5;
    float size  = min(iResolution.x, iResolution.y);
    vec2 uv     = (fc - center) / size * 2.0;

    float s = sin(rot), c = cos(rot);
    uv = vec2(c*uv.x - s*uv.y, s*uv.x + c*uv.y);

    uv.x += hover * hoverIntensity * 0.1 * sin(uv.y*10.0 + iTime);
    uv.y += hover * hoverIntensity * 0.1 * sin(uv.x*10.0 + iTime);

    vec4 col = draw(uv);
    gl_FragColor = vec4(col.rgb * col.a, col.a);
  }
`;

export default function Orb({
  active,
  hue             = 0,
  hoverIntensity  = 0.32,
  backgroundColor = '#ffffff',
}: OrbProps) {
  const containerRef     = useRef<HTMLDivElement>(null);
  // Use refs so the render loop always reads the latest prop values without
  // needing to re-run the effect every time a prop changes.
  const activeRef        = useRef(active);
  const hueRef           = useRef(hue);
  const hoverIntRef      = useRef(hoverIntensity);
  const bgColorRef       = useRef(backgroundColor);

  activeRef.current   = active;
  hueRef.current      = hue;
  hoverIntRef.current = hoverIntensity;
  bgColorRef.current  = backgroundColor;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── WebGL setup ───────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) { container.removeChild(canvas); return; }

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const compileShader = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VERT));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen triangle (equivalent to OGL Triangle)
    const setupBuffer = (attr: string, data: Float32Array, size: number) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, attr);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    setupBuffer('position', new Float32Array([-1,-1, 3,-1, -1,3]), 2);
    setupBuffer('uv',       new Float32Array([ 0, 0, 2, 0,  0,2]), 2);

    const U = {
      iTime:           gl.getUniformLocation(prog, 'iTime'),
      iResolution:     gl.getUniformLocation(prog, 'iResolution'),
      hue:             gl.getUniformLocation(prog, 'hue'),
      hover:           gl.getUniformLocation(prog, 'hover'),
      rot:             gl.getUniformLocation(prog, 'rot'),
      hoverIntensity:  gl.getUniformLocation(prog, 'hoverIntensity'),
      backgroundColor: gl.getUniformLocation(prog, 'backgroundColor'),
    };

    let cW = 0, cH = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cW = container.clientWidth  * dpr;
      cH = container.clientHeight * dpr;
      canvas.width  = cW;
      canvas.height = cH;
      gl.viewport(0, 0, cW, cH);
    };
    window.addEventListener('resize', resize);
    resize();

    // ── Render loop ───────────────────────────────────────────────────────
    let currentHover = 0;
    let currentRot   = 0;
    let lastT        = 0;
    let rafId: number;

    const render = (t: number) => {
      rafId = requestAnimationFrame(render);
      const dt   = Math.min((t - lastT) * 0.001, 0.05);
      lastT = t;

      const targetHover = activeRef.current ? 1 : 0;
      currentHover += (targetHover - currentHover) * 0.08;
      if (activeRef.current) currentRot += dt * 0.3;

      gl.clear(gl.COLOR_BUFFER_BIT);

      const bg = hexToRGB(bgColorRef.current);
      gl.uniform1f(U.iTime,            t * 0.001);
      gl.uniform3f(U.iResolution,      cW, cH, cW / Math.max(cH, 1));
      gl.uniform1f(U.hue,              hueRef.current);
      gl.uniform1f(U.hover,            currentHover);
      gl.uniform1f(U.rot,              currentRot);
      gl.uniform1f(U.hoverIntensity,   hoverIntRef.current);
      gl.uniform3f(U.backgroundColor,  bg[0], bg[1], bg[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      if (container.contains(canvas)) container.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  // Run once on mount; prop changes flow through refs inside the render loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', zIndex: 0 }}
    />
  );
}
