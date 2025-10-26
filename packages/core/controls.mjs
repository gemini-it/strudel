/*
controls.mjs - Registers audio controls for pattern manipulation and effects.
Copyright (C) 2022 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/core/controls.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Pattern, register, reify } from './pattern.mjs';

export function createParam(names) {
  let isMulti = Array.isArray(names);
  names = !isMulti ? [names] : names;
  const name = names[0];

  // todo: make this less confusing
  const withVal = (xs) => {
    let bag;
    // check if we have an object with an unnamed control (.value)
    if (typeof xs === 'object' && xs.value !== undefined) {
      bag = { ...xs }; // grab props that are already there
      xs = xs.value; // grab the unnamed control for this one
      delete bag.value;
    }
    if (isMulti && Array.isArray(xs)) {
      const result = bag || {};
      xs.forEach((x, i) => {
        if (i < names.length) {
          result[names[i]] = x;
        }
      });
      return result;
    } else if (bag) {
      bag[name] = xs;
      return bag;
    } else {
      return { [name]: xs };
    }
  };

  // todo: make this less confusing
  const func = function (value, pat) {
    if (!pat) {
      return reify(value).withValue(withVal);
    }
    if (typeof value === 'undefined') {
      return pat.fmap(withVal);
    }
    return pat.set(reify(value).withValue(withVal));
  };
  Pattern.prototype[name] = function (value) {
    return func(value, this);
  };
  return func;
}

// maps control alias names to the "main" control name
const controlAlias = new Map();

export function isControlName(name) {
  return controlAlias.has(name);
}

export function registerControl(names, ...aliases) {
  const name = Array.isArray(names) ? names[0] : names;
  let bag = {};
  bag[name] = createParam(names);
  controlAlias.set(name, name);
  aliases.forEach((alias) => {
    bag[alias] = bag[name];
    controlAlias.set(alias, name);
    Pattern.prototype[alias] = Pattern.prototype[name];
  });
  return bag;
}

/**
 * Sélectionne un son / échantillon par nom. En utilisant la mininotation, vous pouvez également fournir en option les paramètres 'n' et 'gain'
 * séparés par ':'.
 *
 * @name s
 * @param {string | Pattern} sound Le son / pattern de sons à choisir
 * @synonyms sound
 * @example
 * s("bd hh")
 * @example
 * s("bd:0 bd:1 bd:0:0.3 bd:1:1.4")
 *
 */
export const { s, sound } = registerControl(['s', 'n', 'gain'], 'sound');

/**
 * Position dans la table d'onde de l'oscillateur à table d'onde
 *
 * @name wt
 * @param {number | Pattern} position Position dans la table d'onde de 0 à 1
 * @synonyms wavetablePosition
 * @example
 * s("squelch").bank("wt_digital").seg(8).note("F1").wt("0 0.25 0.5 0.75 1")
 */
export const { wt, wavetablePosition } = registerControl('wt', 'wavetablePosition');

/**
 * Quantité d'enveloppe appliquée à l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name wtenv
 * @param {number | Pattern} amount entre 0 et 1
 */
export const { wtenv } = registerControl('wtenv');
/**
 * Temps d'attaque de l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name wtattack
 * @synonyms wtatt
 * @param {number | Pattern} time temps d'attaque en secondes
 */
export const { wtattack, wtatt } = registerControl('wtattack', 'wtatt');

/**
 * Temps de déclin de l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name wtdecay
 * @synonyms wtdec
 * @param {number | Pattern} time temps de déclin en secondes
 */
export const { wtdecay, wtdec } = registerControl('wtdecay', 'wtdec');

/**
 * Niveau de maintien de l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name wtsustain
 * @synonyms wtsus
 * @param {number | Pattern} gain niveau de maintien (0 à 1)
 */
export const { wtsustain, wtsus } = registerControl('wtsustain', 'wtsus');

/**
 * Temps de relâchement de l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name wtrelease
 * @synonyms wtrel
 * @param {number | Pattern} time temps de relâchement en secondes
 */
export const { wtrelease, wtrel } = registerControl('wtrelease', 'wtrel');

/**
 * Fréquence du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtrate
 * @param {number | Pattern} rate fréquence en hertz
 */
export const { wtrate } = registerControl('wtrate');
/**
 * fréquence synchronisée au cycle du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtsync
 * @param {number | Pattern} rate fréquence en cycles
 */
export const { wtsync } = registerControl('wtsync');

/**
 * Profondeur du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtdepth
 * @param {number | Pattern} depth profondeur de modulation
 */
export const { wtdepth } = registerControl('wtdepth');

/**
 * Forme du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtshape
 * @param {number | Pattern} shape Forme du lfo (0, 1, 2, ..)
 */
export const { wtshape } = registerControl('wtshape');

/**
 * Offset DC du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtdc
 * @param {number | Pattern} dcoffset offset dc. mettre à 0 pour unipolaire
 */
export const { wtdc } = registerControl('wtdc');

/**
 * Inclinaison du LFO pour la position de l'oscillateur à table d'onde
 *
 * @name wtskew
 * @param {number | Pattern} skew À quel point déformer la forme du LFO
 */
export const { wtskew } = registerControl('wtskew');

/**
 * Quantité de déformation (altération de la forme d'onde) à appliquer à l'oscillateur à table d'onde
 *
 * @name warp
 * @param {number | Pattern} amount Déformation de la table d'onde de 0 à 1
 * @synonyms wavetableWarp
 * @example
 * s("basique").bank("wt_digital").seg(8).note("F1").warp("0 0.25 0.5 0.75 1")
 *   .warpmode("spin")
 */
export const { warp, wavetableWarp } = registerControl('warp', 'wavetableWarp');

/**
 * Temps d'attaque de l'enveloppe de déformation de l'oscillateur à table d'onde
 *
 * @name warpattack
 * @synonyms warpatt
 * @param {number | Pattern} time temps d'attaque en secondes
 */
export const { warpattack, warpatt } = registerControl('warpattack', 'warpatt');

/**
 * Temps de déclin de l'enveloppe de déformation de l'oscillateur à table d'onde
 *
 * @name warpdecay
 * @synonyms warpdec
 * @param {number | Pattern} time temps de déclin en secondes
 */
export const { warpdecay, warpdec } = registerControl('warpdecay', 'warpdec');

/**
 * Niveau de maintien de l'enveloppe de déformation de l'oscillateur à table d'onde
 *
 * @name warpsustain
 * @synonyms warpsus
 * @param {number | Pattern} gain niveau de maintien (0 à 1)
 */
export const { warpsustain, warpsus } = registerControl('warpsustain', 'warpsus');

/**
 * Temps de relâchement de l'enveloppe de déformation de l'oscillateur à table d'onde
 *
 * @name warprelease
 * @synonyms warprel
 * @param {number | Pattern} time temps de relâchement en secondes
 */
export const { warprelease, warprel } = registerControl('warprelease', 'warprel');

/**
 * Fréquence du LFO pour la déformation de l'oscillateur à table d'onde
 *
 * @name warprate
 * @param {number | Pattern} rate fréquence en hertz
 */
export const { warprate } = registerControl('warprate');

/**
 * Profondeur du LFO pour la déformation de l'oscillateur à table d'onde
 *
 * @name warpdepth
 * @param {number | Pattern} depth profondeur de modulation
 */
export const { warpdepth } = registerControl('warpdepth');

/**
 * Forme du LFO pour la déformation de l'oscillateur à table d'onde
 *
 * @name warpshape
 * @param {number | Pattern} shape Forme du lfo (0, 1, 2, ..)
 */
export const { warpshape } = registerControl('warpshape');

/**
 * Offset DC du LFO pour la déformation de l'oscillateur à table d'onde
 *
 * @name warpdc
 * @param {number | Pattern} dcoffset offset dc. mettre à 0 pour unipolaire
 */
export const { warpdc } = registerControl('warpdc');

/**
 * Inclinaison du LFO pour la déformation de l'oscillateur à table d'onde
 *
 * @name warpskew
 * @param {number | Pattern} skew À quel point déformer la forme du LFO
 */
export const { warpskew } = registerControl('warpskew');

/**
 * Type de déformation (altération de la forme d'onde) à appliquer à l'oscillateur à table d'onde.
 *
 * Les options actuelles sont : none, asym, bendp, bendm, bendmp, sync, quant, fold, pwm, orbit,
 * spin, chaos, primes, binary, brownian, reciprocal, wormhole, logistic, sigmoid, fractal, flip
 *
 * @name warpmode
 * @param {number | string | Pattern} mode Mode de déformation
 * @synonyms wavetableWarpMode
 * @example
 * s("morgana").bank("wt_digital").seg(8).note("F1").warp("0 0.25 0.5 0.75 1")
 *   .warpmode("<asym bendp spin logistic sync wormhole brownian>*2")
 *
 */
export const { warpmode, wavetableWarpMode } = registerControl('warpmode', 'wavetableWarpMode');

/**
 * Quantité d'aléatoire de la phase initiale de l'oscillateur à table d'onde.
 *
 * @name wtphaserand
 * @param {number | Pattern} amount Aléatoire de la phase initiale. Entre 0 (pas aléatoire) et 1 (totalement aléatoire)
 * @synonyms wavetablePhaseRand
 * @example
 * s("basique").bank("wt_digital").seg(16).wtphaserand("<0 1>")
 *
 */
export const { wtphaserand, wavetablePhaseRand } = registerControl('wtphaserand', 'wavetablePhaseRand');

/**
 * Quantité d'enveloppe appliquée à l'enveloppe de position de l'oscillateur à table d'onde
 *
 * @name warpenv
 * @param {number | Pattern} amount entre 0 et 1
 */
export const { warpenv } = registerControl('warpenv');

/**
 * fréquence synchronisée au cycle du LFO pour la position de déformation de la table d'onde
 *
 * @name warpsync
 * @param {number | Pattern} rate fréquence en cycles
 */
export const { warpsync } = registerControl('warpsync');

/**
 * Définit un nœud webaudio personnalisé à utiliser comme source sonore.
 *
 * @name source
 * @synonyms src
 * @param {function} getSource
 * @synonyms src
 *
 */
export const { source, src } = registerControl('source', 'src');
/**
 * Sélectionne l'index donné depuis la carte d'échantillons.
 * Les nombres trop élevés boucleront.
 * `n` peut aussi être utilisé pour jouer des numéros midi, mais il est recommandé d'utiliser `note` à la place.
 *
 * @name n
 * @param {number | Pattern} value index d'échantillon commençant à 0
 * @example
 * s("bd sd [~ bd] sd,hh*6").n("<0 1>")
 */
