/*
signal.mjs - continuous patterns
Copyright (C) 2024 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/core/signal.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Hap } from './hap.mjs';
import { Pattern, fastcat, pure, register, reify, silence, stack, sequenceP } from './pattern.mjs';
import Fraction from './fraction.mjs';

import { id, keyAlias, getCurrentKeyboardState } from './util.mjs';

export function steady(value) {
  // A continuous value
  return new Pattern((state) => [new Hap(undefined, state.span, value)]);
}

export const signal = (func) => {
  const query = (state) => [new Hap(undefined, state.span, func(state.span.begin))];
  return new Pattern(query);
};

/**
 *  Un signal en dents de scie entre 0 et 1.
 *
 * @return {Pattern}
 * @example
 * note("<c3 [eb3,g3] g2 [g3,bb3]>*8")
 * .clip(saw.slow(2))
 * @example
 * n(saw.range(0,8).segment(8))
 * .scale('C major')
 *
 */
export const saw = signal((t) => t % 1);

/**
 *  Un signal en dents de scie entre -1 et 1 (comme `saw`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const saw2 = saw.toBipolar();

/**
 *  Un signal en dents de scie entre 1 et 0 (comme `saw`, mais inversé).
 *
 * @return {Pattern}
 * @example
 * note("<c3 [eb3,g3] g2 [g3,bb3]>*8")
 * .clip(isaw.slow(2))
 * @example
 * n(isaw.range(0,8).segment(8))
 * .scale('C major')
 *
 */
export const isaw = signal((t) => 1 - (t % 1));

/**
 *  Un signal en dents de scie entre 1 et -1 (comme `saw2`, mais inversé).
 *
 * @return {Pattern}
 */
export const isaw2 = isaw.toBipolar();

/**
 *  Un signal sinusoïdal entre -1 et 1 (comme `sine`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const sine2 = signal((t) => Math.sin(Math.PI * 2 * t));

/**
 *  Un signal sinusoïdal entre 0 et 1.
 * @return {Pattern}
 * @example
 * n(sine.segment(16).range(0,15))
 * .scale("C:minor")
 *
 */
export const sine = sine2.fromBipolar();

/**
 *  Un signal cosinus entre 0 et 1.
 *
 * @return {Pattern}
 * @example
 * n(stack(sine,cosine).segment(16).range(0,15))
 * .scale("C:minor")
 *
 */
export const cosine = sine._early(Fraction(1).div(4));

/**
 *  Un signal cosinus entre -1 et 1 (comme `cosine`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const cosine2 = sine2._early(Fraction(1).div(4));

/**
 *  Un signal carré entre 0 et 1.
 * @return {Pattern}
 * @example
 * n(square.segment(4).range(0,7)).scale("C:minor")
 *
 */
export const square = signal((t) => Math.floor((t * 2) % 2));

/**
 *  Un signal carré entre -1 et 1 (comme `square`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const square2 = square.toBipolar();

/**
 *  Un signal triangulaire entre 0 et 1.
 *
 * @return {Pattern}
 * @example
 * n(tri.segment(8).range(0,7)).scale("C:minor")
 *
 */
export const tri = fastcat(saw, isaw);

/**
 *  Un signal triangulaire entre -1 et 1 (comme `tri`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const tri2 = fastcat(saw2, isaw2);

/**
 *  Un signal triangulaire inversé entre 1 et 0 (comme `tri`, mais inversé).
 *
 * @return {Pattern}
 * @example
 * n(itri.segment(8).range(0,7)).scale("C:minor")
 *
 */
export const itri = fastcat(isaw, saw);

/**
 *  Un signal triangulaire inversé entre -1 et 1 (comme `itri`, mais bipolaire).
 *
 * @return {Pattern}
 */
export const itri2 = fastcat(isaw2, saw2);

/**
 *  Un signal représentant le temps du cycle.
 *
 * @return {Pattern}
 */
export const time = signal(id);

/**
 *  La position x de la souris varie de 0 à 1.
 * @name mousex
 * @return {Pattern}
 * @example
 * n(mousex.segment(4).range(0,7)).scale("C:minor")
 *
 */

