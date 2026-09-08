import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

varying vec2 v_uv;
uniform float u_time;
uniform float u_seed;
uniform float u_waveSpeed;
uniform float u_waveFreqX;
uniform float u_waveFreqY;
uniform float u_waveAngle;
uniform float u_waveAmplitude;
uniform float u_maskSoftness;
uniform float u_blendAmount;
uniform vec2 u_resolution;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
  float s = u_seed;
  vec2 k1 = vec2(2127.1 + s * 13.37, 81.17 + s * 7.31);
  vec2 k2 = vec2(1269.5 + s * 11.13, 283.37 + s * 5.79);
  p = vec2(dot(p, k1), dot(p, k2));
  return fract(sin(p) * (43758.5453 + s * 1.618));
}

float noise(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i), f),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
  return 0.5 + 0.5 * n;
}

float seedF(float base) {
  return base * (1.0 + 0.5 * sin(u_seed * 3.17 + base));
}

vec2 warpUV(vec2 uv) {
  float t = u_time * u_waveSpeed;
  float angleOffset = sin(u_seed * 2.73) * 30.0;
  mat2 dirRot = Rot(radians(u_waveAngle + angleOffset));
  vec2 ruv = dirRot * uv;
  float fxMod = seedF(u_waveFreqX);
  float fyMod = seedF(u_waveFreqY);
  float phaseX = fract(sin(u_seed * 7.19) * 437.58) * 6.2832;
  float phaseY = fract(cos(u_seed * 3.41) * 291.37) * 6.2832;
  float harmonic = sin(u_seed * 1.23) * 0.5;
  float a = fyMod * ruv.y - sin(ruv.x * fxMod + ruv.y - t + phaseX);
  a += harmonic * sin(ruv.x * fxMod * 2.0 + ruv.y * 0.5 + t * 0.7 + phaseY);
  a = smoothstep(
    cos(a) * u_maskSoftness,
    sin(a) * u_maskSoftness + 3.0,
    cos(a - fyMod * ruv.y) - sin(a - fxMod * ruv.x)
  );
  a *= u_waveAmplitude;
  uv = cos(a) * uv + sin(a) * vec2(-uv.y, uv.x);
  return uv;
}

void main() {
  vec2 fragCoord = v_uv * u_resolution;
  vec2 uv = fragCoord / u_resolution.xy;
  float ratio = u_resolution.x / u_resolution.y;
  float t = u_time * u_waveSpeed;
  vec2 tuv = uv - 0.5;
  vec2 seedShift = vec2(sin(u_seed * 4.37), cos(u_seed * 5.91)) * 100.0;
  float degree = noise(vec2(t * 0.1, tuv.x * tuv.y) + seedShift);
  tuv.y *= 1.0 / ratio;
  tuv *= Rot(radians((degree - 0.5) * 720.0 + 180.0));
  tuv.y *= ratio;
  vec2 uv2 = (fragCoord * 2.0 - u_resolution.xy) / (u_resolution.x + u_resolution.y) * 2.0;
  float preRotAngle = fract(sin(u_seed * 5.63) * 173.29) * 6.2832;
  uv2 *= Rot(preRotAngle);
  vec2 warped = warpUV(uv2) * 0.5 + 0.5;
  vec2 blendUV = mix(tuv, warped - 0.5, u_blendAmount);
  float layerRot1 = -5.0 + sin(u_seed * 1.83) * 20.0;
  float layerRot2 = 10.0 + cos(u_seed * 2.47) * 20.0;
  vec3 layer1 = mix(u_color0, u_color2, S(-0.3, 0.3, (blendUV * Rot(radians(layerRot1))).x));
  vec3 layer2 = mix(u_color3, u_color1, S(-0.3, 0.3, (blendUV * Rot(radians(layerRot2))).x));
  vec3 col = mix(layer1, layer2, S(0.3, -0.3, blendUV.y));
  col = mix(col, col * col + 0.5 * sqrt(col), 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = Number.parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

type WaveGradientProps = {
  active?: boolean
  className?: string
  seed?: number
}

/** AppMinimal "Wave Gradient" WebGL fragment — same defaults as Framer component. */
export default function WaveGradient({ active = false, className, seed = 32 }: WaveGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )
    const aPos = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uniforms = {
      time: gl.getUniformLocation(program, 'u_time'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      waveSpeed: gl.getUniformLocation(program, 'u_waveSpeed'),
      waveFreqX: gl.getUniformLocation(program, 'u_waveFreqX'),
      waveFreqY: gl.getUniformLocation(program, 'u_waveFreqY'),
      waveAngle: gl.getUniformLocation(program, 'u_waveAngle'),
      waveAmplitude: gl.getUniformLocation(program, 'u_waveAmplitude'),
      maskSoftness: gl.getUniformLocation(program, 'u_maskSoftness'),
      blendAmount: gl.getUniformLocation(program, 'u_blendAmount'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      color0: gl.getUniformLocation(program, 'u_color0'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
    }

    const c0 = hexToRgb('#FF3624')
    const c1 = hexToRgb('#9EABFF')
    const c2 = hexToRgb('#FFAE00')
    const c3 = hexToRgb('#E29EFF')

    gl.uniform1f(uniforms.seed, seed)
    gl.uniform1f(uniforms.waveSpeed, 1.5)
    gl.uniform1f(uniforms.waveFreqX, 0.9)
    gl.uniform1f(uniforms.waveFreqY, 6)
    gl.uniform1f(uniforms.waveAngle, 105)
    gl.uniform1f(uniforms.waveAmplitude, 2.1)
    gl.uniform1f(uniforms.maskSoftness, 0.74)
    gl.uniform1f(uniforms.blendAmount, 0.54)
    gl.uniform3fv(uniforms.color0, c0)
    gl.uniform3fv(uniforms.color1, c1)
    gl.uniform3fv(uniforms.color2, c2)
    gl.uniform3fv(uniforms.color3, c3)

    let raf = 0
    let start = performance.now()
    let disposed = false

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uniforms.resolution, w, h)
    }

    const draw = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(draw)
      if (!activeRef.current) return
      resize()
      gl.uniform1f(uniforms.time, (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    resize()
    raf = requestAnimationFrame(draw)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [seed])

  return (
    <canvas
      aria-hidden="true"
      className={cn('absolute inset-0 h-full w-full', className)}
      ref={canvasRef}
    />
  )
}