// also see https://codeberg.org/uzu/strudel/pulls/63
export const { n } = registerControl('n');
/**
 * Joue le nom de note ou numéro midi donné. Un nom de note consiste en
 *
 * - une lettre (a-g ou A-G)
 * - altérations optionnelles (b ou #)
 * - numéro d'octave optionnel (possiblement négatif) (0-9). Par défaut 3
 *
 * Exemples de noms de notes valides : `c`, `bb`, `Bb`, `f#`, `c3`, `A4`, `Eb2`, `c#5`
 *
 * Vous pouvez également utiliser des numéros midi au lieu de noms de notes, où 69 est mappé à A4 440Hz en 12EDO.
 *
 * @name note
 * @example
 * note("c a f e")
 * @example
 * note("c4 a4 f4 e4")
 * @example
 * note("60 69 65 64")
 * @example
 * note("fbb1 a#0 cbbb-1 e##-2").sound("saw")
 */
export const { note } = registerControl(['note', 'n']);

/**
 * Un pattern de nombres qui accélèrent (ou ralentissent) les échantillons pendant qu'ils jouent. Actuellement supporté uniquement par osc / superdirt.
 *
 * @name accelerate
 * @param {number | Pattern} amount accélération.
 * @superdirtOnly
 * @example
 * s("sax").accelerate("<0 1 2 4 8 16>").slow(2).osc()
 *
 */
export const { accelerate } = registerControl('accelerate');
/**
 * Définit la vélocité de 0 à 1. Est multiplié avec gain.
 *
 * @name velocity
 * @example
 * s("hh*8")
 * .gain(".4!2 1 .4!2 1 .4 1")
 * .velocity(".4 1")
 */
export const { velocity } = registerControl('velocity');
/**
 * Contrôle le gain par une quantité exponentielle.
 *
 * @name gain
 * @param {number | Pattern} amount gain.
 * @example
 * s("hh*8").gain(".4!2 1 .4!2 1 .4 1").fast(2)
 *
 */
export const { gain } = registerControl('gain');
/**
 * Gain appliqué après que tous les effets aient été traités.
 *
 * @name postgain
 * @example
 * s("bd sd [~ bd] sd,hh*8")
 * .compressor("-20:20:10:.002:.02").postgain(1.5)
 *
 */
export const { postgain } = registerControl('postgain');
/**
 * Comme `gain`, mais linéaire.
 *
 * @name amp
 * @param {number | Pattern} amount gain.
 * @superdirtOnly
 * @example
 * s("bd*8").amp(".1*2 .5 .1*2 .5 .1 .5").osc()
 *
 */
export const { amp } = registerControl('amp');
/**
 * Temps d'attaque de l'enveloppe d'amplitude : Spécifie combien de temps il faut pour que le son atteigne sa valeur maximale, relative au déclenchement.
 *
 * @name attack
 * @param {number | Pattern} attack temps en secondes.
 * @synonyms att
 * @example
 * note("c3 e3 f3 g3").attack("<0 .1 .5>")
 *
 */
export const { attack, att } = registerControl('attack', 'att');

/**
 * Définit le ratio d'harmonicité de la modulation de fréquence.
 * Contrôle le timbre du son.
 * Les nombres entiers et ratios simples sonnent plus naturels,
 * tandis que les nombres décimaux et ratios complexes sonnent métalliques.
 *
 * @name fmh
 * @param {number | Pattern} harmonicity
 * @example
 * note("c e g b g e")
 * .fm(4)
 * .fmh("<1 2 1.5 1.61>")
 * ._scope()
 *
 */
export const { fmh } = registerControl(['fmh', 'fmi'], 'fmh');
/**
 * Définit la modulation de fréquence du synthétiseur.
 * Contrôle l'indice de modulation, qui définit la brillance du son.
 *
 * @name fm
 * @param {number | Pattern} brightness indice de modulation
 * @synonyms fmi
 * @example
 * note("c e g b g e")
 * .fm("<0 1 2 8 32>")
 * ._scope()
 *
 */
export const { fmi, fm } = registerControl(['fmi', 'fmh'], 'fm');
// fm envelope
/**
 * Type de rampe de l'enveloppe fm. Exp pourrait être un peu cassé..
 *
 * @name fmenv
 * @param {number | Pattern} type lin | exp
 * @example
 * note("c e g b g e")
 * .fm(4)
 * .fmdecay(.2)
 * .fmsustain(0)
 * .fmenv("<exp lin>")
 * ._scope()
 *
 */
export const { fmenv } = registerControl('fmenv');
/**
 * Temps d'attaque pour l'enveloppe FM : temps nécessaire pour atteindre la modulation maximale
 *
 * @name fmattack
 * @param {number | Pattern} time temps d'attaque
 * @example
 * note("c e g b g e")
 * .fm(4)
 * .fmattack("<0 .05 .1 .2>")
 * ._scope()
 *
 */
export const { fmattack } = registerControl('fmattack');

/**
 * Forme d'onde du modulateur fm
 *
 * @name fmwave
 * @param {number | Pattern} wave forme d'onde
 * @example
 * n("0 1 2 3".fast(4)).scale("d:minor").s("sine").fmwave("<sine square sawtooth crackle>").fm(4).fmh(2.01)
 * @example
 * n("0 1 2 3".fast(4)).chord("<Dm Am F G>").voicing().s("sawtooth").fmwave("brown").fm(.6)
 *
 */
export const { fmwave } = registerControl('fmwave');

/**
 * Temps de déclin pour l'enveloppe FM : secondes jusqu'à ce que le niveau de maintien soit atteint après la phase d'attaque.
 *
 * @name fmdecay
 * @param {number | Pattern} time temps de déclin
 * @example
 * note("c e g b g e")
 * .fm(4)
 * .fmdecay("<.01 .05 .1 .2>")
 * .fmsustain(.4)
 * ._scope()
 *
 */
export const { fmdecay } = registerControl('fmdecay');
/**
 * Niveau de maintien pour l'enveloppe FM : quelle quantité de modulation est appliquée après la phase de déclin
 *
 * @name fmsustain
 * @param {number | Pattern} level niveau de maintien
 * @example
 * note("c e g b g e")
 * .fm(4)
 * .fmdecay(.1)
 * .fmsustain("<1 .75 .5 0>")
 * ._scope()
 *
 */
export const { fmsustain } = registerControl('fmsustain');
// these are not really useful... skipping for now
export const { fmrelease } = registerControl('fmrelease');
export const { fmvelocity } = registerControl('fmvelocity');

/**
 * Sélectionne la banque de sons à utiliser. À utiliser avec `s`. Le nom de la banque (+ "_") sera préfixé à la valeur de `s`.
 *
 * @name bank
 * @param {string | Pattern} bank le nom de la banque
 * @example
 * s("bd sd [~ bd] sd").bank('RolandTR909') // = s("RolandTR909_bd RolandTR909_sd")
 *
 */
export const { bank } = registerControl('bank');

/**
 * contrôle de mixage pour l'effet chorus
 *
 * @name chorus
 * @param {string | Pattern} chorus quantité de mixage entre 0 et 1
 * @example
 * note("d d a# a").s("sawtooth").chorus(.5)
 *
 */
export const { chorus } = registerControl('chorus');

// analyser node send amount 0 - 1 (used by scope)
export const { analyze } = registerControl('analyze');
// fftSize of analyser
export const { fft } = registerControl('fft');

/**
 * Temps de déclin de l'enveloppe d'amplitude : le temps nécessaire après le temps d'attaque pour atteindre le niveau de maintien.
 * Notez que le déclin n'est audible que si la valeur de maintien est inférieure à 1.
 *
 * @name decay
 * @param {number | Pattern} time temps de déclin en secondes
 * @synonyms dec
 * @example
 * note("c3 e3 f3 g3").decay("<.1 .2 .3 .4>").sustain(0)
 *
 */
export const { decay, dec } = registerControl('decay', 'dec');
/**
 * Niveau de maintien de l'enveloppe d'amplitude : Le niveau qui est atteint après l'attaque / déclin, étant maintenu jusqu'au décalage.
 *
 * @name sustain
 * @param {number | Pattern} gain niveau de maintien entre 0 et 1
 * @synonyms sus
 * @example
 * note("c3 e3 f3 g3").decay(.2).sustain("<0 .1 .4 .6 1>")
 *
 */
export const { sustain, sus } = registerControl('sustain', 'sus');
/**
 * Temps de relâchement de l'enveloppe d'amplitude : Le temps nécessaire après le décalage pour passer du niveau de maintien à zéro.
 *
 * @name release
 * @param {number | Pattern} time temps de relâchement en secondes
 * @synonyms rel
 * @example
 * note("c3 e3 g3 c4").release("<0 .1 .4 .6 1>/2")
 *
 */
export const { release, rel } = registerControl('release', 'rel');
export const { hold } = registerControl('hold');
// TODO: in tidal, it seems to be normalized
/**
 * Définit la fréquence centrale du filtre **p**asse-**b**ande. En utilisant la mininotation, vous
 * pouvez également fournir en option le paramètre 'bpq' séparé par ':'.
 *
 * @name bpf
 * @param {number | Pattern} frequency fréquence centrale
 * @synonyms bandf, bp
 * @example
 * s("bd sd [~ bd] sd,hh*6").bpf("<1000 2000 4000 8000>")
 *
 */
export const { bandf, bpf, bp } = registerControl(['bandf', 'bandq', 'bpenv'], 'bpf', 'bp');
// TODO: in tidal, it seems to be normalized
/**
 * Définit le facteur **q** du filtre **p**asse-**b**ande (résonance).
 *
 * @name bpq
 * @param {number | Pattern} q facteur q
 * @synonyms bandq
 * @example
 * s("bd sd [~ bd] sd").bpf(500).bpq("<0 1 2 3>")
 *
 */
// currently an alias of 'bandq' https://codeberg.org/uzu/strudel/issues/496
// ['bpq'],
export const { bandq, bpq } = registerControl('bandq', 'bpq');
/**
 * Un pattern de nombres de 0 à 1. Saute le début de chaque échantillon, par ex. `0.25` pour couper le premier quart de chaque échantillon.
 *
 * @memberof Pattern
 * @name begin
 * @param {number | Pattern} amount entre 0 et 1, où 1 est la longueur de l'échantillon
 * @example
 * samples({ rave: 'rave/AREUREADY.wav' }, 'github:tidalcycles/dirt-samples')
 * s("rave").begin("<0 .25 .5 .75>").fast(2)
 *
 */
export const { begin } = registerControl('begin');
/**
 * Identique à .begin, mais coupe la fin de chaque échantillon.
 *
 * @memberof Pattern
 * @name end
 * @param {number | Pattern} length 1 = échantillon entier, .5 = demi-échantillon, .25 = quart d'échantillon etc..
 * @example
 * s("bd*2,oh*4").end("<.1 .2 .5 1>").fast(2)
 *
 */
