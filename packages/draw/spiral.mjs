import { Pattern } from '@strudel/core';
import { getTheme } from './draw.mjs';

// polar coords -> xy
function fromPolar(angle, radius, cx, cy) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [cx + Math.cos(radians) * radius, cy + Math.sin(radians) * radius];
}

const xyOnSpiral = (angle, margin, cx, cy, rotate = 0) => fromPolar((angle + rotate) * 360, margin * angle, cx, cy); // TODO: logSpiral

// draw spiral / segment of spiral
function spiralSegment(options) {
  let {
    ctx,
    from = 0,
    to = 3,
    margin = 50,
    cx = 100,
    cy = 100,
    rotate = 0,
    thickness = margin / 2,
    color = getTheme().foreground,
    cap = 'round',
    stretch = 1,
    fromOpacity = 1,
    toOpacity = 1,
  } = options;
  from *= stretch;
  to *= stretch;
  rotate *= stretch;
  ctx.lineWidth = thickness;
  ctx.lineCap = cap;
  ctx.strokeStyle = color;
  ctx.globalAlpha = fromOpacity;

  ctx.beginPath();
  let [sx, sy] = xyOnSpiral(from, margin, cx, cy, rotate);
  ctx.moveTo(sx, sy);

  const increment = 1 / 60;
  let angle = from;
  while (angle <= to) {
    const [x, y] = xyOnSpiral(angle, margin, cx, cy, rotate);
    //ctx.lineWidth = angle*thickness;
    ctx.globalAlpha = ((angle - from) / (to - from)) * toOpacity;
    ctx.lineTo(x, y);
    angle += increment;
  }
  ctx.stroke();
}

function drawSpiral(options) {
  let {
    stretch = 1,
    size = 80,
    thickness = size / 2,
    cap = 'butt', // round butt squar,
    inset = 3, // start angl,
    playheadColor = '#ffffff',
    playheadLength = 0.02,
    playheadThickness = thickness,
    padding = 0,
    steady = 1,
    activeColor = getTheme().foreground,
    inactiveColor = getTheme().gutterForeground,
    colorizeInactive = 0,
    fade = true,
    // logSpiral = true,
    ctx,
    time,
    haps,
    drawTime,
    id,
  } = options;

  if (id) {
    haps = haps.filter((hap) => hap.hasTag(id));
  }

  const [w, h] = [ctx.canvas.width, ctx.canvas.height];
  ctx.clearRect(0, 0, w * 2, h * 2);
  const [cx, cy] = [w / 2, h / 2];
  const settings = {
    margin: size / stretch,
    cx,
    cy,
    stretch,
    cap,
    thickness,
  };

  const playhead = {
    ...settings,
    thickness: playheadThickness,
    from: inset - playheadLength,
    to: inset,
    color: playheadColor,
  };

  const [min] = drawTime;
  const rotate = steady * time;
  haps.forEach((hap) => {
    const isActive = hap.whole.begin <= time && hap.endClipped > time;
    const from = hap.whole.begin - time + inset;
    const to = hap.endClipped - time + inset - padding;
    const hapColor = hap.value?.color || activeColor;
    const color = colorizeInactive || isActive ? hapColor : inactiveColor;
    const opacity = fade ? 1 - Math.abs((hap.whole.begin - time) / min) : 1;
    spiralSegment({
      ctx,
      ...settings,
      from,
      to,
      rotate,
      color,
      fromOpacity: opacity,
      toOpacity: opacity,
    });
  });
  spiralSegment({
    ctx,
    ...playhead,
    rotate,
  });
}

/**
 * Affiche un visuel en spirale.
 *
 * @name spiral
 * @param {Object} options Objet contenant tous les paramètres optionnels suivants comme paires clé-valeur :
 * @param {number} stretch contrôle le ratio rotations par cycle, où 1 = 1 cycle / 360 degrés
 * @param {number} size le diamètre de la spirale
 * @param {number} thickness épaisseur de ligne
 * @param {string} cap style des extrémités de ligne : butt (par défaut), round, square
 * @param {string} inset nombre de rotations avant que la spirale ne démarre (par défaut 3)
 * @param {string} playheadColor couleur de la tête de lecture, par défaut blanc
 * @param {number} playheadLength longueur de la tête de lecture en rotations, par défaut 0.02
 * @param {number} playheadThickness épaisseur de la tête de lecture, par défaut thickness
 * @param {number} padding espace autour de la spirale
 * @param {number} steady stabilité de la spirale vs tête de lecture. 1 = la spirale ne bouge pas, la tête de lecture oui.
 * @param {number} activeColor couleur du segment actif. par défaut foreground du thème
 * @param {number} inactiveColor couleur des segments inactifs. par défaut gutterForeground du thème
 * @param {boolean} colorizeInactive si oui ou non coloriser les segments inactifs, par défaut 0
 * @param {boolean} fade si oui ou non le passé et le futur doivent s'estomper. par défaut 1
 * @param {boolean} logSpiral si oui ou non la spirale doit être logarithmique. par défaut 0
 * @example
 * note("c2 a2 eb2")
 * .euclid(5,8)
 * .s('sawtooth')
 * .lpenv(4).lpf(300)
 * ._spiral({ steady: .96 })
 */
Pattern.prototype.spiral = function (options = {}) {
  return this.onPaint((ctx, time, haps, drawTime) => drawSpiral({ ctx, time, haps, drawTime, ...options }));
};