/**
 *  La position y de la souris varie de 0 à 1.
 * @name mousey
 * @return {Pattern}
 * @example
 * n(mousey.segment(4).range(0,7)).scale("C:minor")
 *
 */
let _mouseY = 0,
  _mouseX = 0;
if (typeof window !== 'undefined') {
  //document.onmousemove = (e) => {
  document.addEventListener('mousemove', (e) => {
    _mouseY = e.clientY / document.body.clientHeight;
    _mouseX = e.clientX / document.body.clientWidth;
  });
}

export const mousey = signal(() => _mouseY);
export const mouseY = signal(() => _mouseY);
export const mousex = signal(() => _mouseX);
export const mouseX = signal(() => _mouseX);

// random signals

const xorwise = (x) => {
  const a = (x << 13) ^ x;
  const b = (a >> 17) ^ a;
  return (b << 5) ^ b;
};

// stretch 300 cycles over the range of [0,2**29 == 536870912) then apply the xorshift algorithm
const _frac = (x) => x - Math.trunc(x);

const timeToIntSeed = (x) => xorwise(Math.trunc(_frac(x / 300) * 536870912));

const intSeedToRand = (x) => (x % 536870912) / 536870912;

const timeToRand = (x) => Math.abs(intSeedToRand(timeToIntSeed(x)));

const timeToRandsPrime = (seed, n) => {
  const result = [];
  // eslint-disable-next-line
  for (let i = 0; i < n; ++i) {
    result.push(intSeedToRand(seed));
    seed = xorwise(seed);
  }
  return result;
};

const timeToRands = (t, n) => timeToRandsPrime(timeToIntSeed(t), n);

/**
 *
 */

/**
 * Un pattern discret de nombres de 0 à n-1
 * @example
 * n(run(4)).scale("C4:pentatonic")
 * // n("0 1 2 3").scale("C4:pentatonic")
 */
export const run = (n) => saw.range(0, n).round().segment(n);

/**
 * Crée un pattern à partir d'un nombre binaire.
 *
 * @name binary
 * @param {number} n - nombre d'entrée à convertir en binaire
 * @example
 * "hh".s().struct(binary(5))
 * // "hh".s().struct("1 0 1")
 */
export const binary = (n) => {
  const nBits = reify(n).log2(0).floor().add(1);
  return binaryN(n, nBits);
};

/**
 * Crée un pattern à partir d'un nombre binaire, complété à n bits de longueur.
 *
 * @name binaryN
 * @param {number} n - nombre d'entrée à convertir en binaire
 * @param {number} nBits - longueur du pattern, par défaut 16
 * @example
 * "hh".s().struct(binaryN(55532, 16))
 * // "hh".s().struct("1 1 0 1 1 0 0 0 1 1 1 0 1 1 0 0")
 */
export const binaryN = (n, nBits = 16) => {
  nBits = reify(nBits);
  // Shift and mask, putting msb on the right-side
  const bitPos = run(nBits).mul(-1).add(nBits.sub(1));
  return reify(n).segment(nBits).brshift(bitPos).band(pure(1));
};

export const randrun = (n) => {
  return signal((t) => {
    // Without adding 0.5, the first cycle is always 0,1,2,3,...
    const rands = timeToRands(t.floor().add(0.5), n);
    const nums = rands
      .map((n, i) => [n, i])
      .sort((a, b) => (a[0] > b[0]) - (a[0] < b[0]))
      .map((x) => x[1]);
    const i = t.cyclePos().mul(n).floor() % n;
    return nums[i];
  })._segment(n);
};

const _rearrangeWith = (ipat, n, pat) => {
  const pats = [...Array(n).keys()].map((i) => pat.zoom(Fraction(i).div(n), Fraction(i + 1).div(n)));
  return ipat.fmap((i) => pats[i].repeatCycles(n)._fast(n)).innerJoin();
};

/**
 * Découpe un pattern en un nombre donné de parties, puis joue ces parties dans un ordre aléatoire.
 * Chaque partie sera jouée exactement une fois par cycle.
 * @name shuffle
 * @example
 * note("c d e f").sound("piano").shuffle(4)
 * @example
 * seq("c d e f".shuffle(4), "g").note().sound("piano")
 */
export const shuffle = register('shuffle', (n, pat) => {
  return _rearrangeWith(randrun(n), n, pat);
});