export const { end } = registerControl('end');
/**
 * Boucle l'échantillon.
 * Notez que le tempo de la boucle n'est pas synchronisé avec le tempo du cycle.
 * Pour changer la région de boucle, utilisez loopBegin / loopEnd.
 *
 * @name loop
 * @param {number | Pattern} on Si 1, l'échantillon est bouclé
 * @example
 * s("casio").loop(1)
 *
 */
export const { loop } = registerControl('loop');
/**
 * Commence à boucler à un point spécifique de l'échantillon (entre `begin` et `end`).
 * Notez que le point de boucle doit être entre `begin` et `end`, et avant `loopEnd` !
 * Note : Les échantillons commençant par wt_ boucleront automatiquement ! (wt = wavetable)
 *
 * @name loopBegin
 * @param {number | Pattern} time entre 0 et 1, où 1 est la longueur de l'échantillon
 * @synonyms loopb
 * @example
 * s("space").loop(1)
 * .loopBegin("<0 .125 .25>")._scope()
 */
export const { loopBegin, loopb } = registerControl('loopBegin', 'loopb');
/**
 *
 * Termine la section de boucle à un point spécifique de l'échantillon (entre `begin` et `end`).
 * Notez que le point de boucle doit être entre `begin` et `end`, et après `loopBegin` !
 *
 * @name loopEnd
 * @param {number | Pattern} time entre 0 et 1, où 1 est la longueur de l'échantillon
 * @synonyms loope
 * @example
 * s("space").loop(1)
 * .loopEnd("<1 .75 .5 .25>")._scope()
 */
export const { loopEnd, loope } = registerControl('loopEnd', 'loope');
/**
 * Effet bit crusher.
 *
 * @name crush
 * @param {number | Pattern} depth entre 1 (pour une réduction drastique de la profondeur de bits) à 16 (pour presque aucune réduction).
 * @example
 * s("<bd sd>,hh*3").fast(2).crush("<16 8 7 6 5 4 3 2>")
 *
 */
// ['clhatdecay'],
export const { crush } = registerControl('crush');
/**
 * Faux rééchantillonnage pour réduire le taux d'échantillonnage. Attention : Cet effet semble fonctionner uniquement dans les navigateurs basés sur chromium
 *
 * @name coarse
 * @param {number | Pattern} factor 1 pour l'original, 2 pour la moitié, 3 pour un tiers et ainsi de suite.
 * @example
 * s("bd sd [~ bd] sd,hh*8").coarse("<1 4 8 16 32>")
 *
 */
export const { coarse } = registerControl('coarse');

/**
 * Module l'amplitude d'un son avec une forme d'onde continue
 *
 * @name tremolo
 * @synonyms trem
 * @param {number | Pattern} speed vitesse de modulation en HZ
 * @example
 * note("d d d# d".fast(4)).s("supersaw").tremolo("<3 2 100> ").tremoloskew("<.5>")
 *
 */
export const { tremolo } = registerControl(['tremolo', 'tremolodepth', 'tremoloskew', 'tremolophase'], 'trem');

/**
 * Module l'amplitude d'un son avec une forme d'onde continue
 *
 * @name tremolosync
 * @synonyms tremsync
 * @param {number | Pattern} cycles vitesse de modulation en cycles
 * @example
 * note("d d d# d".fast(4)).s("supersaw").tremolosync("4").tremoloskew("<1 .5 0>")
 *
 */
export const { tremolosync } = registerControl(
  ['tremolosync', 'tremolodepth', 'tremoloskew', 'tremolophase'],
  'tremsync',
);

/**
 * Profondeur de modulation d'amplitude
 *
 * @name tremolodepth
 * @synonyms tremdepth
 * @param {number | Pattern} depth
 * @example
 * note("a1 a1 a#1 a1".fast(4)).s("pulse").tremsync(4).tremolodepth("<1 2 .7>")
 *
 */
export const { tremolodepth } = registerControl('tremolodepth', 'tremdepth');
/**
 * Modifie la forme de la forme d'onde de modulation
 *
 * @name tremoloskew
 * @synonyms tremskew
 * @param {number | Pattern} amount entre 0 & 1, la forme de la forme d'onde
 * @example
 * note("{f a c e}%16").s("sawtooth").tremsync(4).tremoloskew("<.5 0 1>")
 *
 */
export const { tremoloskew } = registerControl('tremoloskew', 'tremskew');

/**
 * Modifie la phase de la forme d'onde de modulation
 *
 * @name tremolophase
 * @synonyms tremphase
 * @param {number | Pattern} offset le décalage en cycles de la modulation
 * @example
 * note("{f a c e}%16").s("sawtooth").tremsync(4).tremolophase("<0 .25 .66>")
 *
 */
export const { tremolophase } = registerControl('tremolophase', 'tremphase');

/**
 * Forme de modulation d'amplitude
 *
 * @name tremoloshape
 * @synonyms tremshape
 * @param {number | Pattern} shape tri | square | sine | saw | ramp
 * @example
 * note("{f g c d}%16").tremsync(4).tremoloshape("<sine tri square>").s("sawtooth")
 *
 */
export const { tremoloshape } = registerControl('tremoloshape', 'tremshape');
/**
 * Surdrive de filtre pour les types de filtres supportés
 *
 * @name drive
 * @param {number | Pattern} amount
 * @example
 * note("{f g g c d a a#}%16".sub(17)).s("supersaw").lpenv(8).lpf(150).lpq(.8).ftype('ladder').drive("<.5 4>")
 *
 */
export const { drive } = registerControl('drive');

/**
 * Module l'amplitude d'un orbit pour créer un effet de type "sidechain".
 *
 * Peut être appliqué à plusieurs orbits avec la mininotation ':', par ex. `duckorbit("2:3")`
 *
 * @name duckorbit
 * @synonyms duck
 * @param {number | Pattern} orbit orbit cible
 * @example
 * $: n(run(16)).scale("c:minor:pentatonic").s("sawtooth").delay(.7).orbit(2)
 * $: s("bd:4!4").beat("0,4,8,11,14",16).duckorbit(2).duckattack(0.2).duckdepth(1)
 * @example
 * $: n(run(16)).scale("c:minor:pentatonic").s("sawtooth").delay(.7).orbit(2)
 * $: s("hh*16").orbit(3)
 * $: s("bd:4!4").beat("0,4,8,11,14",16).duckorbit("2:3").duckattack(0.2).duckdepth(1)
 *
 */
export const { duck } = registerControl('duckorbit', 'duck');

/**
 * La quantité de ducking appliquée à l'orbit cible
 *
 * Peut varier selon les orbits avec la mininotation ':', par ex. `duckdepth("0.3:0.1")`.
 * Note : cela nécessite d'abord d'appliquer l'effet à plusieurs orbits avec par ex. `duckorbit("2:3")`.
 *
 * @name duckdepth
 * @param {number | Pattern} depth profondeur de modulation de 0 à 1
 * @example
 * stack( n(run(8)).scale("c:minor").s("sawtooth").delay(.7).orbit(2), s("bd:4!4").beat("0,4,8,11,14",16).duckorbit(2).duckattack(0.2).duckdepth("<1 .9 .6 0>"))
 * @example
 * $: n(run(16)).scale("c:minor:pentatonic").s("sawtooth").delay(.7).orbit(2)
 * $: s("hh*16").orbit(3)
 * $: s("bd:4!4").beat("0,4,8,11,14",16).duckorbit("2:3").duckattack(0.2).duckdepth("1:0.5")
 *
 */
export const { duckdepth } = registerControl('duckdepth');

/**
 * Le temps nécessaire pour que le(s) signal(aux) ducké(s) atteigne(nt) leur volume le plus bas.
 * Peut être utilisé pour éviter les clics ou pour des effets rythmiques créatifs.
 *
 * Peut varier selon les orbits avec la mininotation ':', par ex. `duckonset("0:0.003")`.
 * Note : cela nécessite d'abord d'appliquer l'effet à plusieurs orbits avec par ex. `duckorbit("2:3")`.
 *
 * @name duckonset
 * @synonyms duckons
 *
 * @param {number | Pattern} time Le temps de déclenchement en secondes
 * @example
 * // Clicks
 * sound: freq("63.2388").s("sine").orbit(2).gain(4)
 * duckerWithClick: s("bd*4").duckorbit(2).duckattack(0.3).duckonset(0).postgain(0)
 * @example
 * // No clicks
 * sound: freq("63.2388").s("sine").orbit(2).gain(4)
 * duckerWithoutClick: s("bd*4").duckorbit(2).duckattack(0.3).duckonset(0.01).postgain(0)
 * @example
 * // Rhythmic
 * noise: s("pink").distort("2:1").orbit(4) // used rhythmically with 0.3 onset below
 * hhat: s("hh*16").orbit(7)
 * ducker: s("bd*4").bank("tr909").duckorbit("4:7").duckonset("0.3:0.003").duckattack(0.25)
 *
 */
export const { duckonset } = registerControl('duckonset', 'duckons');

/**
 * Le temps nécessaire pour que le(s) signal(aux) ducké(s) retourne(nt) à leur volume normal.
 *
 * Peut varier selon les orbits avec la mininotation ':', par ex. `duckonset("0:0.003")`.
 * Note : cela nécessite d'abord d'appliquer l'effet à plusieurs orbits avec par ex. `duckorbit("2:3")`.
 *
 * @name duckattack
 * @synonyms duckatt
 *
 * @param {number | Pattern} time Le temps d'attaque en secondes
 * @example
 * sound: n(run(8)).scale("c:minor").s("sawtooth").delay(.7).orbit(2)
 * ducker: s("bd:4!4").beat("0,4,8,11,14",16).duckorbit(2).duckattack("<0.2 0 0.4>").duckdepth(1)
 * @example
 * moreduck: n(run(8)).scale("c:minor").s("sawtooth").delay(.7).orbit(2)
 * lessduck: s("hh*16").orbit(5)
 * ducker: s("bd:4!4").beat("0,4,8,11,14",16).duckorbit("2:5").duckattack("0.4:0.1")
 *
 */
export const { duckattack } = registerControl('duckattack', 'duckatt');

/**
 * Crée des byte beats avec des expressions personnalisées
 *
 * @name byteBeatExpression
 * @synonyms bbexpr
 *
 * @param {number | Pattern} byteBeatExpression expression bitwise pour créer du bytebeat
 * @example
 * s("bytebeat").bbexpr('t*(t>>15^t>>66)')
 *
 */
export const { byteBeatExpression, bbexpr } = registerControl('byteBeatExpression', 'bbexpr');

/**
 * Crée des byte beats avec des expressions personnalisées
 *
 * @name byteBeatStartTime
 * @synonyms bbst
 *
 * @param {number | Pattern} byteBeatStartTime en échantillons (t)
 * @example
 * note("c3!8".add("{0 0 12 0 7 5 3}%8")).s("bytebeat:5").bbst("<3 1>".mul(10000))._scope()
 *
 */
