/**
 * The real 3D iPhone. A detailed model (public/models/iphone.glb, see docs/CREDITI.md) is drawn
 * with WebGL under the HTML phone and copies its 3D pose every frame: the HTML keeps the live
 * screen (site, notifications, Dynamic Island, every animation in hero.ts and makeover.ts),
 * the model supplies the body, the frame, the back and the cameras.
 *
 * How the two line up: each rig element ([data-phone3d]) has a CSS perspective. We multiply the
 * CSS transforms from the phone up to the rig (offsets, transform-origin, matrices), convert the
 * result to Three.js axes (y up) and render with a camera that reproduces the CSS perspective.
 * Until the model is ready, or without WebGL, the CSS phone (IPhone.astro, solid) stays as is.
 */
import {
  ACESFilmicToneMapping,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector2,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Resolved from this script's own address (works on the site and in the relative-link preview).
// Concatenated so the bundler leaves it alone (the file lives in public/, not next to this script).
const MODEL = new URL("../models/" + "iphone.glb", import.meta.url).href;
// Model facts (metres): the display is 71.3 mm wide, its glass 6.2 mm in front of the centre,
// facing -z. Two parts draw the maker's logo on the back: hidden (trademark).
const SCREEN_W = 0.0713;
const SCREEN_Z = -0.0062;
const HIDE = ["IykfmVvLplTsTEW", "TakBsdEjEytCAMK"];
const SCREEN_MAT = "pIJKfZsazmcpEiU";
// White titanium: back glass, frame and camera plateau recoloured.
const FRAME_MAT = "eShKpuMNVJTRrgg";
const TINT: Record<string, string> = {
  oZRkkORNzkufnGD: "#e9e6e0",
  yhcAXNGcJWCqtIS: "#e9e6e0",
  bCgzXjHOanGdTFV: "#cfcac2",
};

let modelPromise: Promise<Object3D> | null = null;
function loadModel() {
  if (modelPromise) return modelPromise;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  // The preview host (scripts/export-artifact.mjs) cannot serve .glb: there the model ships as base64 text.
  const gltf = MODEL.endsWith(".txt")
    ? fetch(MODEL)
        .then((r) => r.text())
        .then((t) =>
          loader.parseAsync(
            Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0)).buffer,
            "",
          ),
        )
    : loader.loadAsync(MODEL);
  modelPromise = gltf.then((g) => {
    g.scene.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      const mesh = o as Mesh;
      if (HIDE.includes(mesh.name)) mesh.visible = false;
      const mat = mesh.material as Material & { name: string; color?: Color };
      if (mat.name === SCREEN_MAT) {
        // The HTML screen sits on top: under it, plain black glass.
        mesh.material = new MeshPhysicalMaterial({
          color: 0x000000,
          roughness: 0.08,
          metalness: 0,
        });
      } else if (mat.name === FRAME_MAT) {
        // The frame's texture is black titanium: replace it with brushed light titanium.
        mesh.material = new MeshPhysicalMaterial({
          color: 0xd6d1c9,
          metalness: 1,
          roughness: 0.32,
          clearcoat: 0.2,
        });
      } else if (TINT[mat.name] && mat.color) {
        mat.color = new Color(TINT[mat.name]);
      }
    });
    return g.scene;
  });
  return modelPromise;
}

const F = new Matrix4().makeScale(1, -1, 1);

function absPos(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (
    let n: HTMLElement | null = el;
    n;
    n = n.offsetParent as HTMLElement | null
  ) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return [x, y];
}

/** CSS transform from `el`'s own box to `eye`'s box (CSS axes, px). */
function chain(el: HTMLElement, eye: HTMLElement) {
  let m = new DOMMatrix();
  const [ex, ey] = absPos(eye);
  for (let n: HTMLElement | null = el; n && n !== eye; n = n.parentElement) {
    const p = n.parentElement!;
    const [nx, ny] = absPos(n);
    const [px, py] = p === eye ? [ex, ey] : absPos(p);
    let local = new DOMMatrix().translate(nx - px, ny - py);
    const cs = getComputedStyle(n);
    if (cs.transform && cs.transform !== "none") {
      const [ox, oy, oz = 0] = cs.transformOrigin.split(" ").map(parseFloat);
      local = local
        .translate(ox, oy, oz)
        .multiply(new DOMMatrix(cs.transform))
        .translate(-ox, -oy, -oz);
    }
    m = local.multiply(m);
  }
  return m;
}

class Rig {
  eye: HTMLElement;
  phone: HTMLElement;
  screen: HTMLElement;
  canvas = document.createElement("canvas");
  renderer: WebGLRenderer;
  scene = new Scene();
  camera = new PerspectiveCamera();
  holder = new Group();
  last = "";
  visible = false;