/**
 * Découpe un pattern en un nombre donné de parties, puis joue ces parties de manière aléatoire. Similaire à `shuffle`,
 * mais les parties peuvent être jouées plusieurs fois, ou pas du tout, par cycle.
 * @name scramble
 * @example
 * note("c d e f").sound("piano").scramble(4)
 * @example
 * seq("c d e f".scramble(4), "g").note().sound("piano")
 */
export const scramble = register('scramble', (n, pat) => {
  return _rearrangeWith(_irand(n)._segment(n), n, pat);
});

/**
 * Un pattern continu de nombres aléatoires, entre 0 et 1.
 *
 * @name rand
 * @example
 * // randomly change the cutoff
 * s("bd*4,hh*8").cutoff(rand.range(500,8000))
 *
 */
export const rand = signal(timeToRand);
/**
 * Un pattern continu de nombres aléatoires, entre -1 et 1
 */
export const rand2 = rand.toBipolar();

export const _brandBy = (p) => rand.fmap((x) => x < p);

/**
 * Un pattern continu de 0 ou 1 (aléatoire binaire), avec une probabilité que la valeur soit 1
 *
 * @name brandBy
 * @param {number} probability - un nombre entre 0 et 1
 * @example
 * s("hh*10").pan(brandBy(0.2))
 */
export const brandBy = (pPat) => reify(pPat).fmap(_brandBy).innerJoin();

/**
 * Un pattern continu de 0 ou 1 (aléatoire binaire)
 *
 * @name brand
 * @example
 * s("hh*10").pan(brand)
 */
export const brand = _brandBy(0.5);

export const _irand = (i) => rand.fmap((x) => Math.trunc(x * i));

/**
 * Un pattern continu d'entiers aléatoires, entre 0 et n-1.
 *
 * @name irand
 * @param {number} n valeur maximale (exclusive)
 * @example
 * // randomly select scale notes from 0 - 7 (= C to C)
 * n(irand(8)).struct("x x*2 x x*3").scale("C:minor")
 *
 */
export const irand = (ipat) => reify(ipat).fmap(_irand).innerJoin();

export const __chooseWith = (pat, xs) => {
  xs = xs.map(reify);
  if (xs.length == 0) {
    return silence;
  }

  return pat.range(0, xs.length).fmap((i) => {
    const key = Math.min(Math.max(Math.floor(i), 0), xs.length - 1);
    return xs[key];
  });
};
/**
 * Choisit depuis la liste de valeurs (ou patterns de valeurs) en utilisant le
 * pattern de nombres donné, qui doit être dans la plage de 0..1
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 * @example
 * note("c2 g2!2 d2 f1").s(chooseWith(sine.fast(2), ["sawtooth", "triangle", "bd:6"]))
 */
export const chooseWith = (pat, xs) => {
  return __chooseWith(pat, xs).outerJoin();
};

/**
 * Comme {chooseWith}, mais la structure provient des valeurs choisies, plutôt
 * que du pattern utilisé pour choisir.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const chooseInWith = (pat, xs) => {
  return __chooseWith(pat, xs).innerJoin();
};

/**
 * Choisit aléatoirement depuis la liste d'éléments donnée.
 * @param  {...any} xs valeurs / patterns depuis lesquels choisir.
 * @returns {Pattern} - un pattern continu.
 * @example
 * note("c2 g2!2 d2 f1").s(choose("sine", "triangle", "bd:6"))
 */
export const choose = (...xs) => chooseWith(rand, xs);

// todo: doc
export const chooseIn = (...xs) => chooseInWith(rand, xs);
export const chooseOut = choose;

/**
 * Choisit depuis la liste de valeurs (ou patterns de valeurs) donnée, selon
 * le pattern sur lequel la méthode est appelée. Le pattern doit être dans
 * la plage 0 .. 1.
 * @param  {...any} xs
 * @returns {Pattern}
 */
Pattern.prototype.choose = function (...xs) {
  return chooseWith(this, xs);
};

/**
 * Comme choose, mais le pattern sur lequel cette méthode est appelée doit être
 * dans la plage -1 .. 1
 * @param  {...any} xs
 * @returns {Pattern}
 */