export const { byteBeatStartTime, bbst } = registerControl('byteBeatStartTime', 'bbst');

/**
 * Vous permet de définir les canaux de sortie sur l'interface
 *
 * @name channels
 * @synonyms ch
 *
 * @param {number | Pattern} channels pattern les canaux de sortie
 * @example
 * note("e a d b g").channels("3:4")
 *
 */
export const { channels, ch } = registerControl('channels', 'ch');

/**
 * Contrôle la largeur d'impulsion de l'oscillateur à impulsions
 *
 * @name pw
 * @param {number | Pattern} pulsewidth
 * @example
 * note("{f a c e}%16").s("pulse").pw(".8:1:.2")
 * @example
 * n(run(8)).scale("D:pentatonic").s("pulse").pw("0 .75 .5 1")
 */
export const { pw } = registerControl(['pw', 'pwrate', 'pwsweep']);

/**
 * Contrôle la fréquence du lfo pour la largeur d'impulsion de l'oscillateur à impulsions
 *
 * @name pwrate
 * @param {number | Pattern} rate
 * @example
 * n(run(8)).scale("D:pentatonic").s("pulse").pw("0.5").pwrate("<5 .1 25>").pwsweep("<0.3 .8>")

 *
 */
export const { pwrate } = registerControl('pwrate');

/**
 * Contrôle le balayage du lfo pour la largeur d'impulsion de l'oscillateur à impulsions
 *
 * @name pwsweep
 * @param {number | Pattern} sweep
 * @example
 * n(run(8)).scale("D:pentatonic").s("pulse").pw("0.5").pwrate("<5 .1 25>").pwsweep("<0.3 .8>")
 *
 */
export const { pwsweep } = registerControl('pwsweep');

/**
 * Effet audio phaser qui approxime les pédales de guitare populaires.
 *
 * @name phaser
 * @synonyms ph
 * @param {number | Pattern} speed vitesse de modulation
 * @example
 * n(run(8)).scale("D:pentatonic").s("sawtooth").release(0.5)
 * .phaser("<1 2 4 8>")
 *
 */
export const { phaserrate, ph, phaser } = registerControl(
  ['phaserrate', 'phaserdepth', 'phasercenter', 'phasersweep'],
  'ph',
  'phaser',
);

/**
 * La plage de balayage de fréquence du lfo pour l'effet phaser. Par défaut 2000
 *
 * @name phasersweep
 * @synonyms phs
 * @param {number | Pattern} phasersweep les valeurs les plus utiles sont entre 0 et 4000
 * @example
 * n(run(8)).scale("D:pentatonic").s("sawtooth").release(0.5)
 * .phaser(2).phasersweep("<800 2000 4000>")
 *
 */
export const { phasersweep, phs } = registerControl('phasersweep', 'phs');

/**
 * La fréquence centrale du phaser en HZ. Par défaut 1000
 *
 * @name phasercenter
 * @synonyms phc
 * @param {number | Pattern} centerfrequency en HZ
 * @example
 * n(run(8)).scale("D:pentatonic").s("sawtooth").release(0.5)
 * .phaser(2).phasercenter("<800 2000 4000>")
 *
 */

export const { phasercenter, phc } = registerControl('phasercenter', 'phc');

/**
 * La quantité dont le signal est affecté par l'effet phaser. Par défaut 0.75
 *
 * @name phaserdepth
 * @synonyms phd, phasdp
 * @param {number | Pattern} depth nombre entre 0 et 1
 * @example
 * n(run(8)).scale("D:pentatonic").s("sawtooth").release(0.5)
 * .phaser(2).phaserdepth("<0 .5 .75 1>")
 *
 */
// also a superdirt control
export const { phaserdepth, phd, phasdp } = registerControl('phaserdepth', 'phd', 'phasdp');

/**
 * Choisit le canal auquel le pattern est envoyé dans superdirt
 *
 * @name channel
 * @param {number | Pattern} channel numéro de canal
 *
 */
export const { channel } = registerControl('channel');
/**
 * Dans le style des boîtes à rythmes classiques, `cut` arrêtera un échantillon en cours de lecture dès qu'un autre échantillon du même groupe de coupe doit être joué. Un exemple serait un charleston ouvert suivi d'un fermé, muant essentiellement l'ouvert.
 *
 * @name cut
 * @param {number | Pattern} group numéro de groupe de coupe
 * @example
 * s("[oh hh]*4").cut(1)
 *
 */
export const { cut } = registerControl('cut');
/**
 * Applique la fréquence de coupure du filtre **p**asse-**b**as.
 *
 * En utilisant la mininotation, vous pouvez également ajouter en option le paramètre 'lpq', séparé par ':'.
 *
 * @name lpf
 * @param {number | Pattern} frequency audible entre 0 et 20000
 * @synonyms cutoff, ctf, lp
 * @example
 * s("bd sd [~ bd] sd,hh*6").lpf("<4000 2000 1000 500 200 100>")
 * @example
 * s("bd*16").lpf("1000:0 1000:10 1000:20 1000:30")
 *
 */
export const { cutoff, ctf, lpf, lp } = registerControl(['cutoff', 'resonance', 'lpenv'], 'ctf', 'lpf', 'lp');

/**
 * Définit la profondeur de modulation de l'enveloppe du filtre passe-bas.
 * @name lpenv
 * @param {number | Pattern} modulation profondeur de l'enveloppe du filtre passe-bas entre 0 et _n_
 * @synonyms lpe
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .lpf(300)
 * .lpa(.5)
 * .lpenv("<4 2 1 0 -1 -2 -4>/4")
 */
export const { lpenv, lpe } = registerControl('lpenv', 'lpe');
/**
 * Définit la profondeur de modulation de l'enveloppe du filtre passe-haut.
 * @name hpenv
 * @param {number | Pattern} modulation profondeur de l'enveloppe du filtre passe-haut entre 0 et _n_
 * @synonyms hpe
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .hpf(500)
 * .hpa(.5)
 * .hpenv("<4 2 1 0 -1 -2 -4>/4")
 */
export const { hpenv, hpe } = registerControl('hpenv', 'hpe');
/**
 * Définit la profondeur de modulation de l'enveloppe du filtre passe-bande.
 * @name bpenv
 * @param {number | Pattern} modulation profondeur de l'enveloppe du filtre passe-bande entre 0 et _n_
 * @synonyms bpe
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .bpf(500)
 * .bpa(.5)
 * .bpenv("<4 2 1 0 -1 -2 -4>/4")
 */
export const { bpenv, bpe } = registerControl('bpenv', 'bpe');
/**
 * Définit la durée d'attaque pour l'enveloppe du filtre passe-bas.
 * @name lpattack
 * @param {number | Pattern} attack temps de l'enveloppe du filtre
 * @synonyms lpa
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .lpf(300)
 * .lpa("<.5 .25 .1 .01>/4")
 * .lpenv(4)
 */
export const { lpattack, lpa } = registerControl('lpattack', 'lpa');
/**
 * Définit la durée d'attaque pour l'enveloppe du filtre passe-haut.
 * @name hpattack
 * @param {number | Pattern} attack temps de l'enveloppe du filtre passe-haut
 * @synonyms hpa
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .hpf(500)
 * .hpa("<.5 .25 .1 .01>/4")
 * .hpenv(4)
 */
export const { hpattack, hpa } = registerControl('hpattack', 'hpa');
/**
 * Définit la durée d'attaque pour l'enveloppe du filtre passe-bande.
 * @name bpattack
 * @param {number | Pattern} attack temps de l'enveloppe du filtre passe-bande
 * @synonyms bpa
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .bpf(500)
 * .bpa("<.5 .25 .1 .01>/4")
 * .bpenv(4)
 */
export const { bpattack, bpa } = registerControl('bpattack', 'bpa');
/**
 * Définit la durée de déclin pour l'enveloppe du filtre passe-bas.
 * @name lpdecay
 * @param {number | Pattern} decay temps de l'enveloppe du filtre
 * @synonyms lpd
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .lpf(300)
 * .lpd("<.5 .25 .1 0>/4")
 * .lpenv(4)
 */
export const { lpdecay, lpd } = registerControl('lpdecay', 'lpd');
/**
 * Définit la durée de déclin pour l'enveloppe du filtre passe-haut.
 * @name hpdecay
 * @param {number | Pattern} decay temps de l'enveloppe du filtre passe-haut
 * @synonyms hpd
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .hpf(500)
 * .hpd("<.5 .25 .1 0>/4")
 * .hps(0.2)
 * .hpenv(4)
 */
export const { hpdecay, hpd } = registerControl('hpdecay', 'hpd');
/**
 * Définit la durée de déclin pour l'enveloppe du filtre passe-bande.
 * @name bpdecay
 * @param {number | Pattern} decay temps de l'enveloppe du filtre passe-bande
 * @synonyms bpd
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .bpf(500)
 * .bpd("<.5 .25 .1 0>/4")
 * .bps(0.2)
 * .bpenv(4)
 */
export const { bpdecay, bpd } = registerControl('bpdecay', 'bpd');
/**
 * Définit l'amplitude de maintien pour l'enveloppe du filtre passe-bas.
 * @name lpsustain
 * @param {number | Pattern} sustain amplitude de l'enveloppe du filtre passe-bas
 * @synonyms lps
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .lpf(300)
 * .lpd(.5)
 * .lps("<0 .25 .5 1>/4")
 * .lpenv(4)
 */
export const { lpsustain, lps } = registerControl('lpsustain', 'lps');
/**
 * Définit l'amplitude de maintien pour l'enveloppe du filtre passe-haut.
 * @name hpsustain
 * @param {number | Pattern} sustain amplitude de l'enveloppe du filtre passe-haut
 * @synonyms hps
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .hpf(500)
 * .hpd(.5)
 * .hps("<0 .25 .5 1>/4")
 * .hpenv(4)
 */
export const { hpsustain, hps } = registerControl('hpsustain', 'hps');
/**
 * Définit l'amplitude de maintien pour l'enveloppe du filtre passe-bande.
 * @name bpsustain
 * @param {number | Pattern} sustain amplitude de l'enveloppe du filtre passe-bande
 * @synonyms bps
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .bpf(500)
 * .bpd(.5)
 * .bps("<0 .25 .5 1>/4")
 * .bpenv(4)
 */
export const { bpsustain, bps } = registerControl('bpsustain', 'bps');
/**
 * Définit le temps de relâchement pour l'enveloppe du filtre passe-bas.
 * @name lprelease
 * @param {number | Pattern} release temps de l'enveloppe du filtre
 * @synonyms lpr
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .clip(.5)
 * .lpf(300)
 * .lpenv(4)
 * .lpr("<.5 .25 .1 0>/4")
 * .release(.5)
 */
