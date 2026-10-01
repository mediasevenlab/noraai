import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Same smoke motion as registration, on the feature-card gray (#f7f7f7).
 * Wisps are a clean neutral gray one step darker than that field.
 */
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

  float luma=dot(clamp(col,0.,1.),vec3(.2126,.7152,.0722));
  // Bright filaments, one clean step darker than #f7f7f7. No color cast.
  float cloud=smoothstep(.08,.42,luma);
  vec3 field=vec3(247./255.);
  vec3 ink=vec3(212./255.);
  col=mix(field,ink,cloud);
  col=clamp(col,0.,1.);
  O=vec4(col,1);
}`

/** Unused by the shader; kept so the uniform location stays valid. */
const SMOKE_COLOR: [number, number, number] = [212 / 255, 212 / 255, 212 / 255]

type ProgramUniforms = {
  resolution: WebGLUniformLocation | null
  time: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
}

class Renderer {
  private readonly vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private program: WebGLProgram | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private uniforms: ProgramUniforms | null = null
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) throw new Error('WebGL2 is not available')
    this.gl = gl
    this.setup()
    this.init()
  }

  updateScale() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width < 1 || height < 1) return
    const nextWidth = Math.round(width * dpr)
    const nextHeight = Math.round(height * dpr)
    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth
      this.canvas.height = nextHeight
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`)
    }
  }

  reset() {
    const { gl, program, vs, fs, buffer } = this
    if (program) {
      if (vs) {
        gl.detachShader(program, vs)
        gl.deleteShader(vs)
      }
      if (fs) {
        gl.detachShader(program, fs)
        gl.deleteShader(fs)
      }
      gl.deleteProgram(program)
    }
    if (buffer) gl.deleteBuffer(buffer)
    this.program = null
    this.vs = null
    this.fs = null
    this.buffer = null
    this.uniforms = null
  }

  private setup() {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!this.vs || !this.fs || !program) return
    this.compile(this.vs, this.vertexSrc)
    this.compile(this.fs, fragmentShaderSource)
    this.program = program
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(`Program linking error: ${gl.getProgramInfoLog(this.program)}`)
    }
  }

  private init() {
    const { gl, program } = this
    if (!program) return
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    this.uniforms = {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      u_color: gl.getUniformLocation(program, 'u_color'),
    }
  }

  render(now = 0) {
    const { gl, program, buffer, canvas, uniforms } = this
    if (!program || !uniforms || !gl.isProgram(program)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.time, now * 1e-3 + 12)
    gl.uniform3fv(uniforms.u_color, SMOKE_COLOR)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

export default function GraySmoke({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: Renderer
    try {
      renderer = new Renderer(canvas)
    } catch {
      return
    }
    rendererRef.current = renderer

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.updateScale()
    renderer.render(0)

    let animationFrameId = 0
    if (!reduceMotion) {
      const loop = (now: number) => {
        if (document.visibilityState !== 'hidden') renderer.render(now)
        animationFrameId = requestAnimationFrame(loop)
      }
      animationFrameId = requestAnimationFrame(loop)
    }

    const resizeObserver = new ResizeObserver(() => renderer.updateScale())
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrameId)
      renderer.reset()
      rendererRef.current = null
    }
  }, [])

  return (
    <canvas
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 block size-full', className)}
      ref={canvasRef}
    />
  )
}