Pattern.prototype.choose2 = function (...xs) {
  return chooseWith(this.fromBipolar(), xs);
};

/**
 * Choisit un des éléments au hasard à chaque cycle.
 * @synonyms randcat
 * @returns {Pattern}
 * @example
 * chooseCycles("bd", "hh", "sd").s().fast(8)
 * @example
 * s("bd | hh | sd").fast(8)
 */
export const chooseCycles = (...xs) => chooseInWith(rand.segment(1), xs);

export const randcat = chooseCycles;

const _wchooseWith = function (pat, ...pairs) {
  // A list of patterns of values
  const values = pairs.map((pair) => reify(pair[0]));

  // A list of weight patterns
  const weights = [];

  let total = pure(0);
  for (const pair of pairs) {
    // 'add' accepts either values or patterns of values here, so no need
    // to explicitly reify
    total = total.add(pair[1]);
    // accumulate our list of weight patterns
    weights.push(total);
  }
  // a pattern of lists of weights
  const weightspat = sequenceP(weights);

  // Takes a number from 0-1, returns a pattern of patterns of values
  const match = function (r) {
    const findpat = total.mul(r);
    return weightspat.fmap((weights) => (find) => values[weights.findIndex((x) => x > find, weights)]).appLeft(findpat);
  };
  // This returns a pattern of patterns.. The innerJoin is in wchooseCycles
  return pat.bind(match);
};

const wchooseWith = (...args) => _wchooseWith(...args).outerJoin();

/**
 * Choisit aléatoirement depuis la liste d'éléments donnée en attribuant une probabilité à chaque élément
 * @param {...any} pairs tableaux de valeur et poids
 * @returns {Pattern} - un pattern continu.
 * @example
 * note("c2 g2!2 d2 f1").s(wchoose(["sine",10], ["triangle",1], ["bd:6",1]))
 */
export const wchoose = (...pairs) => wchooseWith(rand, ...pairs);

/**
 * Choisit un des éléments au hasard à chaque cycle en attribuant une probabilité à chaque élément
 * @synonyms wrandcat
 * @returns {Pattern}
 * @example
 * wchooseCycles(["bd",10], ["hh",1], ["sd",1]).s().fast(8)
 * @example
 * wchooseCycles(["bd bd bd",5], ["hh hh hh",3], ["sd sd sd",1]).fast(4).s()
 * @example
 * // The probability can itself be a pattern
 * wchooseCycles(["bd(3,8)","<5 0>"], ["hh hh hh",3]).fast(4).s()
 */
export const wchooseCycles = (...pairs) => _wchooseWith(rand.segment(1), ...pairs).innerJoin();

export const wrandcat = wchooseCycles;

function _perlin(t) {
  let ta = Math.floor(t);
  let tb = ta + 1;
  const smootherStep = (x) => 6.0 * x ** 5 - 15.0 * x ** 4 + 10.0 * x ** 3;
  const interp = (x) => (a) => (b) => a + smootherStep(x) * (b - a);
  const v = interp(t - ta)(timeToRand(ta))(timeToRand(tb));
  return v;
}
export const perlinWith = (tpat) => {
  return tpat.fmap(_perlin);
};

function _berlin(t) {
  const prevRidgeStartIndex = Math.floor(t);
  const nextRidgeStartIndex = prevRidgeStartIndex + 1;

  const prevRidgeBottomPoint = timeToRand(prevRidgeStartIndex);
  const nextRidgeTopPoint = timeToRand(nextRidgeStartIndex) + prevRidgeBottomPoint;

  const currentPercent = (t - prevRidgeStartIndex) / (nextRidgeStartIndex - prevRidgeStartIndex);
  const interp = (a, b, t) => {
    return a + (b - a) * t;
  };
  return interp(prevRidgeBottomPoint, nextRidgeTopPoint, currentPercent) / 2;
}

export const berlinWith = (tpat) => {
  return tpat.fmap(_berlin);
};

/**
 * Génère un pattern continu de [bruit de Perlin](https://en.wikipedia.org/wiki/Perlin_noise), dans la plage 0..1.
 *
 * @name perlin
 * @example
 * // randomly change the cutoff
 * s("bd*4,hh*8").cutoff(perlin.range(500,8000))
 *
 */