export const { lprelease, lpr } = registerControl('lprelease', 'lpr');
/**
 * Définit le temps de relâchement pour l'enveloppe du filtre passe-haut.
 * @name hprelease
 * @param {number | Pattern} release temps de l'enveloppe du filtre passe-haut
 * @synonyms hpr
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .clip(.5)
 * .hpf(500)
 * .hpenv(4)
 * .hpr("<.5 .25 .1 0>/4")
 * .release(.5)
 */
export const { hprelease, hpr } = registerControl('hprelease', 'hpr');
/**
 * Définit le temps de relâchement pour l'enveloppe du filtre passe-bande.
 * @name bprelease
 * @param {number | Pattern} release temps de l'enveloppe du filtre passe-bande
 * @synonyms bpr
 * @example
 * note("c2 e2 f2 g2")
 * .sound('sawtooth')
 * .clip(.5)
 * .bpf(500)
 * .bpenv(4)
 * .bpr("<.5 .25 .1 0>/4")
 * .release(.5)
 */
export const { bprelease, bpr } = registerControl('bprelease', 'bpr');
/**
 * Définit le type de filtre. Le filtre ladder est plus agressif. D'autres types pourraient être ajoutés à l'avenir.
 * @name ftype
 * @param {number | Pattern} type 12db (0), ladder (1), ou 24db (2)
 * @example
 * note("{f g g c d a a#}%8").s("sawtooth").lpenv(4).lpf(500).ftype("<0 1 2>").lpq(1)
 * @example
 * note("c f g g a c d4").fast(2)
 * .sound('sawtooth')
 * .lpf(200).fanchor(0)
 * .lpenv(3).lpq(1)
 * .ftype("<ladder 12db 24db>")
 */
export const { ftype } = registerControl('ftype');

/**
 * contrôle le centre de l'enveloppe du filtre. 0 est unipolaire positif, .5 est bipolaire, 1 est unipolaire négatif
 * @name fanchor
 * @param {number | Pattern} center 0 à 1
 * @example
 * note("{f g g c d a a#}%8").s("sawtooth").lpf("{1000}%2")
 * .lpenv(8).fanchor("<0 .5 1>")
 */
export const { fanchor } = registerControl('fanchor');
/**
 * Applique la fréquence de coupure du filtre **p**asse-**h**aut.
 *
 * En utilisant la mininotation, vous pouvez également ajouter en option le paramètre 'hpq', séparé par ':'.
 *
 * @name hpf
 * @param {number | Pattern} frequency audible entre 0 et 20000
 * @synonyms hp, hcutoff
 * @example
 * s("bd sd [~ bd] sd,hh*8").hpf("<4000 2000 1000 500 200 100>")
 * @example
 * s("bd sd [~ bd] sd,hh*8").hpf("<2000 2000:25>")
 *
 */
// currently an alias of 'hcutoff' https://codeberg.org/uzu/strudel/issues/496
// ['hpf'],
/**
 * Applique un vibrato à la fréquence de l'oscillateur.
 *
 * @name vib
 * @synonyms vibrato, v
 * @param {number | Pattern} frequency du vibrato en hertz
 * @example
 * note("a e")
 * .vib("<.5 1 2 4 8 16>")
 * ._scope()
 * @example
 * // change the modulation depth with ":"
 * note("a e")
 * .vib("<.5 1 2 4 8 16>:12")
 * ._scope()
 */
export const { vib, vibrato, v } = registerControl(['vib', 'vibmod'], 'vibrato', 'v');
/**
 * Ajoute du bruit rose au mixage
 *
 * @name noise
 * @param {number | Pattern} wet quantité wet
 * @example
 * sound("<white pink brown>/2")
 */
export const { noise } = registerControl('noise');
/**
 * Définit la profondeur du vibrato en demi-tons. N'a d'effet que si `vibrato` | `vib` | `v` est également défini
 *
 * @name vibmod
 * @synonyms vmod
 * @param {number | Pattern} depth du vibrato (en demi-tons)
 * @example
 * note("a e").vib(4)
 * .vibmod("<.25 .5 1 2 12>")
 * ._scope()
 * @example
 * // change the vibrato frequency with ":"
 * note("a e")
 * .vibmod("<.25 .5 1 2 12>:8")
 * ._scope()
 */
export const { vibmod, vmod } = registerControl(['vibmod', 'vib'], 'vmod');
export const { hcutoff, hpf, hp } = registerControl(['hcutoff', 'hresonance', 'hpenv'], 'hpf', 'hp');
/**
 * Contrôle la valeur **q** du filtre **p**asse-**h**aut.
 *
 * @name hpq
 * @param {number | Pattern} q facteur de résonance entre 0 et 50
 * @synonyms hresonance
 * @example
 * s("bd sd [~ bd] sd,hh*8").hpf(2000).hpq("<0 10 20 30>")
 *
 */
export const { hresonance, hpq } = registerControl('hresonance', 'hpq');
/**
 * Contrôle la valeur **q** du filtre **p**asse-**b**as.
 *
 * @name lpq
 * @param {number | Pattern} q facteur de résonance entre 0 et 50
 * @synonyms resonance
 * @example
 * s("bd sd [~ bd] sd,hh*8").lpf(2000).lpq("<0 10 20 30>")
 *
 */
// currently an alias of 'resonance' https://codeberg.org/uzu/strudel/issues/496
export const { resonance, lpq } = registerControl('resonance', 'lpq');
/**
 * Filtre DJ, en dessous de 0.5 c'est un filtre passe-bas, au-dessus c'est un filtre passe-haut.
 *
 * @name djf
 * @param {number | Pattern} cutoff en dessous de 0.5 c'est un filtre passe-bas, au-dessus c'est un filtre passe-haut
 * @example
 * n(irand(16).seg(8)).scale("d:phrygian").s("supersaw").djf("<.5 .3 .2 .75>")
 *
 */
export const { djf } = registerControl('djf');
// ['cutoffegint'],
// TODO: does not seem to work
/**
 * Définit le niveau du signal de délai.
 *
 * En utilisant la mininotation, vous pouvez également ajouter en option les paramètres 'delaytime' et 'delayfeedback',
 * séparés par ':'.
 *
 *
 * @name delay
 * @param {number | Pattern} level entre 0 et 1
 * @example
 * s("bd bd").delay("<0 .25 .5 1>")
 * @example
 * s("bd bd").delay("0.65:0.25:0.9 0.65:0.125:0.7")
 *
 */
export const { delay } = registerControl(['delay', 'delaytime', 'delayfeedback']);
/**
 * Définit le niveau du signal qui est réinjecté dans le délai.
 * Attention : Les valeurs >= 1 résulteront en un signal de plus en plus fort ! Ne le faites pas
 *
 * @name delayfeedback
 * @param {number | Pattern} feedback entre 0 et 1
 * @synonyms delayfb, dfb
 * @example
 * s("bd").delay(.25).delayfeedback("<.25 .5 .75 1>")
 *
 */
export const { delayfeedback, delayfb, dfb } = registerControl('delayfeedback', 'delayfb', 'dfb');

/**
 * Définit le niveau du signal qui est réinjecté dans le délai.
 * Caution: Values >= 1 will result in a signal that gets louder and louder! Don't do it
 *
 * @name delayfeedback
 * @param {number | Pattern} feedback between 0 and 1
 * @synonyms delayfb, dfb
 * @example
 * s("bd").delay(.25).delayfeedback("<.25 .5 .75 1>")
 *
 */
export const { delayspeed } = registerControl('delayspeed');
/**
 * Sets the time of the delay effect.
 *
 * @name delayspeed
 * @param {number | Pattern} delayspeed controls the pitch of the delay feedback
 * @synonyms delayt, dt
 * @example
 * note("d d a# a".fast(2)).s("sawtooth").delay(.8).delaytime(1/2).delayspeed("<2 .5 -1 -2>")
 *
 */
export const { delaytime, delayt, dt } = registerControl('delaytime', 'delayt', 'dt');

/**
 * Sets the time of the delay effect in cycles.
 *
 * @name delaysync
 * @param {number | Pattern} cycles delay length in cycles
 * @synonyms delayt, dt
 * @example
 * s("bd bd").delay(.25).delaysync("<1 2 3 5>".div(8))
 *
 */
export const { delaysync } = registerControl('delaysync');

/**
 * Specifies whether delaytime is calculated relative to cps.
 *
 * @name lock
 * @param {number | Pattern} enable When set to 1, delaytime is a direct multiple of a cycle.
 * @superdirtOnly
 * @example
 * s("sd").delay().lock(1).osc()
 *
 *
 */

export const { lock } = registerControl('lock');
/**
 * Set detune for stacked voices of supported oscillators
 *
 * @name detune
 * @param {number | Pattern} amount
 * @synonyms det
 * @example
 * note("d f a a# a d3").fast(2).s("supersaw").detune("<.1 .2 .5 24.1>")
 *
 */
export const { detune, det } = registerControl('detune', 'det');
/**
 * Set number of stacked voices for supported oscillators
 *
 * @name unison
 * @param {number | Pattern} numvoices
 * @example
 * note("d f a a# a d3").fast(2).s("supersaw").unison("<1 2 7>")
 *
 */
export const { unison } = registerControl('unison');

/**
 * Set the stereo pan spread for supported oscillators
 *
 * @name spread
 * @param {number | Pattern} spread between 0 and 1
 * @example
 * note("d f a a# a d3").fast(2).s("supersaw").spread("<0 .3 1>")
 *
 */
export const { spread } = registerControl('spread');
/**
 * Set dryness of reverb. See `room` and `size` for more information about reverb.
 *
 * @name dry
 * @param {number | Pattern} dry 0 = wet, 1 = dry
 * @example
 * n("[0,3,7](3,8)").s("superpiano").room(.7).dry("<0 .5 .75 1>").osc()
 * @superdirtOnly
 *
 */
export const { dry } = registerControl('dry');
// TODO: does not seem to do anything
/*
 * Used when using `begin`/`end` or `chop`/`striate` and friends, to change the fade out time of the 'grain' envelope.
 *
 * @name fadeTime
 * @synonyms fadeOutTime
 * @param {number | Pattern} time between 0 and 1
 * @example
 * s("oh*4").end(.1).fadeTime("<0 .2 .4 .8>").osc()
 *
 */
export const { fadeTime, fadeOutTime } = registerControl('fadeTime', 'fadeOutTime');
// TODO: see above
export const { fadeInTime } = registerControl('fadeInTime');
/**
 * Set frequency of sound.
 *
 * @name freq
 * @param {number | Pattern} frequency in Hz. the audible range is between 20 and 20000 Hz
 * @example
 * freq("220 110 440 110").s("superzow").osc()
 * @example
 * freq("110".mul.out(".5 1.5 .6 [2 3]")).s("superzow").osc()
 *
 */
