'use client';

/**
 * VoiceOrb — halftone concentric-ring sphere, dual-light, audio-reactive
 *
 * Algorithm (per user spec):
 *  • 52 latitude rings, dot count ∝ circumference (sin φ)
 *  • Ring stagger ri × 0.31 rad → interlocked halftone mesh, no vertical grid lines
 *  • Dual light source: primary top-left + secondary right → diagonal bright crease
 *  • Depth-scaled dot size: viewer-facing = large/bright, shadow = tiny/dim
 *  • 4-D simplex noise applied to radial radius each frame
 *  • Idle noise amplitude = 0.055 — orb ALWAYS breathes, never fully still
 *  • Speaking ramps amplitude up dramatically via FFT frequency bands
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

// ─── 4-D Simplex Noise (Gustavson, public domain, inline) ────────────────────

const _perm = new Uint8Array(512);
const _g4 = [
  [0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],
  [0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],
  [1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],
  [-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],
  [1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],
  [-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],
  [1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],
  [-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0],
];

(function buildPerm() {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 31337;
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
})();

function d4(g: number[], x: number, y: number, z: number, w: number) {
  return g[0]*x + g[1]*y + g[2]*z + g[3]*w;
}

function noise4(x: number, y: number, z: number, w: number): number {
  const F4 = (Math.sqrt(5)-1)/4, G4 = (5-Math.sqrt(5))/20;
  const s = (x+y+z+w)*F4;
  const i=Math.floor(x+s), j=Math.floor(y+s), k=Math.floor(z+s), l=Math.floor(w+s);
  const tc = (i+j+k+l)*G4;
  const x0=x-i+tc, y0=y-j+tc, z0=z-k+tc, w0=w-l+tc;
  let rx=0,ry=0,rz=0,rw=0;
  if(x0>y0)rx++;else ry++; if(x0>z0)rx++;else rz++;
  if(x0>w0)rx++;else rw++; if(y0>z0)ry++;else rz++;
  if(y0>w0)ry++;else rw++; if(z0>w0)rz++;else rw++;
  const i1=rx>=3?1:0,j1=ry>=3?1:0,k1=rz>=3?1:0,l1=rw>=3?1:0;
  const i2=rx>=2?1:0,j2=ry>=2?1:0,k2=rz>=2?1:0,l2=rw>=2?1:0;
  const i3=rx>=1?1:0,j3=ry>=1?1:0,k3=rz>=1?1:0,l3=rw>=1?1:0;
  const x1=x0-i1+G4,y1=y0-j1+G4,z1=z0-k1+G4,w1=w0-l1+G4;
  const x2=x0-i2+2*G4,y2=y0-j2+2*G4,z2=z0-k2+2*G4,w2=w0-l2+2*G4;
  const x3=x0-i3+3*G4,y3=y0-j3+3*G4,z3=z0-k3+3*G4,w3=w0-l3+3*G4;
  const x4=x0-1+4*G4,y4=y0-1+4*G4,z4=z0-1+4*G4,w4=w0-1+4*G4;
  const ii=i&255,jj=j&255,kk=k&255,ll=l&255;
  const g0=_perm[ii+_perm[jj+_perm[kk+_perm[ll]]]]%32;
  const g1=_perm[ii+i1+_perm[jj+j1+_perm[kk+k1+_perm[ll+l1]]]]%32;
  const g2=_perm[ii+i2+_perm[jj+j2+_perm[kk+k2+_perm[ll+l2]]]]%32;
  const g3=_perm[ii+i3+_perm[jj+j3+_perm[kk+k3+_perm[ll+l3]]]]%32;
  const g4=_perm[ii+1+_perm[jj+1+_perm[kk+1+_perm[ll+1]]]]%32;
  let n=0, tN=0.6-x0*x0-y0*y0-z0*z0-w0*w0;
  if(tN>0){tN*=tN;n+=tN*tN*d4(_g4[g0],x0,y0,z0,w0)}
  tN=0.6-x1*x1-y1*y1-z1*z1-w1*w1;
  if(tN>0){tN*=tN;n+=tN*tN*d4(_g4[g1],x1,y1,z1,w1)}
  tN=0.6-x2*x2-y2*y2-z2*z2-w2*w2;
  if(tN>0){tN*=tN;n+=tN*tN*d4(_g4[g2],x2,y2,z2,w2)}
  tN=0.6-x3*x3-y3*y3-z3*z3-w3*w3;
  if(tN>0){tN*=tN;n+=tN*tN*d4(_g4[g3],x3,y3,z3,w3)}
  tN=0.6-x4*x4-y4*y4-z4*z4-w4*w4;
  if(tN>0){tN*=tN;n+=tN*tN*d4(_g4[g4],x4,y4,z4,w4)}
  return 27*n;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function norm3(v: [number,number,number]): [number,number,number] {
  const m = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
  return [v[0]/m, v[1]/m, v[2]/m];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2;

const N_RINGS     = 52;
const DOT_DENSITY = 8.5;   // equatorial ring ≈ DOT_DENSITY × 2π ≈ 53 dots
const STAGGER     = 0.31;  // ring i starts at i × STAGGER rad → no vertical alignment
const NOISE_SCALE = 1.8;   // spatial frequency of noise on sphere surface
const SR_FRAC     = 0.50;  // sphere radius as fraction of canvas half
const BASE_DOT    = 4.6;   // max dot radius in CSS px (front-facing, fully lit)

// Dual light source directions (unit vectors, z+ toward viewer)
const L1 = norm3([-0.45,  0.75, 0.55]);   // primary:   top-left  → diagonal bright crease
const L2 = norm3([ 0.72,  0.12, 0.38]);   // secondary: right     → prevents total shadow

const AMBIENT = 0.12;
const L1_STR  = 0.72;
const L2_STR  = 0.26;

// Noise/animation
const IDLE_NOISE_AMP   = 0.055;  // orb never fully still — always breathes at idle
const ACTIVE_NOISE_AMP = 0.32;   // max amplitude (speaking)
const IDLE_SPEED       = 0.006;
const ACTIVE_SPEED     = 0.022;

// ─── Public handle ────────────────────────────────────────────────────────────

export interface VoiceOrbHandle {
  setAmplitude(v: number): void;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VoiceOrbProps {
  /** Primary lit colour.  Default: emerald #22C55E */
  dotColor?:      string;
  isUserSpeaking: boolean;
  isAISpeaking:   boolean;
  isLoading?:     boolean;
  analyserNode?:  AnalyserNode | null;
  size?:          number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const VoiceOrb = forwardRef<VoiceOrbHandle, VoiceOrbProps>(
  function VoiceOrb(
    {
      dotColor      = '#22C55E',
      isUserSpeaking,
      isAISpeaking,
      isLoading     = false,
      analyserNode,
      size          = 420,
    },
    ref,
  ) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const rafRef       = useRef<number>(0);
    const timeRef      = useRef(0);
    const amplitudeRef = useRef(0);

    const userSpkRef  = useRef(isUserSpeaking);
    const aiSpkRef    = useRef(isAISpeaking);
    const loadingRef  = useRef(isLoading);
    const analyserRef = useRef(analyserNode ?? null);
    const fftBufRef   = useRef<Uint8Array<ArrayBuffer> | null>(null);

    userSpkRef.current  = isUserSpeaking;
    aiSpkRef.current    = isAISpeaking;
    loadingRef.current  = isLoading;
    analyserRef.current = analyserNode ?? null;

    useEffect(() => {
      fftBufRef.current = analyserNode
        ? new Uint8Array(analyserNode.frequencyBinCount)
        : null;
    }, [analyserNode]);

    useImperativeHandle(ref, () => ({
      setAmplitude(v) { amplitudeRef.current = Math.max(0, Math.min(1, v)); },
    }));

    // ── Main render loop ───────────────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr  = window.devicePixelRatio || 1;
      const px   = size * dpr;
      canvas.width  = px;
      canvas.height = px;

      const half = px / 2;
      const cx   = half;
      const cy   = half;
      const SR   = half * SR_FRAC;   // sphere radius in physical px

      // Lit colour and shadow colour (10% of lit)
      const [lr, lg, lb] = hexToRgb(dotColor);
      const [sh_r, sh_g, sh_b] = [
        Math.round(lr * 0.10),
        Math.round(lg * 0.10),
        Math.round(lb * 0.10),
      ];

      // Smoothed frequency bands
      let smoothBass = 0, smoothMid = 0, smoothTreble = 0;
      let smoothAmp  = IDLE_NOISE_AMP;
      let smoothSpd  = IDLE_SPEED;

      type Dot = { sx: number; sy: number; r: number; alpha: number; brightness: number; z: number };
      const dotList: Dot[] = [];

      const render = () => {
        rafRef.current = requestAnimationFrame(render);

        const active  = userSpkRef.current || aiSpkRef.current;
        const loading = loadingRef.current;
        const an      = analyserRef.current;

        // ── FFT → frequency bands ─────────────────────────────────────
        // fftSize=512 → frequencyBinCount=256, ~86 Hz/bin
        let rawBass = 0, rawMid = 0, rawTreble = 0;

        if (an && fftBufRef.current) {
          an.getByteFrequencyData(fftBufRef.current);
          const buf = fftBufRef.current;

          let bS = 0; for (let k = 2;  k <= 10;  k++) bS += buf[k];
          rawBass   = Math.min(1, bS  / (9  * 255) * 5.0);
          let mS = 0; for (let k = 11; k <= 40;  k++) mS += buf[k];
          rawMid    = Math.min(1, mS  / (30 * 255) * 4.5);
          let tS = 0; for (let k = 41; k <= 100; k++) tS += buf[k];
          rawTreble = Math.min(1, tS  / (60 * 255) * 3.5);
        }

        // Attack fast, release slow
        smoothBass   += (rawBass   - smoothBass)   * (rawBass   > smoothBass   ? 0.30 : 0.06);
        smoothMid    += (rawMid    - smoothMid)    * (rawMid    > smoothMid    ? 0.40 : 0.10);
        smoothTreble += (rawTreble - smoothTreble) * (rawTreble > smoothTreble ? 0.55 : 0.12);

        amplitudeRef.current = Math.max(smoothBass, smoothMid, smoothTreble);

        // ── Animation parameters ──────────────────────────────────────

        // Noise amplitude: ALWAYS ≥ IDLE_NOISE_AMP so the orb never stops moving.
        // Mid energy drives the main morphing; bass adds a radius pulse.
        const targetAmp = loading
          ? IDLE_NOISE_AMP + 0.025 * Math.abs(Math.sin(timeRef.current * 1.2))
          : IDLE_NOISE_AMP + smoothMid * (ACTIVE_NOISE_AMP - IDLE_NOISE_AMP);
        smoothAmp += (targetAmp - smoothAmp) * (targetAmp > smoothAmp ? 0.12 : 0.03);

        // Noise advancement speed: treble = rapid shimmer
        const targetSpd = loading
          ? IDLE_SPEED * 0.8
          : IDLE_SPEED
            + smoothTreble * (ACTIVE_SPEED - IDLE_SPEED) * 0.55
            + smoothMid    * (ACTIVE_SPEED - IDLE_SPEED) * 0.45;
        smoothSpd += (targetSpd - smoothSpd) * 0.07;
        timeRef.current += smoothSpd;
        const t = timeRef.current;

        // Bass → gentle sphere-wide radius pulse
        const radiusScale = 1 + smoothBass * 0.10;

        // ── Clear canvas (transparent background) ─────────────────────
        ctx.clearRect(0, 0, px, px);

        // ── Build dot list ────────────────────────────────────────────
        dotList.length = 0;

        for (let ri = 0; ri < N_RINGS; ri++) {
          // Polar angle φ: 0 = north pole, π = south pole
          // Offset by +0.5 to avoid placing dots exactly at poles
          const phi    = ((ri + 0.5) / N_RINGS) * Math.PI;
          const sinPhi = Math.sin(phi);
          const cosPhi = Math.cos(phi);   // y component on unit sphere

          // Dot count proportional to ring circumference
          const nDots = Math.max(1, Math.round(DOT_DENSITY * TAU * sinPhi));

          for (let di = 0; di < nDots; di++) {
            // Stagger so dots never line up vertically across rings
            const theta = (di / nDots) * TAU + ri * STAGGER;

            // Unit-sphere position (z+ toward viewer)
            const nx = sinPhi * Math.cos(theta);   // x: rightward
            const ny = cosPhi;                     // y: upward
            const nz = sinPhi * Math.sin(theta);   // z: toward viewer

            // 4-D simplex noise for organic surface morphing.
            // The 4th dimension (t × 0.4) prevents purely translational scrolling.
            const nv = noise4(
              nx * NOISE_SCALE + t,
              ny * NOISE_SCALE,
              nz * NOISE_SCALE,
              t * 0.4,
            );

            // Displaced radial position (never collapses — min factor 0.88)
            const r_dist = radiusScale * Math.max(0.88, 1 + smoothAmp * nv);

            // 3-D projected position in physical px
            const x3 = nx * SR * r_dist;
            const y3 = ny * SR * r_dist;
            const z3 = nz * SR * r_dist;

            // Orthographic projection (matches the flat halftone reference look)
            const sx = cx + x3;
            const sy = cy - y3;   // flip y: positive y = up

            // ── Dual-light shading ────────────────────────────────────
            // Normal = undisplaced unit-sphere position (stable, no noise jitter)
            const d1 = Math.max(0, nx*L1[0] + ny*L1[1] + nz*L1[2]);
            const d2 = Math.max(0, nx*L2[0] + ny*L2[1] + nz*L2[2]);
            // brightness: 0.12 (deep shadow) up to ~1.10 (where both lights overlap)
            const brightness = Math.min(1, AMBIENT + d1*L1_STR + d2*L2_STR);

            // ── Depth-scaled dot size & alpha ─────────────────────────
            // depth=0 at back of sphere, depth=1 at front
            const depth = (nz + 1) / 2;

            const dotR = dpr * BASE_DOT * (0.15 + 0.85*depth) * (0.55 + 0.45*brightness);
            if (dotR < 0.35 * dpr) continue;   // cull sub-pixel dots

            const alpha = (0.18 + 0.82*depth) * (0.28 + 0.72*brightness);

            dotList.push({ sx, sy, r: dotR, alpha, brightness, z: z3 });
          }
        }

        // ── Depth sort: back → front (painter's algorithm) ────────────
        dotList.sort((a, b) => a.z - b.z);

        // ── Draw all dots ─────────────────────────────────────────────
        for (const d of dotList) {
          // Blend from shadow colour (dark) → lit colour (full dotColor) by brightness
          const b  = d.brightness;
          const cr = Math.round(sh_r + (lr - sh_r) * b);
          const cg = Math.round(sh_g + (lg - sh_g) * b);
          const cbl= Math.round(sh_b + (lb - sh_b) * b);

          ctx.globalAlpha = Math.min(1, Math.max(0, d.alpha));
          ctx.fillStyle   = `rgb(${cr},${cg},${cbl})`;
          ctx.beginPath();
          ctx.arc(d.sx, d.sy, d.r, 0, TAU);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      };

      rafRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(rafRef.current);
    }, [dotColor, size]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          width:      size,
          height:     size,
          display:    'block',
          background: 'transparent',
        }}
      />
    );
  },
);

export default VoiceOrb;
