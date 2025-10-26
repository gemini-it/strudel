/*
pianoroll.mjs - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/canvas/pianoroll.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Pattern, noteToMidi, freqToMidi, isPattern } from '@strudel/core';
import { getTheme, getDrawContext } from './draw.mjs';

const scale = (normalized, min, max) => normalized * (max - min) + min;
const getValue = (e) => {
  let { value } = e;
  if (typeof e.value !== 'object') {
    value = { value };
  }
  let { note, n, freq, s } = value;
  if (freq) {
    return freqToMidi(freq);
  }
  note = note ?? n;
  if (typeof note === 'string') {
    try {
      // TODO: n(run(32)).scale("D:minor") fails when trying to query negative time..
      return noteToMidi(note);
    } catch (err) {
      // console.warn(`error converting note to midi: ${err}`); // this spams to crazy
      return 0;
    }
  }
  if (typeof note === 'number') {
    return note;
  }
  if (s) {
    return '_' + s;
  }
  return value;
};

/**
 * Visualise un pattern comme un 'pianoroll' défilant, affiché en arrière-plan de l'éditeur. Pour afficher un pianoroll pour tous les patterns en cours d'exécution, utilisez `all(pianoroll)`. Pour avoir un pianoroll qui apparaît en dessous
 * d'un pattern à la place, préfixez avec `_`, par ex. : `sound("bd sd")._pianoroll()`.
 *
 * @name pianoroll
 * @synonyms punchcard
 * @param {Object} options Objet contenant tous les paramètres optionnels suivants comme paires clé-valeur :
 * @param {integer} cycles nombre de cycles à afficher en même temps - par défaut 4
 * @param {number} playhead emplacement des notes actives sur l'axe temporel - 0 à 1, par défaut 0.5
 * @param {boolean} vertical affiche le roll verticalement - 0 par défaut
 * @param {boolean} labels affiche les étiquettes sur les notes individuelles (voir la fonction label) - 0 par défaut
 * @param {boolean} flipTime inverse la direction du roll - 0 par défaut
 * @param {boolean} flipValues inverse l'emplacement relatif des notes sur l'axe de valeur - 0 par défaut
 * @param {number} overscan recherche X cycles en dehors de la fenêtre de cycles pour afficher les notes à l'avance - 1 par défaut
 * @param {boolean} hideNegative masque les notes avec un temps négatif (avant de commencer à jouer le pattern) - 0 par défaut
 * @param {boolean} smear les notes laissent une trace solide - 0 par défaut
 * @param {boolean} fold les notes prennent toute la largeur de l'axe de valeur - 0 par défaut
 * @param {string} active couleur hexadécimale ou CSS des notes actives - par défaut #FFCA28
 * @param {string} inactive couleur hexadécimale ou CSS des notes inactives - par défaut #7491D2
 * @param {string} background couleur hexadécimale ou CSS de l'arrière-plan - par défaut transparent
 * @param {string} playheadColor couleur hexadécimale ou CSS de la ligne représentant la tête de lecture - par défaut blanc
 * @param {boolean} fill les notes sont remplies avec la couleur (sinon seule l'étiquette est affichée) - 0 par défaut
 * @param {boolean} fillActive les notes actives sont remplies avec la couleur - 0 par défaut
 * @param {boolean} stroke les notes sont affichées avec des bordures colorées - 0 par défaut
 * @param {boolean} strokeActive les notes actives sont affichées avec des bordures colorées - 0 par défaut
 * @param {boolean} hideInactive seules les notes actives sont affichées - 0 par défaut
 * @param {boolean} colorizeInactive utilise la couleur de la note pour les notes inactives - 1 par défaut
 * @param {string} fontFamily définit la police utilisée par les étiquettes de notes - par défaut 'monospace'
 * @param {integer} minMidi valeur de note minimale à afficher sur l'axe de valeur - par défaut 10
 * @param {integer} maxMidi valeur de note maximale à afficher sur l'axe de valeur - par défaut 90
 * @param {boolean} autorange calcule automatiquement les paramètres minMidi et maxMidi - 0 par défaut
 * @see _pianoroll
 * @example
 * note("c2 a2 eb2")
 * .euclid(5,8)
 * .s('sawtooth')
 * .lpenv(4).lpf(300)
 * .pianoroll({ labels: 1 })
 */