export const perlin = perlinWith(time.fmap((v) => Number(v)));

/**
 * Génère un pattern continu de [bruit de Berlin](conçu par Jame Coyne et Jade Rowland comme une blague mais qui s'est avéré étonnamment cool et utile,
 * comme le bruit de Perlin mais avec des ondes en dents de scie), dans la plage 0..1.
 *
 * @name berlin
 * @example
 * // ascending arpeggios
 * n("0!16".add(berlin.fast(4).mul(14))).scale("d:minor")
 *
 */
export const berlin = berlinWith(time.fmap((v) => Number(v)));

export const degradeByWith = register(
  'degradeByWith',
  (withPat, x, pat) => pat.fmap((a) => (_) => a).appLeft(withPat.filterValues((v) => v > x)),
  true,
  true,
);

/**
 * Supprime aléatoirement des événements du pattern selon une quantité donnée.
 * 0 = 0% de chance de suppression
 * 1 = 100% de chance de suppression
 *
 * @name degradeBy
 * @memberof Pattern
 * @param {number} amount - un nombre entre 0 et 1
 * @returns Pattern
 * @example
 * s("hh*8").degradeBy(0.2)
 * @example
 * s("[hh?0.2]*8")
 * @example
 * //beat generator
 * s("bd").segment(16).degradeBy(.5).ribbon(16,1)
 */
export const degradeBy = register(
  'degradeBy',
  function (x, pat) {
    return pat._degradeByWith(rand, x);
  },
  true,
  true,
);

/**
 *
 * Supprime aléatoirement 50% des événements du pattern. Raccourci pour `.degradeBy(0.5)`
 *
 * @name degrade
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").degrade()
 * @example
 * s("[hh?]*8")
 */
export const degrade = register('degrade', (pat) => pat._degradeBy(0.5), true, true);

/**
 * Inverse de `degradeBy` : Supprime aléatoirement des événements du pattern selon une quantité donnée.
 * 0 = 100% de chance de suppression
 * 1 = 0% de chance de suppression
 * Les événements qui seraient supprimés par degradeBy sont laissés passer par undegradeBy et vice versa (voir le deuxième exemple).
 *
 * @name undegradeBy
 * @memberof Pattern
 * @param {number} amount - un nombre entre 0 et 1
 * @returns Pattern
 * @example
 * s("hh*8").undegradeBy(0.2)
 * @example
 * s("hh*10").layer(
 *   x => x.degradeBy(0.2).pan(0),
 *   x => x.undegradeBy(0.8).pan(1)
 * )
 */
export const undegradeBy = register(
  'undegradeBy',
  function (x, pat) {
    return pat._degradeByWith(
      rand.fmap((r) => 1 - r),
      x,
    );
  },
  true,
  true,
);

/**
 * Inverse de `degrade` : Supprime aléatoirement 50% des événements du pattern. Raccourci pour `.undegradeBy(0.5)`
 * Les événements qui seraient supprimés par degrade sont laissés passer par undegrade et vice versa (voir le deuxième exemple).
 *
 * @name undegrade
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").undegrade()
 * @example
 * s("hh*10").layer(
 *   x => x.degrade().pan(0),
 *   x => x.undegrade().pan(1)
 * )
 */
export const undegrade = register('undegrade', (pat) => pat._undegradeBy(0.5), true, true);

/**
 *
 * Applique aléatoirement la fonction donnée selon la probabilité donnée.
 * Similaire à `someCyclesBy`
 *
 * @name sometimesBy
 * @memberof Pattern
 * @param {number | Pattern} probability - un nombre entre 0 et 1
 * @param {function} function - la transformation à appliquer
 * @returns Pattern
 * @example
 * s("hh*8").sometimesBy(.4, x=>x.speed("0.5"))
 */

export const sometimesBy = register('sometimesBy', function (patx, func, pat) {
  return reify(patx)
    .fmap((x) => stack(pat._degradeBy(x), func(pat._undegradeBy(1 - x))))
    .innerJoin();
});

/**
 *
 * Applique la fonction donnée avec 50% de chance
 *
 * @name sometimes
 * @memberof Pattern
 * @param {function} function - la transformation à appliquer
 * @returns Pattern
 * @example
 * s("hh*8").sometimes(x=>x.speed("0.5"))
 */