export const { freq } = registerControl('freq');
// pitch envelope
/**
 * Attack time of pitch envelope.
 *
 * @name pattack
 * @synonyms patt
 * @param {number | Pattern} time time in seconds
 * @example
 * note("c eb g bb").pattack("0 .1 .25 .5").slow(2)
 *
 */
export const { pattack, patt } = registerControl('pattack', 'patt');
/**
 * Decay time of pitch envelope.
 *
 * @name pdecay
 * @synonyms pdec
 * @param {number | Pattern} time time in seconds
 * @example
 * note("<c eb g bb>").pdecay("<0 .1 .25 .5>")
 *
 */
export const { pdecay, pdec } = registerControl('pdecay', 'pdec');
// TODO: how to use psustain?!
export const { psustain, psus } = registerControl('psustain', 'psus');
/**
 * Release time of pitch envelope
 *
 * @name prelease
 * @synonyms prel
 * @param {number | Pattern} time time in seconds
 * @example
 * note("<c eb g bb> ~")
 * .release(.5) // to hear the pitch release
 * .prelease("<0 .1 .25 .5>")
 *
 */
export const { prelease, prel } = registerControl('prelease', 'prel');
/**
 * Amount of pitch envelope. Negative values will flip the envelope.
 * If you don't set other pitch envelope controls, `pattack:.2` will be the default.
 *
 * @name penv
 * @param {number | Pattern} semitones change in semitones
 * @example
 * note("c")
 * .penv("<12 7 1 .5 0 -1 -7 -12>")
 *
 */
export const { penv } = registerControl('penv');
/**
 * Curve of envelope. Defaults to linear. exponential is good for kicks
 *
 * @name pcurve
 * @param {number | Pattern} type 0 = linear, 1 = exponential
 * @example
 * note("g1*4")
 * .s("sine").pdec(.5)
 * .penv(32)
 * .pcurve("<0 1>")
 *
 */
export const { pcurve } = registerControl('pcurve');
/**
 * Sets the range anchor of the envelope:
 * - anchor 0: range = [note, note + penv]
 * - anchor 1: range = [note - penv, note]
 * If you don't set an anchor, the value will default to the psustain value.
 *
 * @name panchor
 * @param {number | Pattern} anchor anchor offset
 * @example
 * note("c c4").penv(12).panchor("<0 .5 1 .5>")
 *
 */
export const { panchor } = registerControl('panchor');
// TODO: https://tidalcycles.org/docs/configuration/MIDIOSC/control-voltage/#gate
export const { gate, gat } = registerControl('gate', 'gat');
// ['hatgrain'],
// ['lagogo'],
// ['lclap'],
// ['lclaves'],
// ['lclhat'],
// ['lcrash'],
// TODO:
// https://tidalcycles.org/docs/reference/audio_effects/#leslie-1
// https://tidalcycles.org/docs/reference/audio_effects/#leslie
/**
 * Emulation of a Leslie speaker: speakers rotating in a wooden amplified cabinet.
 *
 * @name leslie
 * @param {number | Pattern} wet between 0 and 1
 * @example
 * n("0,4,7").s("supersquare").leslie("<0 .4 .6 1>").osc()
 * @superdirtOnly
 *
 */
export const { leslie } = registerControl('leslie');
/**
 * Rate of modulation / rotation for leslie effect
 *
 * @name lrate
 * @param {number | Pattern} rate 6.7 for fast, 0.7 for slow
 * @example
 * n("0,4,7").s("supersquare").leslie(1).lrate("<1 2 4 8>").osc()
 * @superdirtOnly
 *
 */
// TODO: the rate seems to "lag" (in the example, 1 will be fast)
export const { lrate } = registerControl('lrate');
/**
 * Physical size of the cabinet in meters. Be careful, it might be slightly larger than your computer. Affects the Doppler amount (pitch warble)
 *
 * @name lsize
 * @param {number | Pattern} meters somewhere between 0 and 1
 * @example
 * n("0,4,7").s("supersquare").leslie(1).lrate(2).lsize("<.1 .5 1>").osc()
 * @superdirtOnly
 *
 */
export const { lsize } = registerControl('lsize');
/**
 * Sets the displayed text for an event on the pianoroll
 *
 * @name label
 * @param {string} label text to display
 */
export const { activeLabel } = registerControl('activeLabel');
export const { label } = registerControl(['label', 'activeLabel']);
// ['lfo'],
// ['lfocutoffint'],
// ['lfodelay'],
// ['lfoint'],
// ['lfopitchint'],
// ['lfoshape'],
// ['lfosync'],
// ['lhitom'],
// ['lkick'],
// ['llotom'],
// ['lophat'],
// ['lsnare'],
// TODO: what is this? not found in tidal doc
export const { degree } = registerControl('degree');
// TODO: what is this? not found in tidal doc
export const { mtranspose } = registerControl('mtranspose');
// TODO: what is this? not found in tidal doc
export const { ctranspose } = registerControl('ctranspose');
// TODO: what is this? not found in tidal doc
export const { harmonic } = registerControl('harmonic');
// TODO: what is this? not found in tidal doc
export const { stepsPerOctave } = registerControl('stepsPerOctave');
// TODO: what is this? not found in tidal doc
export const { octaveR } = registerControl('octaveR');
// TODO: why is this needed? what's the difference to late / early? Answer: it's in seconds, and delays the message at
// OSC time (so can't be negative, at least not beyond the latency value)
export const { nudge } = registerControl('nudge');
// TODO: the following doc is just a guess, it's not documented in tidal doc.
/**
 * Sets the default octave of a synth.
 *
 * @name octave
 * @param {number | Pattern} octave octave number
 * @example
 * n("0,4,7").s('supersquare').octave("<3 4 5 6>").osc()
 * @superDirtOnly
 */
export const { octave } = registerControl('octave');

// ['ophatdecay'],
// TODO: example
/**
 * An `orbit` is a global parameter context for patterns. Patterns with the same orbit will share the same global effects.
 *
 * @name orbit
 * @param {number | Pattern} number
 * @example
 * stack(
 *   s("hh*6").delay(.5).delaytime(.25).orbit(1),
 *   s("~ sd ~ sd").delay(.5).delaytime(.125).orbit(2)
 * )
 */
export const { orbit } = registerControl('orbit');
// TODO: what is this? not found in tidal doc Answer: gain is limited to maximum of 2. This allows you to go over that
export const { overgain } = registerControl('overgain');
// TODO: what is this? not found in tidal doc. Similar to above, but limited to 1
export const { overshape } = registerControl('overshape');
/**
 * Sets position in stereo.
 *
 * @name pan
 * @param {number | Pattern} pan between 0 and 1, from left to right (assuming stereo), once round a circle (assuming multichannel)
 * @example
 * s("[bd hh]*2").pan("<.5 1 .5 0>")
 * @example
 * s("bd rim sd rim bd ~ cp rim").pan(sine.slow(2))
 *
 */
export const { pan } = registerControl('pan');
// TODO: this has no effect (see example)
/*
 * Controls how much multichannel output is fanned out
 *
 * @name panspan
 * @param {number | Pattern} span between -inf and inf, negative is backwards ordering
 * @example
 * s("[bd hh]*2").pan("<.5 1 .5 0>").panspan("<0 .5 1>").osc()
 *
 */
export const { panspan } = registerControl('panspan');
// TODO: this has no effect (see example)
/*
 * Controls how much multichannel output is spread
 *
 * @name pansplay
 * @param {number | Pattern} spread between 0 and 1
 * @example
 * s("[bd hh]*2").pan("<.5 1 .5 0>").pansplay("<0 .5 1>").osc()
 *
 */
export const { pansplay } = registerControl('pansplay');
export const { panwidth } = registerControl('panwidth');
export const { panorient } = registerControl('panorient');
// ['pitch1'],
// ['pitch2'],
// ['pitch3'],
// ['portamento'],
// TODO: LFO rate see https://tidalcycles.org/docs/patternlib/tutorials/synthesizers/#supersquare
export const { rate } = registerControl('rate');
// TODO: slide param for certain synths
export const { slide } = registerControl('slide');
// TODO: detune? https://tidalcycles.org/docs/patternlib/tutorials/synthesizers/#supersquare
export const { semitone } = registerControl('semitone');

// TODO: synth param
export const { voice } = registerControl('voice');
// voicings // https://codeberg.org/uzu/strudel/issues/506
// chord to voice, like C Eb Fm7 G7. the symbols can be defined via addVoicings
export const { chord } = registerControl('chord');
// which dictionary to use for the voicings
export const { dictionary, dict } = registerControl('dictionary', 'dict');
// the top note to align the voicing to, defaults to c5
export const { anchor } = registerControl('anchor');
// how the voicing is offset from the anchored position
export const { offset } = registerControl('offset');
// how many octaves are voicing steps spread apart, defaults to 1
export const { octaves } = registerControl('octaves');
// below = anchor note will be removed from the voicing, useful for melody harmonization
export const { mode } = registerControl(['mode', 'anchor']);

/**
 * Sets the level of reverb.
 *
 * When using mininotation, you can also optionally add the 'size' parameter, separated by ':'.
 *
 * @name room
 * @param {number | Pattern} level between 0 and 1
 * @example
 * s("bd sd [~ bd] sd").room("<0 .2 .4 .6 .8 1>")
 * @example
 * s("bd sd [~ bd] sd").room("<0.9:1 0.9:4>")
 *
 */
export const { room } = registerControl(['room', 'size']);
/**
 * Reverb lowpass starting frequency (in hertz).
 * When this property is changed, the reverb will be recaculated, so only change this sparsely..
 *
 * @name roomlp
 * @synonyms rlp
 * @param {number} frequency between 0 and 20000hz
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(10000)
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(5000)
 */
export const { roomlp, rlp } = registerControl('roomlp', 'rlp');
/**
 * Reverb lowpass frequency at -60dB (in hertz).
 * When this property is changed, the reverb will be recaculated, so only change this sparsely..
 *
 * @name roomdim
 * @synonyms rdim
 * @param {number} frequency between 0 and 20000hz
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(10000).rdim(8000)
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(5000).rdim(400)
 *
 */
export const { roomdim, rdim } = registerControl('roomdim', 'rdim');
/**
 * Reverb fade time (in seconds).
 * When this property is changed, the reverb will be recaculated, so only change this sparsely..
 *
 * @name roomfade
 * @synonyms rfade
 * @param {number} seconds for the reverb to fade
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(10000).rfade(0.5)
 * @example
 * s("bd sd [~ bd] sd").room(0.5).rlp(5000).rfade(4)
 *
 */
export const { roomfade, rfade } = registerControl('roomfade', 'rfade');
/**
 * Sets the sample to use as an impulse response for the reverb.
 * @name iresponse
 * @param {string | Pattern} sample to use as an impulse response
 * @synonyms ir
 * @example
 * s("bd sd [~ bd] sd").room(.8).ir("<shaker_large:0 shaker_large:2>")
 *
 */