Pattern.prototype.pianoroll = function (options = {}) {
  let { cycles = 4, playhead = 0.5, overscan = 0, hideNegative = false, ctx = getDrawContext(), id = 1 } = options;

  let from = -cycles * playhead;
  let to = cycles * (1 - playhead);
  const inFrame = (hap, t) => (!hideNegative || hap.whole.begin >= 0) && hap.isWithinTime(t + from, t + to);
  this.draw(
    (haps, time) => {
      __pianoroll({
        ...options,
        time,
        ctx,
        haps: haps.filter((hap) => inFrame(hap, time)),
      });
    },
    {
      lookbehind: from - overscan,
      lookahead: to + overscan,
      id,
    },
  );
  return this;
};

export function pianoroll(arg) {
  if (isPattern(arg)) {
    // Single argument as a pattern
    // (to support `all(pianoroll)`)
    return arg.pianoroll();
  }
  // Single argument with option - return function to get the pattern
  // (to support `all(pianoroll(options))`)
  return (pat) => pat.pianoroll(arg);
}

export function __pianoroll({
  time,
  haps,
  cycles = 4,
  playhead = 0.5,
  flipTime = 0,
  flipValues = 0,
  hideNegative = false,
  inactive = getTheme().foreground,
  active = getTheme().foreground,
  background = 'transparent',
  smear = 0,
  playheadColor = getTheme().foreground,
  minMidi = 10,
  maxMidi = 90,
  autorange = 0,
  timeframe: timeframeProp,
  fold = 1,
  vertical = 0,
  labels = false,
  fill = 1,
  fillActive = false,
  strokeActive = true,
  stroke,
  hideInactive = 0,
  colorizeInactive = 1,
  fontFamily,
  ctx,
  id,
} = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  let from = -cycles * playhead;
  let to = cycles * (1 - playhead);

  if (id) {
    haps = haps.filter((hap) => hap.hasTag(id));
  }

  if (timeframeProp) {
    console.warn('timeframe is deprecated! use from/to instead');
    from = 0;
    to = timeframeProp;
  }
  const timeAxis = vertical ? h : w;
  const valueAxis = vertical ? w : h;
  let timeRange = vertical ? [timeAxis, 0] : [0, timeAxis]; // pixel range for time
  const timeExtent = to - from; // number of seconds that fit inside the canvas frame
  const valueRange = vertical ? [0, valueAxis] : [valueAxis, 0]; // pixel range for values
  let valueExtent = maxMidi - minMidi + 1; // number of "slots" for values, overwritten if autorange true
  let barThickness = valueAxis / valueExtent; // pixels per value, overwritten if autorange true
  let foldValues = [];
  flipTime && timeRange.reverse();
  flipValues && valueRange.reverse();

  // onQuery
  const { min, max, values } = haps.reduce(
    ({ min, max, values }, e) => {
      const v = getValue(e);
      return {
        min: v < min ? v : min,
        max: v > max ? v : max,
        values: values.includes(v) ? values : [...values, v],
      };
    },
    { min: Infinity, max: -Infinity, values: [] },
  );
  if (autorange) {
    minMidi = min;
    maxMidi = max;
    valueExtent = maxMidi - minMidi + 1;
  }
  foldValues = values.sort((a, b) =>
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : typeof a === 'number'
        ? 1
        : String(a).localeCompare(String(b)),
  );
  barThickness = fold ? valueAxis / foldValues.length : valueAxis / valueExtent;
  ctx.fillStyle = background;
  ctx.globalAlpha = 1; // reset!
  if (!smear) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillRect(0, 0, w, h);
  }
  haps.forEach((event) => {
    const isActive = event.whole.begin <= time && event.endClipped > time;
    let strokeCurrent = stroke ?? (strokeActive && isActive);
    let fillCurrent = (!isActive && fill) || (isActive && fillActive);
    if (hideInactive && !isActive) {
      return;
    }
    let color = event.value?.color;
    active = color || active;
    inactive = colorizeInactive ? color || inactive : inactive;
    color = isActive ? active : inactive;
    ctx.fillStyle = fillCurrent ? color : 'transparent';
    ctx.strokeStyle = color;
    const { velocity = 1, gain = 1 } = event.value || {};
    ctx.globalAlpha = velocity * gain;
    const timeProgress = (event.whole.begin - (flipTime ? to : from)) / timeExtent;
    const timePx = scale(timeProgress, ...timeRange);
    let durationPx = scale(event.duration / timeExtent, 0, timeAxis);
    const value = getValue(event);
    const valueProgress = fold
      ? foldValues.indexOf(value) / foldValues.length
      : (Number(value) - minMidi) / valueExtent;
    const valuePx = scale(valueProgress, ...valueRange);
    let margin = 0;
    const offset = scale(time / timeExtent, ...timeRange);
    let coords;
    if (vertical) {
      coords = [
        valuePx + 1 - (flipValues ? barThickness : 0), // x
        timeAxis - offset + timePx + margin + 1 - (flipTime ? 0 : durationPx), // y
        barThickness - 2, // width
        durationPx - 2, // height
      ];
    } else {
      coords = [
        timePx - offset + margin + 1 - (flipTime ? durationPx : 0), // x
        valuePx + 1 - (flipValues ? 0 : barThickness), // y
        durationPx - 2, // widith
        barThickness - 2, // height
      ];
    }
    /* const xFactor = Math.sin(performance.now() / 500) + 1;
      coords[0] *= xFactor; */

    if (strokeCurrent) {
      ctx.strokeRect(...coords);
    }
    if (fillCurrent) {
      ctx.fillRect(...coords);
    }
    //ctx.ellipse(...ellipseFromRect(...coords))
    if (labels) {
      const defaultLabel = event.value.note ?? event.value.s + (event.value.n ? `:${event.value.n}` : '');
      const { label: inactiveLabel, activeLabel } = event.value;
      const customLabel = isActive ? activeLabel || inactiveLabel : inactiveLabel;
      const label = customLabel ?? defaultLabel;
      let measure = vertical ? durationPx : barThickness * 0.75;
      ctx.font = `${measure}px ${fontFamily || 'monospace'}`;
      // font color
      ctx.fillStyle = /* isActive &&  */ !fillCurrent ? color : 'black';
      ctx.textBaseline = 'top';
      ctx.fillText(label, ...coords);
    }
  });
  ctx.globalAlpha = 1; // reset!
  const playheadPosition = scale(-from / timeExtent, ...timeRange);
  // draw playhead
  ctx.strokeStyle = playheadColor;
  ctx.beginPath();
  if (vertical) {
    ctx.moveTo(0, playheadPosition);
    ctx.lineTo(valueAxis, playheadPosition);
  } else {
    ctx.moveTo(playheadPosition, 0);
    ctx.lineTo(playheadPosition, valueAxis);
  }
  ctx.stroke();
  return this;
}

