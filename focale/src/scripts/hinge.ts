/**
 * The laptop's hinge, shared by the film (makeover.ts, CSS lid) and the WebGL body (phone3d.ts), so
 * the live HTML screen and the 3D lid always turn together. Angles are the CSS lid's rotateX:
 * 20deg is the model's own pose (open, the glass leaning back), LID_SHUT lies flat on the keys.
 */
export const LID_OPEN = 20;
const TURN = 1.94; // radians, the model's LidPivot from open to shut
export const LID_SHUT = LID_OPEN - (TURN * 180) / Math.PI;

/** Radians on the model's LidPivot for a CSS lid angle. */
export const lidTurn = (deg: number) => ((LID_OPEN - deg) * Math.PI) / 180;

/**
 * How much the lid is lifted (model units) at that angle: the hinge sits under the keys, so a bare
 * turn would sink the closing glass into the keyboard. The glass's bottom edge (1.75 over and 1.0
 * behind the hinge) is held at least 1.2 over it.
 */
export const lidLift = (deg: number) => {
  const t = lidTurn(deg);
  return Math.max(0, 1.2 - (1.75 * Math.cos(t) + Math.sin(t)));
};

/** The model is 35.48 units wide: px per unit for a laptop drawn `width` px wide. */
export const lapUnit = (width: number) => width / 35.48;