  constructor(eye: HTMLElement, model: Object3D) {
    this.eye = eye;
    this.phone = eye.querySelector<HTMLElement>(".iph")!;
    this.screen = this.phone.querySelector<HTMLElement>(".iph__screen")!;
    this.canvas.className = "phone3d";
    this.canvas.setAttribute("aria-hidden", "true");
    eye.prepend(this.canvas);
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    // Phones have 3x screens and less GPU: 1.5x is sharp enough; while the phone moves, 1x
    // (motion hides it), then one sharp frame once it stops.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.sharp = Math.min(window.devicePixelRatio, coarse ? 1.5 : 1.75);
    this.moving = coarse ? 1 : this.sharp;
    this.renderer.setPixelRatio(this.sharp);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmrem.dispose();
    this.holder.add(model.clone(true));
    this.holder.matrixAutoUpdate = false;
    this.scene.add(this.holder);
    this.camera.matrixAutoUpdate = false;

    new IntersectionObserver(
      ([e]) => {
        this.visible = e.isIntersecting;
        if (this.visible) this.loop();
      },
      // Start drawing a little before it scrolls in.
      { rootMargin: "25% 0px" },
    ).observe(eye);
    // Compile the shaders and draw once while the browser is idle, not when the phone first
    // scrolls into view (on phones that first draw is a visible stall).
    const warm = () => {
      this.renderer.compile(this.scene, this.camera);
      this.frame();
    };
    if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2500 });
    else setTimeout(warm, 300);
  }

  sharp = 1;
  moving = 1;
  changedAt = 0;
  blurry = false;

  loop = () => {
    if (!this.visible) return;
    if (this.frame()) {
      this.changedAt = performance.now();
    } else if (this.blurry && performance.now() - this.changedAt > 160) {
      // Still for a moment: redraw the last pose at full sharpness.
      this.renderer.setPixelRatio(this.sharp);
      this.renderer.render(this.scene, this.camera);
      this.blurry = false;
    }
    requestAnimationFrame(this.loop);
  };

  /** Draws the phone if its pose or box changed; returns whether it drew. */
  frame() {
    const eye = this.eye;
    const phone = this.phone;
    const pw = phone.offsetWidth;
    const ph = phone.offsetHeight;
    if (!pw || !ph || !eye.offsetWidth) return false;
    const ecs = getComputedStyle(eye);
    const p = parseFloat(ecs.perspective) || 1200;
    const [pox, poy] = ecs.perspectiveOrigin.split(" ").map(parseFloat);
    const m = chain(phone, eye);
    const [ex, ey] = absPos(eye);
    const [phx, phy] = absPos(phone);
    // Canvas: the phone's own box plus room to lift and turn, nothing more (fewer pixels to draw).
    const mx = Math.round(pw * 0.3);
    const my = Math.round(ph * 0.14);
    const x0 = phx - ex - mx;
    const y0 = phy - ey - my;
    const cw = pw + 2 * mx;
    const ch = ph + 2 * my;
    const key = `${x0},${y0},${cw},${ch},${pox},${poy},${p}|${m.toString()}`;
    if (key === this.last) return false;
    // Moving (a second change within a few frames): the lighter resolution.
    const ratio = performance.now() - this.changedAt < 100 ? this.moving : this.sharp;
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    this.blurry = ratio !== this.sharp;
    this.last = key;

    const size = this.renderer.getSize(new Vector2());
    if (size.x !== cw || size.y !== ch) {
      this.renderer.setSize(cw, ch, false);
      this.canvas.style.width = `${cw}px`;
      this.canvas.style.height = `${ch}px`;
    }
    // Moved with a transform: never a layout shift.
    this.canvas.style.transform = `translate(${x0}px, ${y0}px)`;

    // Camera: the CSS eye, `p` px in front of the perspective origin, looking straight in.
    const n = 10;
    const k = n / p;
    this.camera.matrixWorld.makeTranslation(pox, -poy, p);
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.camera.projectionMatrix.makePerspective(
      (x0 - pox) * k,
      (x0 + cw - pox) * k,
      (poy - y0) * k,
      (poy - (y0 + ch)) * k,
      n,
      p * 4,
    );
    this.camera.projectionMatrixInverse
      .copy(this.camera.projectionMatrix)
      .invert();

    // Model: its display centred on the HTML screen, a hair larger so no white corner shows.
    const [sx, sy] = absPos(this.screen);
    const sw = this.screen.offsetWidth;
    const cx = sx - phx + sw / 2;
    const cy = sy - phy + this.screen.offsetHeight / 2;
    const s = (sw * 1.012) / SCREEN_W;
    const local = new Matrix4()
      .makeTranslation(cx, -cy, SCREEN_Z * s - 0.6)
      .multiply(new Matrix4().makeRotationY(Math.PI))
      .multiply(new Matrix4().makeScale(s, s, s));
    const css = new Matrix4().fromArray(
      m.toFloat64Array() as unknown as number[],
    );
    this.holder.matrix.copy(F).multiply(css).multiply(F).multiply(local);
    this.holder.matrixWorldNeedsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    if (!phone.classList.contains("iph--gl")) phone.classList.add("iph--gl");
    return true;
  }
}

export function initPhone3D() {
  const rigs = Array.from(
    document.querySelectorAll<HTMLElement>("[data-phone3d]"),
  );
  if (!rigs.length) return;
  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;
  if (
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData
  )
    return;
  loadModel()
    .then((model) => rigs.forEach((eye) => new Rig(eye, model)))
    .catch(() => {
      /* The CSS phone stays: nothing to undo. */
    });
}
