import { useEffect, type RefObject } from 'react';

// ─── Shader sources ────────────────────────────────────────────────────────

const VERT_SRC = /* glsl */ `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

/**
 * Fragment shader — grid of rounded cells whose borders light up wherever
 * the cursor has recently been.
 *
 * Trail data is passed as an array of vec3: (x, y, influence).
 *   x, y       — canvas-pixel position (WebGL coords, y=0 at bottom)
 *   influence  — pre-computed on the JS side: 1.0 at head → 0.0 at tail
 *
 * Each cell's border brightness is the maximum influence contributed by
 * any trail point within HOVER_RADIUS pixels of the cell centre.
 */
const FRAG_SRC = /* glsl */ `
  precision mediump float;

  /* Trail: xy = position, z = influence (0–1). Inactive slots have z = 0. */
  const int TRAIL_MAX = 50;
  uniform vec3 u_trail[TRAIL_MAX];

  /* ── Grid geometry ─────────────────────────────────────── */
  const float GRID_SIZE     = 48.0;   /* cell pitch in px            */
  const float GRID_GAP      = 4.0;    /* gap between cells in px     */
  const float CORNER_RADIUS = 6.0;    /* cell corner radius in px    */
  const float BORDER_WIDTH  = 4.0;    /* border ring thickness in px */

  /* ── Interaction ───────────────────────────────────────── */
  const float HOVER_RADIUS  = 100.0;   /* per-point influence radius  */

  /* ── Colours ───────────────────────────────────────────── */
  const vec4 COLOR_BORDER_HOVER = vec4(0.557, 0.196, 0.004, 1.0); /* #8E3201 */

  void main() {
    vec2 fc = gl_FragCoord.xy;

    /* Grid cell */
    vec2 cellId     = floor(fc / GRID_SIZE);
    vec2 cellCenter = (cellId + 0.5) * GRID_SIZE;
    vec2 cellLocal  = fc - cellCenter;

    /* Rounded-box SDF */
    float halfSize = GRID_SIZE * 0.5 - GRID_GAP;
    vec2  q   = abs(cellLocal) - (vec2(halfSize) - vec2(CORNER_RADIUS));
    float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - CORNER_RADIUS;

    if (sdf > 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }

    /* Accumulate max influence from all trail points */
    float maxInfluence = 0.0;
    for (int i = 0; i < TRAIL_MAX; i++) {
      float trailInfluence = u_trail[i].z;
      if (trailInfluence <= 0.0) continue;
      float dist    = length(cellCenter - u_trail[i].xy);
      float spatial = 1.0 - smoothstep(0.0, HOVER_RADIUS, dist);
      maxInfluence  = max(maxInfluence, trailInfluence * spatial);
    }

    /* Border ring reacts; interior stays transparent */
    if (sdf > -BORDER_WIDTH) {
      gl_FragColor = mix(vec4(0.0), COLOR_BORDER_HOVER, maxInfluence);
    } else {
      gl_FragColor = vec4(0.0);
    }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error:\n${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program');
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error:\n${log}`);
  }
  return program;
}

// ─── Trail constants ───────────────────────────────────────────────────────
//
// TRAIL_MAX      — must match the constant in the shader above
// TRAIL_DURATION — how long (ms) each recorded point stays visible
// TRAIL_MIN_DIST — minimum px gap between consecutive recorded points;
//                  keeps the snake density consistent regardless of speed

const TRAIL_MAX      = 50;
const TRAIL_DURATION = 500;
const TRAIL_MIN_DIST = 8;

interface TrailPoint {
  x: number;
  y: number;
  t: number; // timestamp from performance.now()
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Renders an interactive WebGL grid onto `canvasRef`.
 * Mouse events are captured on `containerRef`.
 *
 * As the cursor moves across the container, a trail of recently-visited
 * positions is recorded and passed to the fragment shader.  Cell borders
 * near any live trail point glow with the highlight colour, fading to
 * transparent as each point ages out over `TRAIL_DURATION` ms.
 * The result is a snake-like glowing path that follows the cursor.
 */
export const useWebGLGrid = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLElement | null>,
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // ── WebGL context ──────────────────────────────────────────────────────
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) {
      console.warn('useWebGLGrid: WebGL is not supported in this browser.');
      return;
    }

    // ── Shaders & program ──────────────────────────────────────────────────
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = linkProgram(gl, vert, frag);

    // ── Geometry: fullscreen quad ──────────────────────────────────────────
    // prettier-ignore
    const vertices = new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1,
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // ── Attribute & uniform locations ──────────────────────────────────────
    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uTrail    = gl.getUniformLocation(program, 'u_trail[0]');

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // ── Blending ───────────────────────────────────────────────────────────
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // ── Trail state ────────────────────────────────────────────────────────
    const trail: TrailPoint[] = [];
    // Flat Float32Array passed to the shader: [x0,y0,inf0, x1,y1,inf1, ...]
    const trailData = new Float32Array(TRAIL_MAX * 3);
    let rafId: number | null = null;

    // ── Render ─────────────────────────────────────────────────────────────
    const render = (now: number) => {
      // Build trail uniform data with time-based influence per point
      trailData.fill(0);
      for (let i = 0; i < trail.length; i++) {
        const age = now - trail[i].t;
        const influence = Math.max(0, 1 - age / TRAIL_DURATION);
        trailData[i * 3]     = trail[i].x;
        trailData[i * 3 + 1] = trail[i].y;
        trailData[i * 3 + 2] = influence;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3fv(uTrail, trailData);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // ── Animation loop ─────────────────────────────────────────────────────
    const tick = (now: number) => {
      // Drop points that have fully faded
      const cutoff = now - TRAIL_DURATION;
      while (trail.length > 0 && trail[trail.length - 1].t < cutoff) {
        trail.pop();
      }

      render(now);

      if (trail.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const startLoop = () => {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    // ── Event handlers ─────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const rect   = container.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      // WebGL Y is flipped relative to DOM
      const y = canvas.height - (e.clientY - rect.top) * scaleY;
      const now = performance.now();

      // Only record a new point when the cursor has moved far enough;
      // this keeps snake density consistent regardless of cursor speed.
      const last = trail[0];
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        if (dx * dx + dy * dy < TRAIL_MIN_DIST * TRAIL_MIN_DIST) return;
      }

      trail.unshift({ x, y, t: now });
      if (trail.length > TRAIL_MAX) trail.length = TRAIL_MAX;

      startLoop();
    };

    const onMouseLeave = () => {
      // Let the existing trail fade out naturally rather than snapping off
      startLoop();
    };

    // ── Resize ─────────────────────────────────────────────────────────────
    const syncSize = () => {
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
      render(performance.now());
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    syncSize();

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(vbo);
    };
  }, [canvasRef, containerRef]);
};
