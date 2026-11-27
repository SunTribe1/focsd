/**
 * The signature pad's stroke model: a list of strokes, each a list of points in CSS pixels. Every
 * function returns a new list and never changes the one it was given (undo keeps working on any
 * earlier list). Also the drawing of strokes and typed names, on a canvas and as SVG.
 */

/** @typedef {{ x: number, y: number }} Point */
/** @typedef {readonly Point[]} Stroke */
/** @typedef {readonly Stroke[]} Strokes */
/** @typedef {{ color: string, lineWidth: number }} Pen */
/** @typedef {{ width: number, height: number, color: string, font: string }} TextBox */

/** Space kept between a typed name and the pad's edges, in CSS pixels. */
const PADDING = 12;

/**
 * A new stroke that starts at `point`.
 * @param {Strokes} strokes
 * @param {Point} point
 * @returns {Strokes}
 */
export const startStroke = (strokes, point) => [...strokes, [point]];

/**
 * `point` added to the last stroke (or a new stroke when there is none).
 * @param {Strokes} strokes
 * @param {Point} point
 * @returns {Strokes}
 */
export const addPoint = (strokes, point) => {
  const last = strokes.at(-1);

  return last ? [...strokes.slice(0, -1), [...last, point]] : startStroke(strokes, point);
};

/**
 * Every stroke but the last.
 * @param {Strokes} strokes
 * @returns {Strokes}
 */
export const undoStroke = (strokes) => strokes.slice(0, -1);

/**
 * True when nothing has been drawn.
 * @param {Strokes} strokes
 */
export const isBlank = (strokes) => !strokes.some((s) => s.length > 0);

/** @param {number} n */
const round = (n) => Math.round(n * 10) / 10;

/**
 * One stroke as SVG path data; a single point is a dot (a zero-length line drawn with round caps).
 * @param {Stroke} stroke
 * @returns {string}
 */
export const strokePath = (stroke) =>
  stroke
    .map((pt, i) => `${i ? 'L' : 'M'}${round(pt.x)} ${round(pt.y)}`)
    .join('')
    .concat(stroke.length === 1 ? 'l0 0' : '');

/**
 * `value` as a finite number, else 0 (so it is safe in markup).
 * @param {unknown} value
 */
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** @param {string} s */
const escapeXml = (s) => s.replaceAll(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * The font size that fits `text` across the box: half the height at most, shrunk for long names.
 * @param {number} width The text's width at `start`.
 * @param {number} boxWidth
 * @param {number} start
 */
const fitSize = (width, boxWidth, start) => {
  const room = Math.max(boxWidth - PADDING * 2, 1);

  return width > room ? (start * room) / width : start;
};

/**
 * The strokes (or a typed name, when `text` is set) as a standalone SVG image.
 * @param {Strokes} strokes
 * @param {Pen & { width: number, height: number, text?: string, font?: string, fontSize?: number }} options
 *   `fontSize` is what `paintText` returned for the same box (half the height by default).
 * @returns {string}
 */
export function toSvg(
  strokes,
  { width: rawWidth, height: rawHeight, color, lineWidth: rawLineWidth, text = '', font = '', fontSize: rawFontSize },
) {
  // Numbers from script can be anything (a string from a property write): never put them in markup as given.
  const width = number(rawWidth);
  const height = number(rawHeight);
  const lineWidth = number(rawLineWidth);
  const fontSize = number(rawFontSize ?? height * 0.45);
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  const fill = escapeXml(color);

  const body = text.trim()
    ? `<text x="${PADDING}" y="${round(height * 0.65)}" font-family="${escapeXml(font)}" font-style="italic" font-size="${round(fontSize)}" fill="${fill}">${escapeXml(text.trim())}</text>`
    : `<path d="${strokes.map(strokePath).join('')}" fill="none" stroke="${fill}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `${open}${body}</svg>`;
}

/**
 * Set the pen on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Pen} pen
 */
const usePen = (ctx, { color, lineWidth }) => Object.assign(ctx, { strokeStyle: color, lineWidth, lineCap: 'round', lineJoin: 'round' });

/**
 * Paint every stroke, each as one path.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Strokes} strokes
 * @param {Pen} pen
 */
export function paintStrokes(ctx, strokes, pen) {
  usePen(ctx, pen);

  for (const stroke of strokes) {
    const [first] = stroke;

    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);

    // A lone point still draws a dot: a zero-length line with round caps.
    for (const pt of stroke.length === 1 ? stroke : stroke.slice(1)) ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }
}

/**
 * Paint a typed name in italic, as large as fits the box.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {TextBox} box
 * @returns {number} The font size used (0 when there was nothing to paint).
 */
export function paintText(ctx, text, { width, height, color, font }) {
  const name = text.trim();

  if (!name) return 0;
  const start = height * 0.45;
  Object.assign(ctx, { font: `italic ${start}px ${font}` });
  const size = fitSize(ctx.measureText(name).width, width, start);
  Object.assign(ctx, { font: `italic ${round(size)}px ${font}`, fillStyle: color, textBaseline: 'alphabetic' });
  ctx.fillText(name, PADDING, height * 0.65);

  return size;
}

/**
 * The canvas as a `signature.png` File, made at once (no waiting for `toBlob`), or null when the
 * canvas gave no PNG (a blank data URL, or no canvas support).
 * @param {HTMLCanvasElement} canvas
 * @returns {File | null}
 */
export function pngFile(canvas) {
  const [head, data] = String(canvas.toDataURL('image/png')).split(',');

  if (head !== 'data:image/png;base64' || !data) return null;
  const bytes = Uint8Array.from(atob(data), (c) => c.codePointAt(0) ?? 0);

  return new File([bytes], 'signature.png', { type: 'image/png' });
}