export function getDrawOptions(drawTime, options = {}) {
  let [lookbehind, lookahead] = drawTime;
  lookbehind = Math.abs(lookbehind);
  const cycles = lookahead + lookbehind;
  const playhead = cycles !== 0 ? lookbehind / cycles : 0;
  return { fold: 1, ...options, cycles, playhead };
}

export const getPunchcardPainter =
  (options = {}) =>
  (ctx, time, haps, drawTime) =>
    __pianoroll({ ctx, time, haps, ...getDrawOptions(drawTime, options) });

Pattern.prototype.punchcard = function (options) {
  return this.onPaint(getPunchcardPainter(options));
};

/**
 * Affiche un pianoroll vertical avec des étiquettes d'événements.
 * Supporte toutes les mêmes options que pianoroll.
 *
 * @name wordfall
 */
Pattern.prototype.wordfall = function (options) {
  return this.punchcard({ vertical: 1, labels: 1, stroke: 0, fillActive: 1, active: 'white', ...options });
};

/* Pattern.prototype.pianoroll = function (options) {
  return this.onPaint((ctx, time, haps, drawTime) =>
    pianoroll({ ctx, time, haps, ...getDrawOptions(drawTime, { fold: 0, ...options }) }),
  );
}; */

export function drawPianoroll(options) {
  const { drawTime, ...rest } = options;
  __pianoroll({ ...getDrawOptions(drawTime), ...rest });
}
