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
 *
 * The laptop of the makeover film works the same way ([data-laptop3d] rig, Laptop.astro, model
 * public/models/macbook.glb): its lid turns with the CSS lid (hinge.ts), the logo on the back is cut
 * away (trademark) and it is recoloured silver, like the phone. It loads only when first shown.
 */
import {
  ACESFilmicToneMapping,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector2,
  WebGLRenderer,
  Vector3,
  type BufferAttribute,
  type Material,
  type Object3D,
} from "three";
import { lapUnit, lidLift, lidTurn } from "./hinge";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Resolved from this script's own address (works on the site and in the relative-link preview).
// Concatenated so the bundler leaves it alone (the file lives in public/, not next to this script).
const MODEL = new URL("../models/" + "iphone.glb", import.meta.url).href;
const LAPTOP = new URL("../models/" + "macbook.glb", import.meta.url).href;
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

function loadGltf(url: string) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  // The preview host (scripts/export-artifact.mjs) cannot serve .glb: there the model ships as base64 text.
  return url.endsWith(".txt")
    ? fetch(url)
        .then((r) => r.text())
        .then((t) =>
          loader.parseAsync(
            Uint8Array.from(atob(t.trim()), (c) => c.charCodeAt(0)).buffer,
            "",
          ),
        )
    : loader.loadAsync(url);
}

let modelPromise: Promise<Object3D> | null = null;
function loadModel() {
  if (modelPromise) return modelPromise;
  const gltf = loadGltf(MODEL);
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

// Laptop model facts (units ~cm): see hinge.ts for the lid. LidMesh is the black bezel and the
// logo on the back: only its faces turned backwards (the logo) are dropped, the bezel stays.
const LAP_SCREEN_MAT = "sfCQkHOWyrsLmor";
const LAP_DARK = "3f3f45"; // the recoloured Space Black parts: back to silver aluminium
let laptopPromise: Promise<Object3D> | null = null;
function loadLaptop() {
  if (laptopPromise) return laptopPromise;
  laptopPromise = loadGltf(LAPTOP).then((g) => {
    g.scene.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      const mesh = o as Mesh;
      const mat = mesh.material as Material & { name: string; color?: Color; roughness?: number };
      if (mat.name === LAP_SCREEN_MAT) {
        // Flat black like the bezel, not glossy: a shiny glass caught the room light and showed as a
        // grey frame wherever the HTML screen does not cover it to the pixel.
        mesh.material = new MeshBasicMaterial({ color: 0x0b0c0e });
      } else if (mat.color?.getHexString() === LAP_DARK) {
        mat.color = new Color("#c9cacd");
        mat.roughness = 0.45;
      }
      if (mesh.name === "LidMesh" && mesh.geometry.index) {
        const geo = mesh.geometry;
        const idx = geo.index!;
        const nrm = geo.attributes.normal as BufferAttribute;
        // The glass faces (0, 0.34, 0.94): faces pointing the other way are on the back.
        const front = new Vector3(0, 0.34, 0.94);
        const v = new Vector3();
        const keep: number[] = [];
        for (let i = 0; i < idx.count; i += 3) {
          let d = 0;
          for (let k = 0; k < 3; k++) d += v.fromBufferAttribute(nrm, idx.getX(i + k)).dot(front);
          if (d / 3 > -0.5) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
        }
        geo.setIndex(keep);
      }
    });
    return g.scene;
  });
  return laptopPromise;
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

/** What a rig needs to know about its device: which element carries it, where its screen is. */
interface Fit {
  body: HTMLElement;
  screen: HTMLElement;
  /** Added to `body` once the model draws (the CSS body hides). */
  glClass: string;
  /** Canvas room round the body: [sides, top, bottom], px. */
  room(w: number, h: number): [number, number, number];
  /** Model to body (Three.js axes, px). */
  place(): Matrix4;
  /** Anything else that moves the model (the laptop's lid), as a key; applies it. */
  pose?(): string;
}

function phoneFit(eye: HTMLElement): Fit {
  const phone = eye.querySelector<HTMLElement>(".iph")!;
  const screen = phone.querySelector<HTMLElement>(".iph__screen")!;
  return {
    body: phone,
    screen,
    glClass: "iph--gl",
    // The phone's own box plus room to lift and turn, nothing more (fewer pixels to draw).
    room: (w, h) => [Math.round(w * 0.3), Math.round(h * 0.14), Math.round(h * 0.14)],
    // Its display centred on the HTML screen, a hair larger so no white corner shows.
    place() {
      const [sx, sy] = absPos(screen);
      const [phx, phy] = absPos(phone);
      const sw = screen.offsetWidth;
      const cx = sx - phx + sw / 2;
      const cy = sy - phy + screen.offsetHeight / 2;
      const s = (sw * 1.012) / SCREEN_W;
      return new Matrix4()
        .makeTranslation(cx, -cy, SCREEN_Z * s - 0.6)
        .multiply(new Matrix4().makeRotationY(Math.PI))
        .multiply(new Matrix4().makeScale(s, s, s));
    },
  };
}

