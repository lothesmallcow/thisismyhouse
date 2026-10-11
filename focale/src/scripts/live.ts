/**
 * Living background shader (see LiveBackground.astro). Domain-warped value noise blends four
 * warm colours; time drifts it, the pointer adds a soft glow, scroll warms the palette.
 * Renders at reduced resolution and about 30 fps, pauses when the tab is hidden.
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float s;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;vec2 q=uv*vec2(r.x/r.y,1.)*1.35;
  float T=t*.035;
  vec2 w=vec2(fbm(q+vec2(T,-T*.7)),fbm(q+vec2(-T*.6,T)+5.2));
  float f=fbm(q+1.6*w+vec2(0.,s*.6));
  vec3 latte=vec3(1.,.973,.949);
  vec3 pesca=vec3(1.,.86,.77);
  vec3 miele=vec3(1.,.84,.62);
  vec3 mand=vec3(1.,.66,.5);
  vec3 c=mix(latte,pesca,smoothstep(.35,.75,f));
  c=mix(c,miele,smoothstep(.55,.9,w.x)*.55);
  c=mix(c,mand,smoothstep(.55,.95,f*w.y*1.6)*(.38+.22*s));
  vec2 mp=m*vec2(r.x/r.y,1.);vec2 pp=uv*vec2(r.x/r.y,1.);
  c=mix(c,miele,.22*exp(-6.*dot(pp-mp,pp-mp)));
  c=mix(latte,c,.9);
  c+=(h(gl_FragCoord.xy+fract(t))-.5)/255.*2.;
  gl_FragColor=vec4(c,1.);
}`;

export function initLive() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-live]");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, "r");
  const uT = gl.getUniformLocation(prog, "t");
  const uM = gl.getUniformLocation(prog, "m");
  const uS = gl.getUniformLocation(prog, "s");

  const scale = 0.5;
  const resize = () => {
    canvas.width = Math.max(1, Math.round(innerWidth * scale));
    canvas.height = Math.max(1, Math.round(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  addEventListener("resize", resize);

  const mouse = { x: 0.75, y: 0.6, tx: 0.75, ty: 0.6 };
  addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / innerWidth;
    mouse.ty = 1 - e.clientY / innerHeight;
  }, { passive: true });

  let last = 0;
  let running = true;
  const t0 = performance.now();
  const frame = (now: number) => {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - last < 33) return;
    last = now;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.uniform1f(uS, Math.min(1, scrollY / max));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  requestAnimationFrame(frame);
  canvas.classList.add("is-on");
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });
}