export const { ir, iresponse } = registerControl(['ir', 'i'], 'iresponse');

/**
 * Sets speed of the sample for the impulse response.
 * @name irspeed
 * @param {string | Pattern} speed
 * @example
 * samples('github:switchangel/pad')
 * $: s("brk/2").fit().scrub(irand(16).div(16).seg(8)).ir("swpad:4").room(.2).irspeed("<2 1 .5>/2").irbegin(.5).roomsize(.5)
 *
 */
export const { irspeed } = registerControl('irspeed');

/**
 * Sets the beginning of the IR response sample
 * @name irbegin
 * @param {string | Pattern} begin between 0 and 1
 * @synonyms ir
 * @example
 * samples('github:switchangel/pad')
 * $: s("brk/2").fit().scrub(irand(16).div(16).seg(8)).ir("swpad:4").room(.65).irspeed("-2").irbegin("<0 .5 .75>/2").roomsize(.6)
 *
 */
export const { irbegin } = registerControl('irbegin');
/**
 * Sets the room size of the reverb, see `room`.
 * When this property is changed, the reverb will be recaculated, so only change this sparsely..
 *
 * @name roomsize
 * @param {number | Pattern} size between 0 and 10
 * @synonyms rsize, sz, size
 * @example
 * s("bd sd [~ bd] sd").room(.8).rsize(1)
 * @example
 * s("bd sd [~ bd] sd").room(.8).rsize(4)
 *
 */
// TODO: find out why :
// s("bd sd [~ bd] sd").room(.8).roomsize("<0 .2 .4 .6 .8 [1,0]>").osc()
// .. does not work. Is it because room is only one effect?
export const { roomsize, size, sz, rsize } = registerControl('roomsize', 'size', 'sz', 'rsize');
// ['sagogo'],
// ['sclap'],
// ['sclaves'],
// ['scrash'],
/**
 * (Deprecated) Wave shaping distortion. WARNING: can suddenly get unpredictably loud.
 * Please use distort instead, which has a more predictable response curve
 * second option in optional array syntax (ex: ".9:.5") applies a postgain to the output
 *
 *
 * @name shape
 * @param {number | Pattern} distortion between 0 and 1
 * @example
 * s("bd sd [~ bd] sd,hh*8").shape("<0 .2 .4 .6 .8>")
 *
 */
export const { shape } = registerControl(['shape', 'shapevol']);
/**
 * Wave shaping distortion. CAUTION: it can get loud.
 * Second option in optional array syntax (ex: ".9:.5") applies a postgain to the output. Third option sets the waveshaping type.
 * Most useful values are usually between 0 and 10 (depending on source gain). If you are feeling adventurous, you can turn it up to 11 and beyond ;)
 *
 * @name distort
 * @synonyms dist
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 * @param {number | string | Pattern} type type of distortion to apply
 * @example
 * s("bd sd [~ bd] sd,hh*8").distort("<0 2 3 10:.5>")
 * @example
 * note("d1!8").s("sine").penv(36).pdecay(.12).decay(.23).distort("8:.4")
 * @example
 * s("bd:4*4").bank("tr808").distort("3:0.5:diode")
 *
 */
export const { distort, dist } = registerControl(['distort', 'distortvol', 'distorttype'], 'dist');

/**
 * Postgain for waveshaping distortion.
 *
 * @name distortvol
 * @synonyms distvol
 * @param {number | Pattern} volume linear postgain of the distortion
 * @example
 * s("bd*4").bank("tr909").distort(2).distortvol(0.8)
 */
export const { distortvol } = registerControl('distortvol', 'distvol');

/**
 * Type of waveshaping distortion to apply.
 *
 * @name distorttype
 * @synonyms disttype
 * @param {number | string | Pattern} type type of distortion to apply
 * @example
 * s("bd*4").bank("tr909").distort(2).distorttype("<0 1 2>")
 *
 * @example
 * s("sine").note("F1*2").release(1)
 *   .penv(24).pdecay(0.05)
 *   .distort(rand.range(1, 8))
 *   .distorttype("<fold chebyshev scurve diode asym sinefold>")
 */
export const { distorttype } = registerControl('distorttype', 'disttype');

/**
 * Dynamics Compressor. The params are `compressor("threshold:ratio:knee:attack:release")`
 * More info [here](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode?retiredLocale=de#instance_properties)
 *
 * @name compressor
 * @example
 * s("bd sd [~ bd] sd,hh*8")
 * .compressor("-20:20:10:.002:.02")
 *
 */
export const { compressor } = registerControl([
  'compressor',
  'compressorRatio',
  'compressorKnee',
  'compressorAttack',
  'compressorRelease',
]);
export const { compressorKnee } = registerControl('compressorKnee');
export const { compressorRatio } = registerControl('compressorRatio');
export const { compressorAttack } = registerControl('compressorAttack');
export const { compressorRelease } = registerControl('compressorRelease');
/**
 * Changes the speed of sample playback, i.e. a cheap way of changing pitch.
 *
 * @name speed
 * @param {number | Pattern} speed -inf to inf, negative numbers play the sample backwards.
 * @example
 * s("bd*6").speed("1 2 4 1 -2 -4")
 * @example
 * speed("1 1.5*2 [2 1.1]").s("piano").clip(1)
 *
 */
export const { speed } = registerControl('speed');

/**
 * Changes the speed of sample playback, i.e. a cheap way of changing pitch.
 *
 * @name stretch
 * @param {number | Pattern} factor -inf to inf, negative numbers play the sample backwards.
 * @example
 * s("gm_flute").stretch("1 2 .5")
 *
 */
export const { stretch } = registerControl('stretch');
/**
 * Used in conjunction with `speed`, accepts values of "r" (rate, default behavior), "c" (cycles), or "s" (seconds). Using `unit "c"` means `speed` will be interpreted in units of cycles, e.g. `speed "1"` means samples will be stretched to fill a cycle. Using `unit "s"` means the playback speed will be adjusted so that the duration is the number of seconds specified by `speed`.
 *
 * @name unit
 * @param {number | string | Pattern} unit see description above
 * @example
 * speed("1 2 .5 3").s("bd").unit("c").osc()
 * @superdirtOnly
 *
 */

export const { unit } = registerControl('unit');
/**
 * Made by Calum Gunn. Reminiscent of some weird mixture of filter, ring-modulator and pitch-shifter. The SuperCollider manual defines Squiz as:
 *
 * "A simplistic pitch-raising algorithm. It's not meant to sound natural; its sound is reminiscent of some weird mixture of filter, ring-modulator and pitch-shifter, depending on the input. The algorithm works by cutting the signal into fragments (delimited by upwards-going zero-crossings) and squeezing those fragments in the time domain (i.e. simply playing them back faster than they came in), leaving silences inbetween. All the parameters apart from memlen can be modulated."
 *
 * @name squiz
 * @param {number | Pattern} squiz Try passing multiples of 2 to it - 2, 4, 8 etc.
 * @example
 * squiz("2 4/2 6 [8 16]").s("bd").osc()
 * @superdirtOnly
 *
 */
export const { squiz } = registerControl('squiz');
// TODO: what is this? not found in tidal doc
// ['stutterdepth'],
// TODO: what is this? not found in tidal doc
// ['stuttertime'],
// TODO: what is this? not found in tidal doc
// ['timescale'],
// TODO: what is this? not found in tidal doc
// ['timescalewin'],
// ['tomdecay'],
// ['vcfegint'],
// ['vcoegint'],
// TODO: Use a rest (~) to override the effect <- vowel
/**
 *
 * Formant filter to make things sound like vowels.
 *
 * @name vowel
 * @param {string | Pattern} vowel You can use a e i o u ae aa oe ue y uh un en an on, corresponding to [a] [e] [i] [o] [u] [æ] [ɑ] [ø] [y] [ɯ] [ʌ] [œ̃] [ɛ̃] [ɑ̃] [ɔ̃]. Aliases: aa = å = ɑ, oe = ø = ö, y = ı, ae = æ.
 * @example
 * note("[c2 <eb2 <g2 g1>>]*2").s('sawtooth')
 * .vowel("<a e i <o u>>")
 * @example
 * s("bd sd mt ht bd [~ cp] ht lt").vowel("[a|e|i|o|u]")
 *
 */
export const { vowel } = registerControl('vowel');
/* // TODO: find out how it works
 * Made by Calum Gunn. Divides an audio stream into tiny segments, using the signal's zero-crossings as segment boundaries, and discards a fraction of them. Takes a number between 1 and 100, denoted the percentage of segments to drop. The SuperCollider manual describes the Waveloss effect this way:
 *
 * Divide an audio stream into tiny segments, using the signal's zero-crossings as segment boundaries, and discard a fraction of them (i.e. replace them with silence of the same length). The technique was described by Trevor Wishart in a lecture. Parameters: the filter drops drop out of out of chunks. mode can be 1 to drop chunks in a simple deterministic fashion (e.g. always dropping the first 30 out of a set of 40 segments), or 2 to drop chunks randomly but in an appropriate proportion.)
 *
 * mode: ?
 * waveloss: ?
 *
 * @name waveloss
 */
export const { waveloss } = registerControl('waveloss');
/**
 * Noise crackle density
 *
 * @name density
 * @param {number | Pattern} density between 0 and x
 * @example
 * s("crackle*4").density("<0.01 0.04 0.2 0.5>".slow(4))
 *
 */
export const { density } = registerControl('density');
// ['modwheel'],
export const { expression } = registerControl('expression');
export const { sustainpedal } = registerControl('sustainpedal');

export const { fshift } = registerControl('fshift');
export const { fshiftnote } = registerControl('fshiftnote');
export const { fshiftphase } = registerControl('fshiftphase');

export const { triode } = registerControl('triode');
export const { krush } = registerControl('krush');
export const { kcutoff } = registerControl('kcutoff');
export const { octer } = registerControl('octer');
export const { octersub } = registerControl('octersub');
export const { octersubsub } = registerControl('octersubsub');
export const { ring } = registerControl('ring');
export const { ringf } = registerControl('ringf');
export const { ringdf } = registerControl('ringdf');
export const { freeze } = registerControl('freeze');
export const { xsdelay } = registerControl('xsdelay');
export const { tsdelay } = registerControl('tsdelay');
export const { real } = registerControl('real');
export const { imag } = registerControl('imag');
export const { enhance } = registerControl('enhance');
export const { partials } = registerControl('partials');
export const { comb } = registerControl('comb');
export const { smear } = registerControl('smear');
export const { scram } = registerControl('scram');
export const { binshift } = registerControl('binshift');
export const { hbrick } = registerControl('hbrick');
export const { lbrick } = registerControl('lbrick');