function laptopFit(eye: HTMLElement, model: Object3D): Fit {
  const lap = eye.querySelector<HTMLElement>(".lap")!;
  const lid = lap.querySelector<HTMLElement>(".lap__lid")!;
  const pivot = model.getObjectByName("LidPivot")!;
  const y0 = pivot.position.y;
  return {
    body: lap,
    screen: lap.querySelector<HTMLElement>(".lap__screen")!,
    glClass: "lap--gl",
    // The base comes towards the eye under the lid: most of the room goes below.
    room: (w, h) => [Math.round(w * 0.16), Math.round(h * 0.12), Math.round(h * 0.6)],
    // The model's hinge (0, -0.5, -12.2) on the CSS lid's turning point (Laptop.astro).
    place() {
      const u = lapUnit(lap.offsetWidth);
      const hy = lid.offsetTop + lid.offsetHeight - 0.21 * u;
      return new Matrix4()
        .makeTranslation(lap.offsetWidth / 2, -hy, 0.34 * u)
        .multiply(new Matrix4().makeScale(u, u, u))
        .multiply(new Matrix4().makeTranslation(0, 0.5, 12.2));
    },
    pose() {
      const deg = parseFloat(lap.style.getPropertyValue("--lid")) || 20;
      pivot.rotation.x = lidTurn(deg);
      pivot.position.y = y0 + lidLift(deg);
      return String(deg);
    },
  };
}

class Rig {
  eye: HTMLElement;
  phone: HTMLElement;
  screen: HTMLElement;
  fit: Fit;
  canvas = document.createElement("canvas");
  renderer: WebGLRenderer;
  scene = new Scene();
  camera = new PerspectiveCamera();
  holder = new Group();
  last = "";
  visible = false;

  constructor(eye: HTMLElement, model: Object3D, fitFor: (eye: HTMLElement, model: Object3D) => Fit) {
    this.eye = eye;
    model = model.clone(true);
    this.fit = fitFor(eye, model);
    this.phone = this.fit.body;
    this.screen = this.fit.screen;
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
    this.holder.add(model);
    this.holder.matrixAutoUpdate = false;
    this.scene.add(this.holder);
    this.camera.matrixAutoUpdate = false;

    // iOS drops WebGL contexts under memory pressure or when Safari goes to the background: give the
    // phone back to the CSS body and stop drawing, instead of leaving an empty frame.
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.canvas.style.visibility = "hidden";
      this.phone.classList.remove(this.fit.glClass);
    });

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

  lost = false;

  loop = () => {
    if (!this.visible || this.lost) return;
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
    // Canvas: the device's own box plus the room it needs to move.
    const [mx, mt, mb] = this.fit.room(pw, ph);
    const x0 = phx - ex - mx;
    const y0 = phy - ey - mt;
    const cw = pw + 2 * mx;
    const ch = ph + mt + mb;
    const key = `${x0},${y0},${cw},${ch},${pox},${poy},${p}|${m.toString()}|${this.fit.pose?.() ?? ""}`;
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

    const local = this.fit.place();
    const css = new Matrix4().fromArray(
      m.toFloat64Array() as unknown as number[],
    );
    this.holder.matrix.copy(F).multiply(css).multiply(F).multiply(local);
    this.holder.matrixWorldNeedsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    if (!phone.classList.contains(this.fit.glClass)) phone.classList.add(this.fit.glClass);
    return true;
  }
}

/** The real 3D model only where it will run smoothly: WebGL available, no data saver, and not a
 * low-end phone (under 4 GB of memory or 4 cores: mid-range Android would stutter). Everyone else
 * keeps the CSS body, which looks almost the same and costs nothing. */
let glOk: boolean | null = null;
function canGL() {
  if (glOk !== null) return glOk;
  glOk = probeGL();
  return glOk;
}
function probeGL() {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4) return false;
  const probe = document.createElement("canvas");
  const gl = (probe.getContext("webgl2") ?? probe.getContext("webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;
  // Free the probe's context at once: iOS allows only a few live WebGL contexts per page.
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

export function initPhone3D() {
  const rigs = Array.from(document.querySelectorAll<HTMLElement>("[data-phone3d]"));
  if (!rigs.length || !canGL()) return;
  loadModel()
    .then((model) => rigs.forEach((eye) => new Rig(eye, model, phoneFit)))
    .catch(() => {
      /* The CSS phone stays: nothing to undo. */
    });
}

/**
 * Download and unpack the models once the page is idle (no drawing yet), so the 3D bodies are ready
 * before the visitor reaches them: the laptop used to arrive while its lid was already opening, and
 * the CSS stand-in (a black block) was seen turning into the real one.
 */
export function preloadModels() {
  if (!canGL()) return;
  loadModel().catch(() => {});
  if (window.matchMedia("(min-width: 900px)").matches) loadLaptop().catch(() => {});
}

/**
 * The makeover's laptop. The rig element gets data-gl="ready" and a "gl-ready" event once the model
 * draws, or as soon as it is clear it never will (no WebGL, model failed): the film waits for it
 * before opening the lid.
 */
export function initLaptop3D(eye: HTMLElement) {
  if (eye.dataset.gl) return;
  const done = () => {
    eye.dataset.gl = "ready";
    eye.dispatchEvent(new Event("gl-ready"));
  };
  if (!canGL()) return done();
  eye.dataset.gl = "loading";
  loadLaptop()
    .then((model) => {
      const rig = new Rig(eye, model, laptopFit);
      // Draw the first frame now, not when the band scrolls in.
      rig.renderer.compile(rig.scene, rig.camera);
      rig.frame();
      done();
    })
    .catch(done);
}