export const sometimes = register('sometimes', function (func, pat) {
  return pat._sometimesBy(0.5, func);
});

/**
 *
 * Applique aléatoirement la fonction donnée selon la probabilité donnée cycle par cycle.
 * Similaire à `sometimesBy`
 *
 * @name someCyclesBy
 * @memberof Pattern
 * @param {number | Pattern} probability - un nombre entre 0 et 1
 * @param {function} function - la transformation à appliquer
 * @returns Pattern
 * @example
 * s("bd,hh*8").someCyclesBy(.3, x=>x.speed("0.5"))
 */

export const someCyclesBy = register('someCyclesBy', function (patx, func, pat) {
  return reify(patx)
    .fmap((x) =>
      stack(
        pat._degradeByWith(rand._segment(1), x),
        func(pat._degradeByWith(rand.fmap((r) => 1 - r)._segment(1), 1 - x)),
      ),
    )
    .innerJoin();
});

/**
 *
 * Raccourci pour `.someCyclesBy(0.5, fn)`
 *
 * @name someCycles
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("bd,hh*8").someCycles(x=>x.speed("0.5"))
 */
export const someCycles = register('someCycles', function (func, pat) {
  return pat._someCyclesBy(0.5, func);
});

/**
 *
 * Raccourci pour `.sometimesBy(0.75, fn)`
 *
 * @name often
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").often(x=>x.speed("0.5"))
 */
export const often = register('often', function (func, pat) {
  return pat.sometimesBy(0.75, func);
});

/**
 *
 * Raccourci pour `.sometimesBy(0.25, fn)`
 *
 * @name rarely
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").rarely(x=>x.speed("0.5"))
 */
export const rarely = register('rarely', function (func, pat) {
  return pat.sometimesBy(0.25, func);
});

/**
 *
 * Raccourci pour `.sometimesBy(0.1, fn)`
 *
 * @name almostNever
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").almostNever(x=>x.speed("0.5"))
 */
export const almostNever = register('almostNever', function (func, pat) {
  return pat.sometimesBy(0.1, func);
});

/**
 *
 * Raccourci pour `.sometimesBy(0.9, fn)`
 *
 * @name almostAlways
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").almostAlways(x=>x.speed("0.5"))
 */
export const almostAlways = register('almostAlways', function (func, pat) {
  return pat.sometimesBy(0.9, func);
});

/**
 *
 * Raccourci pour `.sometimesBy(0, fn)` (n'appelle jamais fn)
 *
 * @name never
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").never(x=>x.speed("0.5"))
 */
export const never = register('never', function (_, pat) {
  return pat;
});

/**
 *
 * Raccourci pour `.sometimesBy(1, fn)` (appelle toujours fn)
 *
 * @name always
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("hh*8").always(x=>x.speed("0.5"))
 */
export const always = register('always', function (func, pat) {
  return func(pat);
});

//keyname: string | Array<string>
//keyname reference: https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
export function _keyDown(keyname) {
  if (Array.isArray(keyname) === false) {
    keyname = [keyname];
  }
  const keyState = getCurrentKeyboardState();
  return keyname.every((x) => {
    const keyName = keyAlias.get(x) ?? x;
    return keyState[keyName];
  });
}

/**
 *
 * Fait quelque chose lors d'une pression de touche, ou d'un tableau de pressions de touches
 * [Référence des noms de touches](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values)
 *
 * @name whenKey
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("bd(5,8)").whenKey("Control:j", x => x.segment(16).color("red")).whenKey("Control:i", x => x.fast(2).color("blue"))
 */

export const whenKey = register('whenKey', function (input, func, pat) {
  return pat.when(_keyDown(input), func);
});

/**
 *
 * retourne true lorsqu'une touche ou un tableau de touches est maintenu
 * [Référence des noms de touches](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values)
 *
 * @name keyDown
 * @memberof Pattern
 * @returns Pattern
 * @example
 * keyDown("Control:j").pick([s("bd(5,8)"), s("cp(3,8)")])
 */

export const keyDown = register('keyDown', function (pat) {
  return pat.fmap(_keyDown);
});