export const { frameRate } = registerControl('frameRate');
export const { frames } = registerControl('frames');
export const { hours } = registerControl('hours');
export const { minutes } = registerControl('minutes');
export const { seconds } = registerControl('seconds');
export const { songPtr } = registerControl('songPtr');
export const { uid } = registerControl('uid');
export const { val } = registerControl('val');
export const { cps } = registerControl('cps');
/**
 * Multiplies the duration with the given number. Also cuts samples off at the end if they exceed the duration.
 *
 * @name clip
 * @synonyms legato
 * @param {number | Pattern} factor >= 0
 * @example
 * note("c a f e").s("piano").clip("<.5 1 2>")
 *
 */
export const { clip, legato } = registerControl('clip', 'legato');

/**
 * Sets the duration of the event in cycles. Similar to clip / legato, it also cuts samples off at the end if they exceed the duration.
 *
 * @name duration
 * @synonyms dur
 * @param {number | Pattern} seconds >= 0
 * @example
 * note("c a f e").s("piano").dur("<.5 1 2>")
 *
 */
export const { duration, dur } = registerControl('duration', 'dur');

// ZZFX
export const { zrand } = registerControl('zrand');
export const { curve } = registerControl('curve');
// superdirt duplicate
// export const {slide]} = registerControl('slide']);
export const { deltaSlide } = registerControl('deltaSlide');
export const { pitchJump } = registerControl('pitchJump');
export const { pitchJumpTime } = registerControl('pitchJumpTime');
export const { lfo, repeatTime } = registerControl('lfo', 'repeatTime');
// noise on the frequency or as bubo calls it "frequency fog" :)
export const { znoise } = registerControl('znoise');
export const { zmod } = registerControl('zmod');
// like crush but scaled differently
export const { zcrush } = registerControl('zcrush');
export const { zdelay } = registerControl('zdelay');
export const { zzfx } = registerControl('zzfx');

/**
 * Sets the color of the hap in visualizations like pianoroll or highlighting.
 * @name color
 * @synonyms colour
 * @param {string} color Hexadecimal or CSS color name
 */
export const { color, colour } = registerControl(['color', 'colour']);

// TODO: slice / splice https://www.youtube.com/watch?v=hKhPdO0RKDQ&list=PL2lW1zNIIwj3bDkh-Y3LUGDuRcoUigoDs&index=13

export let createParams = (...names) =>
  names.reduce((acc, name) => Object.assign(acc, { [name]: createParam(name) }), {});

/**
 * ADSR envelope: Combination of Attack, Decay, Sustain, and Release.
 *
 * @name adsr
 * @param {number | Pattern} time attack time in seconds
 * @param {number | Pattern} time decay time in seconds
 * @param {number | Pattern} gain sustain level (0 to 1)
 * @param {number | Pattern} time release time in seconds
 * @example
 * note("[c3 bb2 f3 eb3]*2").sound("sawtooth").lpf(600).adsr(".1:.1:.5:.2")
 */
export const adsr = register('adsr', (adsr, pat) => {
  adsr = !Array.isArray(adsr) ? [adsr] : adsr;
  const [attack, decay, sustain, release] = adsr;
  return pat.set({ attack, decay, sustain, release });
});
export const ad = register('ad', (t, pat) => {
  t = !Array.isArray(t) ? [t] : t;
  const [attack, decay = attack] = t;
  return pat.attack(attack).decay(decay);
});
export const ds = register('ds', (t, pat) => {
  t = !Array.isArray(t) ? [t] : t;
  const [decay, sustain = 0] = t;
  return pat.set({ decay, sustain });
});
export const ar = register('ar', (t, pat) => {
  t = !Array.isArray(t) ? [t] : t;
  const [attack, release = attack] = t;
  return pat.set({ attack, release });
});

//MIDI

/**
 * MIDI channel: Sets the MIDI channel for the event.
 *
 * @name midichan
 * @param {number | Pattern} channel MIDI channel number (0-15)
 * @example
 * note("c4").midichan(1).midi()
 */
export const { midichan } = registerControl('midichan');

export const { midimap } = registerControl('midimap');

/**
 * MIDI port: Sets the MIDI port for the event.
 *
 * @name midiport
 * @param {number | Pattern} port MIDI port
 * @example
 * note("c a f e").midiport("<0 1 2 3>").midi()
 */
export const { midiport } = registerControl('midiport');

/**
 * MIDI command: Sends a MIDI command message.
 *
 * @name midicmd
 * @param {number | Pattern} command MIDI command
 * @example
 * midicmd("clock*48,<start stop>/2").midi()
 */
export const { midicmd } = registerControl('midicmd');

/**
 * MIDI control: Sends a MIDI control change message.
 *
 * @name control
 * @param {number | Pattern}  MIDI control number (0-127)
 * @param {number | Pattern}  MIDI controller value (0-127)
 */
export const control = register('control', (args, pat) => {
  if (!Array.isArray(args)) {
    throw new Error('control expects an array of [ccn, ccv]');
  }
  const [_ccn, _ccv] = args;
  return pat.ccn(_ccn).ccv(_ccv);
});

/**
 * MIDI control number: Sends a MIDI control change message.
 *
 * @name ccn
 * @param {number | Pattern}  MIDI control number (0-127)
 */
export const { ccn } = registerControl('ccn');
/**
 * MIDI control value: Sends a MIDI control change message.
 *
 * @name ccv
 * @param {number | Pattern}  MIDI control value (0-127)
 */
export const { ccv } = registerControl('ccv');
export const { ctlNum } = registerControl('ctlNum');
// TODO: ctlVal?

/**
 * MIDI NRPN non-registered parameter number: Sends a MIDI NRPN non-registered parameter number message.
 * @name nrpnn
 * @param {number | Pattern} nrpnn MIDI NRPN non-registered parameter number (0-127)
 * @example
 * note("c4").nrpnn("1:8").nrpv("123").midichan(1).midi()
 */
export const { nrpnn } = registerControl('nrpnn');
/**
 * MIDI NRPN non-registered parameter value: Sends a MIDI NRPN non-registered parameter value message.
 * @name nrpv
 * @param {number | Pattern} nrpv MIDI NRPN non-registered parameter value (0-127)
 * @example
 * note("c4").nrpnn("1:8").nrpv("123").midichan(1).midi()
 */
export const { nrpv } = registerControl('nrpv');

/**
 * MIDI program number: Sends a MIDI program change message.
 *
 * @name progNum
 * @param {number | Pattern} program MIDI program number (0-127)
 * @example
 * note("c4").progNum(10).midichan(1).midi()
 */
export const { progNum } = registerControl('progNum');

/**
 * MIDI sysex: Sends a MIDI sysex message.
 * @name sysex
 * @param {number | Pattern} id Sysex ID
 * @param {number | Pattern} data Sysex data
 * @example
 * note("c4").sysex(["0x77", "0x01:0x02:0x03:0x04"]).midichan(1).midi()
 */
export const sysex = register('sysex', (args, pat) => {
  if (!Array.isArray(args)) {
    throw new Error('sysex expects an array of [id, data]');
  }
  const [id, data] = args;
  return pat.sysexid(id).sysexdata(data);
});
/**
 * MIDI sysex ID: Sends a MIDI sysex identifier message.
 * @name sysexid
 * @param {number | Pattern} id Sysex ID
 * @example
 * note("c4").sysexid("0x77").sysexdata("0x01:0x02:0x03:0x04").midichan(1).midi()
 */
export const { sysexid } = registerControl('sysexid');
/**
 * MIDI sysex data: Sends a MIDI sysex message.
 * @name sysexdata
 * @param {number | Pattern} data Sysex data
 * @example
 * note("c4").sysexid("0x77").sysexdata("0x01:0x02:0x03:0x04").midichan(1).midi()
 */
export const { sysexdata } = registerControl('sysexdata');

/**
 * MIDI pitch bend: Sends a MIDI pitch bend message.
 * @name midibend
 * @param {number | Pattern} midibend MIDI pitch bend (-1 - 1)
 * @example
 * note("c4").midibend(sine.slow(4).range(-0.4,0.4)).midi()
 */
export const { midibend } = registerControl('midibend');
/**
 * MIDI key after touch: Sends a MIDI key after touch message.
 * @name miditouch
 * @param {number | Pattern} miditouch MIDI key after touch (0-1)
 * @example
 * note("c4").miditouch(sine.slow(4).range(0,1)).midi()
 */
export const { miditouch } = registerControl('miditouch');

// TODO: what is this?
export const { polyTouch } = registerControl('polyTouch');

/**
 * The host to send open sound control messages to. Requires running the OSC bridge.
 * @name oschost
 * @param {string | Pattern} oschost e.g. 'localhost'
 * @example
 * note("c4").oschost('127.0.0.1').oscport(57120).osc();
 */
export const { oschost } = registerControl('oschost');

/**
 * The port to send open sound control messages to. Requires running the OSC bridge.
 * @name oscport
 * @param {number | Pattern} oscport e.g. 57120
 * @example
 * note("c4").oschost('127.0.0.1').oscport(57120).osc();
 */
export const { oscport } = registerControl('oscport');

export const getControlName = (alias) => {
  if (controlAlias.has(alias)) {
    return controlAlias.get(alias);
  }
  return alias;
};

/**
 * Sets properties in a batch.
 *
 * @name as
 * @param {String | Array} mapping the control names that are set
 * @example
 * "c:.5 a:1 f:.25 e:.8".as("note:clip")
 * @example
 * "{0@2 0.25 0 0.5 .3 .5}%8".as("begin").s("sax_vib").clip(1)
 */
export const as = register('as', (mapping, pat) => {
  mapping = Array.isArray(mapping) ? mapping : [mapping];
  return pat.fmap((v) => {
    v = Array.isArray(v) ? v : [v];
    v = Object.fromEntries(mapping.map((prop, i) => [getControlName(prop), v[i]]));
    return v;
  });
});

/**
 * Allows you to scrub an audio file like a tape loop by passing values that represents the position in the audio file
 * in the optional array syntax ex: "0.5:2", the second value controls the speed of playback
 * @name scrub
 * @memberof Pattern
 * @returns Pattern
 * @example
 * samples('github:switchangel/pad')
 * s("swpad:0").scrub("{0.1!2 .25@3 0.7!2 <0.8:1.5>}%8")
 * @example
 * samples('github:yaxu/clean-breaks/main');
 * s("amen/4").fit().scrub("{0@3 0@2 4@3}%8".div(16))
 */

export const scrub = register(
  'scrub',
  (beginPat, pat) => {
    return beginPat.outerBind((v) => {
      if (!Array.isArray(v)) {
        v = [v];
      }
      const [beginVal, speedMultiplier = 1] = v;

      return pat.begin(beginVal).mul(speed(speedMultiplier)).clip(1);
    });
  },
  false,
);
