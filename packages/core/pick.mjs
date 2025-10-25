/*
pick.mjs - methods that use one pattern to pick events from other patterns.
Copyright (C) 2024 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/core/signal.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Pattern, reify, silence, register } from './pattern.mjs';

import { _mod, clamp, objectMap } from './util.mjs';

const _pick = function (lookup, pat, modulo = true) {
  const array = Array.isArray(lookup);
  const len = Object.keys(lookup).length;

  lookup = objectMap(lookup, reify);

  if (len === 0) {
    return silence;
  }
  return pat.fmap((i) => {
    let key = i;
    if (array) {
      key = modulo ? Math.round(key) % len : clamp(Math.round(key), 0, lookup.length - 1);
    }
    return lookup[key];
  });
};

/** * Sélectionne des patterns (ou valeurs simples) soit depuis une liste (par index) soit depuis une table de correspondance (par nom).
 * Similaire à `inhabit`, mais conserve la structure des patterns originaux.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 * @example
 * note("<0 1 2!2 3>".pick(["g a", "e f", "f g f g" , "g c d"]))
 * @example
 * sound("<0 1 [2,0]>".pick(["bd sd", "cp cp", "hh hh"]))
 * @example
 * sound("<0!2 [0,1] 1>".pick(["bd(3,8)", "sd sd"]))
 * @example
 * s("<a!2 [a,b] b>".pick({a: "bd(3,8)", b: "sd sd"}))
 */

export const pick = function (lookup, pat) {
  // backward compatibility - the args used to be flipped
  if (Array.isArray(pat)) {
    [pat, lookup] = [lookup, pat];
  }
  return __pick(lookup, pat);
};

const __pick = register('pick', function (lookup, pat) {
  return _pick(lookup, pat, false).innerJoin();
});

/** * Identique à `pick`, mais si vous sélectionnez un nombre supérieur à la taille de la liste,
 * il boucle au début plutôt que de rester à la valeur maximale.
 * Par exemple, si vous sélectionnez le cinquième pattern d'une liste de trois, vous obtiendrez le
 * deuxième.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */

export const pickmod = register('pickmod', function (lookup, pat) {
  return _pick(lookup, pat, true).innerJoin();
});

/** * pickF vous permet d'utiliser un pattern de nombres pour choisir quelle fonction appliquer à un autre pattern.
 * @param {Pattern} pat
 * @param {Pattern} lookup un pattern d'indices
 * @param {function[]} funcs le tableau de fonctions depuis lequel piocher
 * @returns {Pattern}
 * @example
 * s("bd [rim hh]").pickF("<0 1 2>", [rev,jux(rev),fast(2)])
 * @example
 * note("<c2 d2>(3,8)").s("square")
 *     .pickF("<0 2> 1", [jux(rev),fast(2),x=>x.lpf(800)])
 */
export const pickF = register('pickF', function (lookup, funcs, pat) {
  return pat.apply(pick(lookup, funcs));
});

/** * Identique à `pickF`, mais si vous sélectionnez un nombre supérieur à la taille de la liste de fonctions,
 * il boucle au début plutôt que de rester à la valeur maximale.
 * @param {Pattern} pat
 * @param {Pattern} lookup un pattern d'indices
 * @param {function[]} funcs le tableau de fonctions depuis lequel piocher
 * @returns {Pattern}
 */
export const pickmodF = register('pickmodF', function (lookup, funcs, pat) {
  return pat.apply(pickmod(lookup, funcs));
});

/** * Similaire à `pick`, mais applique un outerJoin au lieu d'un innerJoin.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const pickOut = register('pickOut', function (lookup, pat) {
  return _pick(lookup, pat, false).outerJoin();
});

/** * Identique à `pickOut`, mais si vous sélectionnez un nombre supérieur à la taille de la liste,
 * il boucle au début plutôt que de rester à la valeur maximale.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const pickmodOut = register('pickmodOut', function (lookup, pat) {
  return _pick(lookup, pat, true).outerJoin();
});

/** * Similaire à `pick`, mais le pattern choisi redémarre lorsque son index est déclenché.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const pickRestart = register('pickRestart', function (lookup, pat) {
  return _pick(lookup, pat, false).restartJoin();
});

/** * Identique à `pickRestart`, mais si vous sélectionnez un nombre supérieur à la taille de la liste,
   * il boucle au début plutôt que de rester à la valeur maximale.
   * @param {Pattern} pat
   * @param {*} xs
   * @returns {Pattern}
   * @example
   * "<a@2 b@2 c@2 d@2>".pickRestart({
        a: n("0 1 2 0"),
        b: n("2 3 4 ~"),
        c: n("[4 5] [4 3] 2 0"),
        d: n("0 -3 0 ~")
      }).scale("C:major").s("piano")
   */
export const pickmodRestart = register('pickmodRestart', function (lookup, pat) {
  return _pick(lookup, pat, true).restartJoin();
});

/** * Similaire à `pick`, mais le pattern choisi est réinitialisé lorsque son index est déclenché.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const pickReset = register('pickReset', function (lookup, pat) {
  return _pick(lookup, pat, false).resetJoin();
});

/** * Identique à `pickReset`, mais si vous sélectionnez un nombre supérieur à la taille de la liste,
 * il boucle au début plutôt que de rester à la valeur maximale.
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */
export const pickmodReset = register('pickmodReset', function (lookup, pat) {
  return _pick(lookup, pat, true).resetJoin();
});

/** Sélectionne des patterns (ou valeurs simples) soit depuis une liste (par index) soit depuis une table de correspondance (par nom).
   * Similaire à `pick`, mais les cycles sont compressés dans le pattern cible ('habité').
   * @name inhabit
   * @synonyms pickSqueeze
   * @param {Pattern} pat
   * @param {*} xs
   * @returns {Pattern}
   * @example
   * "<a b [a,b]>".inhabit({a: s("bd(3,8)"),
                            b: s("cp sd")
                           })
   * @example
   * s("a@2 [a b] a".inhabit({a: "bd(3,8)", b: "sd sd"})).slow(4)
   */
export const { inhabit, pickSqueeze } = register(['inhabit', 'pickSqueeze'], function (lookup, pat) {
  return _pick(lookup, pat, false).squeezeJoin();
});

/** * Identique à `inhabit`, mais si vous sélectionnez un nombre supérieur à la taille de la liste,
 * il boucle au début plutôt que de rester à la valeur maximale.
 * Par exemple, si vous sélectionnez le cinquième pattern d'une liste de trois, vous obtiendrez le
 * deuxième.
 * @name inhabitmod
 * @synonyms pickmodSqueeze
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 */

export const { inhabitmod, pickmodSqueeze } = register(['inhabitmod', 'pickmodSqueeze'], function (lookup, pat) {
  return _pick(lookup, pat, true).squeezeJoin();
});

/**
 * Sélectionne depuis la liste de valeurs (ou patterns de valeurs) via l'index en utilisant le
 * pattern d'entiers donné. Le pattern sélectionné sera compressé pour correspondre à la durée de l'événement sélecteur
 * @param {Pattern} pat
 * @param {*} xs
 * @returns {Pattern}
 * @example
 * note(squeeze("<0@2 [1!2] 2>", ["g a", "f g f g" , "g a c d"]))
 */

export const squeeze = (pat, xs) => {
  xs = xs.map(reify);
  if (xs.length == 0) {
    return silence;
  }
  return pat
    .fmap((i) => {
      const key = _mod(Math.round(i), xs.length);
      return xs[key];
    })
    .squeezeJoin();
};
