/*
pattern.mjs - Core pattern representation for strudel
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/core/pattern.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import TimeSpan from './timespan.mjs';
import Fraction, { isFraction, lcm } from './fraction.mjs';
import Hap from './hap.mjs';
import State from './state.mjs';
import { unionWithObj } from './value.mjs';

import {
  uniqsortr,
  removeUndefineds,
  flatten,
  id,
  listRange,
  curry,
  _mod,
  numeralArgs,
  parseNumeral,
  pairs,
  zipWith,
  stringifyValues,
} from './util.mjs';
import drawLine from './drawLine.mjs';
import { logger } from './logger.mjs';

let stringParser;

let __steps = true;

export const calculateSteps = function (x) {
  __steps = x ? true : false;
};

// parser is expected to turn a string into a pattern
// if set, the reify function will parse all strings with it
// intended to use with mini to automatically interpret all strings as mini notation
export const setStringParser = (parser) => (stringParser = parser);

/** @class Classe représentant un pattern. */
export class Pattern {
  /**
   * Crée un pattern. En tant qu'utilisateur final, vous ne créerez probablement pas un Pattern directement.
   *
   * @param {function} query - La fonction qui mappe un `State` vers un tableau de `Hap`.
   * @noAutocomplete
   */
  constructor(query, steps = undefined) {
    this.query = query;
    this._Pattern = true; // this property is used to detectinstance of another Pattern
    this._steps = steps; // in terms of number of steps per cycle
  }

  get _steps() {
    return this.__steps;
  }

  set _steps(steps) {
    this.__steps = steps === undefined ? undefined : Fraction(steps);
  }

  setSteps(steps) {
    this._steps = steps;
    return this;
  }

  withSteps(f) {
    if (!__steps) {
      return this;
    }
    return new Pattern(this.query, this._steps === undefined ? undefined : f(this._steps));
  }

  get hasSteps() {
    return this._steps !== undefined;
  }

  //////////////////////////////////////////////////////////////////////
  // Haskell-style functor, applicative and monadic operations

  /**
   * Retourne un nouveau pattern, avec la fonction appliquée à la valeur de
   * chaque hap. A l'alias `fmap`.
   * @synonyms fmap
   * @param {Function} func à appliquer à la valeur
   * @returns Pattern
   * @example
   * "0 1 2".withValue(v => v + 10).log()
   */
  withValue(func) {
    const result = new Pattern((state) => this.query(state).map((hap) => hap.withValue(func)));
    result._steps = this._steps;
    return result;
  }

  // runs func on query state
  withState(func) {
    return new Pattern((state) => this.query(func(state)));
  }

  /**
   * voir `withValue`
   * @noAutocomplete
   */
  fmap(func) {
    return this.withValue(func);
  }

  /**
   * Suppose que 'this' est un pattern de fonctions, et étant donnée une fonction pour
   * résoudre les wholes, applique un pattern de valeurs donné à ce
   * pattern de fonctions.
   * @param {Function} whole_func
   * @param {Function} func
   * @noAutocomplete
   * @returns Pattern
   */
  appWhole(whole_func, pat_val) {
    const pat_func = this;
    const query = function (state) {
      const hap_funcs = pat_func.query(state);
      const hap_vals = pat_val.query(state);
      const apply = function (hap_func, hap_val) {
        const s = hap_func.part.intersection(hap_val.part);
        if (s == undefined) {
          return undefined;
        }
        return new Hap(
          whole_func(hap_func.whole, hap_val.whole),
          s,
          hap_func.value(hap_val.value),
          hap_val.combineContext(hap_func),
        );
      };
      return flatten(
        hap_funcs.map((hap_func) => removeUndefineds(hap_vals.map((hap_val) => apply(hap_func, hap_val)))),
      );
    };
    return new Pattern(query);
  }

  /**
   * Lorsque cette méthode est appelée sur un pattern de fonctions, elle fait correspondre ses haps
   * avec ceux du pattern de valeurs donné. Un nouveau pattern est retourné, avec
   * chaque valeur correspondante appliquée à la fonction correspondante.
   *
   * Dans cette variante `_appBoth`, où les timespans des haps de fonction et de valeur
   * ne sont pas identiques mais se croisent, le hap résultant a un timespan de
   * l'intersection. Ceci s'applique à la fois au part et au whole timespan.
   * @param {Pattern} pat_val
   * @noAutocomplete
   * @returns Pattern
   */
  appBoth(pat_val) {
    const pat_func = this;

    // Tidal's <*>
    const whole_func = function (span_a, span_b) {
      if (span_a == undefined || span_b == undefined) {
        return undefined;
      }
      return span_a.intersection_e(span_b);
    };
    const result = pat_func.appWhole(whole_func, pat_val);
    if (__steps) {
      result._steps = lcm(pat_val._steps, pat_func._steps);
    }
    return result;
  }

  /**
   * Comme avec `appBoth`, mais le timespan `whole` n'est pas l'intersection,
   * mais le timespan du pattern de fonctions sur lequel cette méthode est appelée.
   * En pratique, cela signifie que la structure du pattern, y compris les déclenchements,
   * est préservée du pattern de fonctions (souvent appelé le pattern de gauche
   * ou pattern interne).
   * @param {Pattern} pat_val
   * @noAutocomplete
   * @returns Pattern
   */
  appLeft(pat_val) {
    const pat_func = this;

    const query = function (state) {
      const haps = [];
      for (const hap_func of pat_func.query(state)) {
        const hap_vals = pat_val.query(state.setSpan(hap_func.wholeOrPart()));
        for (const hap_val of hap_vals) {
          const new_whole = hap_func.whole;
          const new_part = hap_func.part.intersection(hap_val.part);
          if (new_part) {
            const new_value = hap_func.value(hap_val.value);
            const new_context = hap_val.combineContext(hap_func);
            const hap = new Hap(new_whole, new_part, new_value, new_context);
            haps.push(hap);
          }
        }
      }
      return haps;
    };
    const result = new Pattern(query);
    result._steps = this._steps;
    return result;
  }

  /**
   * Comme avec `appLeft`, mais les timespans `whole` sont plutôt pris du
   * pattern de valeurs, c'est-à-dire que la structure est préservée du pattern de droite/externe.
   * @param {Pattern} pat_val
   * @noAutocomplete
   * @returns Pattern
   */
  appRight(pat_val) {
    const pat_func = this;

    const query = function (state) {
      const haps = [];
      for (const hap_val of pat_val.query(state)) {
        const hap_funcs = pat_func.query(state.setSpan(hap_val.wholeOrPart()));
        for (const hap_func of hap_funcs) {
          const new_whole = hap_val.whole;
          const new_part = hap_func.part.intersection(hap_val.part);
          if (new_part) {
            const new_value = hap_func.value(hap_val.value);
            const new_context = hap_val.combineContext(hap_func);
            const hap = new Hap(new_whole, new_part, new_value, new_context);
            haps.push(hap);
          }
        }
      }
      return haps;
    };
    const result = new Pattern(query);
    result._steps = pat_val._steps;
    return result;
  }

  bindWhole(choose_whole, func) {
    const pat_val = this;
    const query = function (state) {
      const withWhole = function (a, b) {
        return new Hap(
          choose_whole(a.whole, b.whole),
          b.part,
          b.value,
          Object.assign({}, a.context, b.context, {
            locations: (a.context.locations || []).concat(b.context.locations || []),
          }),
        );
      };
      const match = function (a) {
        return func(a.value)
          .query(state.setSpan(a.part))
          .map((b) => withWhole(a, b));
      };
      return flatten(pat_val.query(state).map((a) => match(a)));
    };
    return new Pattern(query);
  }

  bind(func) {
    const whole_func = function (a, b) {
      if (a == undefined || b == undefined) {
        return undefined;
      }
      return a.intersection_e(b);
    };
    return this.bindWhole(whole_func, func);
  }

  join() {
    // Flattens a pattern of patterns into a pattern, where wholes are
    // the intersection of matched inner and outer haps.
    return this.bind(id);
  }

  outerBind(func) {
    return this.bindWhole((a) => a, func).setSteps(this._steps);
  }

  outerJoin() {
    // Flattens a pattern of patterns into a pattern, where wholes are
    // taken from outer haps.
    return this.outerBind(id);
  }

  innerBind(func) {
    return this.bindWhole((_, b) => b, func);
  }

  innerJoin() {
    // Flattens a pattern of patterns into a pattern, where wholes are
    // taken from inner haps.
    return this.innerBind(id);
  }

  // Flatterns patterns of patterns, by retriggering/resetting inner patterns at onsets of outer pattern haps
  resetJoin(restart = false) {
    const pat_of_pats = this;
    return new Pattern((state) => {
      return (
        pat_of_pats
          // drop continuous haps from the outer pattern.
          .discreteOnly()
          .query(state)
          .map((outer_hap) => {
            return (
              outer_hap.value
                // reset = align the inner pattern cycle start to outer pattern haps
                // restart = align the inner pattern cycle zero to outer pattern haps
                .late(restart ? outer_hap.whole.begin : outer_hap.whole.begin.cyclePos())
                .query(state)
                .map((inner_hap) =>
                  new Hap(
                    // Supports continuous haps in the inner pattern
                    inner_hap.whole ? inner_hap.whole.intersection(outer_hap.whole) : undefined,
                    inner_hap.part.intersection(outer_hap.part),
                    inner_hap.value,
                  ).setContext(outer_hap.combineContext(inner_hap)),
                )
                // Drop haps that didn't intersect
                .filter((hap) => hap.part)
            );
          })
          .flat()
      );
    });
  }

  restartJoin() {
    return this.resetJoin(true);
  }

  // Like the other joins above, joins a pattern of patterns of values, into a flatter
  // pattern of values. In this case it takes whole cycles of the inner pattern to fit each event
  // in the outer pattern.
  squeezeJoin() {
    // A pattern of patterns, which we call the 'outer' pattern, with patterns
    // as values which we call the 'inner' patterns.
    const pat_of_pats = this;
    function query(state) {
      // Get the events with the inner patterns. Ignore continuous events (without 'wholes')
      const haps = pat_of_pats.discreteOnly().query(state);
      // A function to map over the events from the outer pattern.
      function flatHap(outerHap) {
        // Get the inner pattern, slowed and shifted so that the 'whole'
        // timespan of the outer event corresponds to the first cycle of the
        // inner event
        const inner_pat = outerHap.value._focusSpan(outerHap.wholeOrPart());
        // Get the inner events, from the timespan of the outer event's part
        const innerHaps = inner_pat.query(state.setSpan(outerHap.part));
        // A function to map over the inner events, to combine them with the
        // outer event
        function munge(outer, inner) {
          let whole = undefined;
          if (inner.whole && outer.whole) {
            whole = inner.whole.intersection(outer.whole);
            if (!whole) {
              // The wholes are present, but don't intersect
              return undefined;
            }
          }
          const part = inner.part.intersection(outer.part);
          if (!part) {
            // The parts don't intersect
            return undefined;
          }
          const context = inner.combineContext(outer);
          return new Hap(whole, part, inner.value, context);
        }
        return innerHaps.map((innerHap) => munge(outerHap, innerHap));
      }
      const result = flatten(haps.map(flatHap));
      // remove undefineds
      return result.filter((x) => x);
    }
    return new Pattern(query);
  }

  squeezeBind(func) {
    return this.fmap(func).squeezeJoin();
  }

  polyJoin = function () {
    const pp = this;
    return pp.fmap((p) => p.extend(pp._steps.div(p._steps))).outerJoin();
  };

  polyBind(func) {
    return this.fmap(func).polyJoin();
  }

  //////////////////////////////////////////////////////////////////////
  // Utility methods mainly for internal use

  /**
   * Interroge les haps dans le timespan donné.
   *
   * @param {Fraction | number} begin temps de début
   * @param {Fraction | number} end temps de fin
   * @returns Hap[]
   * @example
   * const pattern = sequence('a', ['b', 'c'])
   * const haps = pattern.queryArc(0, 1)
   * console.log(haps)
   * silence
   * @noAutocomplete
   */
  queryArc(begin, end, controls = {}) {
    try {
      return this.query(new State(new TimeSpan(begin, end), controls));
    } catch (err) {
      logger(`[query]: ${err.message}`, 'error');
      return [];
    }
  }

  /**
   * Retourne un nouveau pattern, avec les requêtes divisées aux limites de cycle. Cela rend
   * certains calculs plus faciles à exprimer, car tous les haps sont alors contraints à
   * se produire dans un cycle.
   * @returns Pattern
   * @noAutocomplete
   */
  splitQueries() {
    const pat = this;
    const q = (state) => {
      return flatten(state.span.spanCycles.map((subspan) => pat.query(state.setSpan(subspan))));
    };
    return new Pattern(q);
  }

  /**
   * Retourne un nouveau pattern, où la fonction donnée est appliquée au timespan
   * de requête avant de le passer au pattern original.
   * @param {Function} func la fonction à appliquer
   * @returns Pattern
   * @noAutocomplete
   */
  withQuerySpan(func) {
    return new Pattern((state) => this.query(state.withSpan(func)));
  }

  withQuerySpanMaybe(func) {
    const pat = this;
    return new Pattern((state) => {
      const newState = state.withSpan(func);
      if (!newState.span) {
        return [];
      }
      return pat.query(newState);
    });
  }

  /**
   * Comme avec `withQuerySpan`, mais la fonction est appliquée à la fois au
   * temps de début et de fin du timespan de requête.
   * @param {Function} func la fonction à appliquer
   * @returns Pattern
   * @noAutocomplete
   */
  withQueryTime(func) {
    return new Pattern((state) => this.query(state.withSpan((span) => span.withTime(func))));
  }

  /**
   * Similaire à `withQuerySpan`, mais la fonction est appliquée aux timespans
   * de tous les haps retournés par les requêtes de pattern (à la fois les timespans `part`, et lorsque
   * présents, les timespans `whole`).
   * @param {Function} func
   * @returns Pattern
   * @noAutocomplete
   */
  withHapSpan(func) {
    return new Pattern((state) => this.query(state).map((hap) => hap.withSpan(func)));
  }

  /**
   * Comme avec `withHapSpan`, mais la fonction est appliquée à la fois au
   * temps de début et de fin des timespans de hap.
   * @param {Function} func la fonction à appliquer
   * @returns Pattern
   * @noAutocomplete
   */
  withHapTime(func) {
    return this.withHapSpan((span) => span.withTime(func));
  }

  /**
   * Retourne un nouveau pattern avec la fonction donnée appliquée à la liste de haps retournés par chaque requête.
   * @param {Function} func
   * @returns Pattern
   * @noAutocomplete
   */
  withHaps(func) {
    const result = new Pattern((state) => func(this.query(state), state));
    result._steps = this._steps;
    return result;
  }

  /**
   * Comme avec `withHaps`, mais applique la fonction à chaque hap, plutôt qu'à chaque liste de haps.
   * @param {Function} func
   * @returns Pattern
   * @noAutocomplete
   */
  withHap(func) {
    return this.withHaps((haps) => haps.map(func));
  }

  /**
   * Retourne un nouveau pattern avec le champ context de chaque hap défini sur la valeur donnée.
   * @param {*} context
   * @returns Pattern
   * @noAutocomplete
   */
  setContext(context) {
    return this.withHap((hap) => hap.setContext(context));
  }

  /**
   * Retourne un nouveau pattern avec la fonction donnée appliquée au champ context de chaque hap.
   * @param {Function} func
   * @returns Pattern
   * @noAutocomplete
   */
  withContext(func) {
    const result = this.withHap((hap) => hap.setContext(func(hap.context)));
    if (this.__pure !== undefined) {
      result.__pure = this.__pure;
      result.__pure_loc = this.__pure_loc;
    }
    return result;
  }

  /**
   * Retourne un nouveau pattern avec le champ context de chaque hap défini sur un objet vide.
   * @returns Pattern
   * @noAutocomplete
   */
  stripContext() {
    return this.withHap((hap) => hap.setContext({}));
  }

  /**
   * Retourne un nouveau pattern avec les informations de localisation données ajoutées au
   * context de chaque hap.
   * @param {Number} start décalage de début
   * @param {Number} end décalage de fin
   * @returns Pattern
   * @noAutocomplete
   */
  withLoc(start, end) {
    const location = {
      start,
      end,
    };
    const result = this.withContext((context) => {
      const locations = (context.locations || []).concat([location]);
      return { ...context, locations };
    });
    if (this.__pure) {
      result.__pure = this.__pure;
      result.__pure_loc = location;
    }
    return result;
  }

  /**
   * Retourne un nouveau Pattern, qui ne retourne que les haps qui satisfont le test donné.
   * @param {Function} hap_test - une fonction qui retourne false pour les haps à supprimer du pattern
   * @returns Pattern
   * @noAutocomplete
   */
  filterHaps(hap_test) {
    return new Pattern((state) => this.query(state).filter(hap_test));
  }

  /**
   * Comme avec `filterHaps`, mais la fonction est appliquée aux valeurs
   * à l'intérieur des haps.
   * @param {Function} value_test
   * @returns Pattern
   * @noAutocomplete
   */
  filterValues(value_test) {
    return new Pattern((state) => this.query(state).filter((hap) => value_test(hap.value))).setSteps(this._steps);
  }

  /**
   * Retourne un nouveau pattern, avec les haps contenant des valeurs undefined supprimés des
   * résultats de requête.
   * @returns Pattern
   * @noAutocomplete
   */
  removeUndefineds() {
    return this.filterValues((val) => val != undefined);
  }

  /**
   * Retourne un nouveau pattern, avec tous les haps sans déclenchements filtrés. Un hap
   * avec un déclenchement est un hap avec un timespan `whole` qui commence au même moment
   * que son timespan `part`.
   * @returns Pattern
   * @noAutocomplete
   */
  onsetsOnly() {
    // Returns a new pattern that will only return haps where the start
    // of the 'whole' timespan matches the start of the 'part'
    // timespan, i.e. the haps that include their 'onset'.
    return this.filterHaps((hap) => hap.hasOnset());
  }

  /**
   * Retourne un nouveau pattern, avec les haps 'continus' (ceux sans timespans
   * 'whole') supprimés des résultats de requête.
   * @returns Pattern
   * @noAutocomplete
   */
  discreteOnly() {
    // removes continuous haps that don't have a 'whole' timespan
    return this.filterHaps((hap) => hap.whole);
  }

  /**
   * Combine les haps adjacents avec la même valeur et whole. Destiné
   * uniquement à être utilisé dans les tests.
   * @noAutocomplete
   */
  defragmentHaps() {
    // remove continuous haps
    const pat = this.discreteOnly();

    return pat.withHaps((haps) => {
      const result = [];
      for (var i = 0; i < haps.length; ++i) {
        var searching = true;
        var a = haps[i];
        while (searching) {
          const a_value = JSON.stringify(haps[i].value);
          var found = false;

          for (var j = i + 1; j < haps.length; j++) {
            const b = haps[j];

            if (a.whole.equals(b.whole)) {
              if (a.part.begin.eq(b.part.end)) {
                if (a_value === JSON.stringify(b.value)) {
                  // eat the matching hap into 'a'
                  a = new Hap(a.whole, new TimeSpan(b.part.begin, a.part.end), a.value);
                  haps.splice(j, 1);
                  // restart the search
                  found = true;
                  break;
                }
              } else if (b.part.begin.eq(a.part.end)) {
                if (a_value == JSON.stringify(b.value)) {
                  // eat the matching hap into 'a'
                  a = new Hap(a.whole, new TimeSpan(a.part.begin, b.part.end), a.value);
                  haps.splice(j, 1);
                  // restart the search
                  found = true;
                  break;
                }
              }
            }
          }

          searching = found;
        }
        result.push(a);
      }
      return result;
    });
  }

  /**
   * Interroge le pattern pour le premier cycle, retournant des Haps. Principalement utile lors du
   * débogage d'un pattern.
   * @param {Boolean} with_context - définir sur true, sinon le champ context
   * sera supprimé des haps résultants.
   * @returns [Hap]
   * @noAutocomplete
   */
  firstCycle(with_context = false) {
    var self = this;
    if (!with_context) {
      self = self.stripContext();
    }
    return self.query(new State(new TimeSpan(Fraction(0), Fraction(1))));
  }

  /**
   * Accesseur pour une liste de valeurs retournées en interrogeant le premier cycle.
   * @noAutocomplete
   */
  get firstCycleValues() {
    return this.firstCycle().map((hap) => hap.value);
  }

  /**
   * Version plus lisible de l'accesseur `firstCycleValues`.
   * @noAutocomplete
   */
  get showFirstCycle() {
    return this.firstCycle().map(
      (hap) => `${hap.value}: ${hap.whole.begin.toFraction()} - ${hap.whole.end.toFraction()}`,
    );
  }

  /**
   * Retourne un nouveau pattern, qui retourne les haps triés par ordre temporel. Principalement
   * utile lors de la comparaison de deux patterns pour l'égalité, dans les tests.
   * @returns Pattern
   * @noAutocomplete
   */
  sortHapsByPart() {
    return this.withHaps((haps) =>
      haps.sort((a, b) =>
        a.part.begin
          .sub(b.part.begin)
          .or(a.part.end.sub(b.part.end))
          .or(a.whole.begin.sub(b.whole.begin).or(a.whole.end.sub(b.whole.end))),
      ),
    );
  }

  asNumber() {
    return this.fmap(parseNumeral);
  }

  //////////////////////////////////////////////////////////////////////
  // Operators - see 'make composers' later..

  _opIn(other, func) {
    return this.fmap(func).appLeft(reify(other));
  }
  _opOut(other, func) {
    return this.fmap(func).appRight(reify(other));
  }
  _opMix(other, func) {
    return this.fmap(func).appBoth(reify(other));
  }
  _opSqueeze(other, func) {
    const otherPat = reify(other);
    return this.fmap((a) => otherPat.fmap((b) => func(a)(b))).squeezeJoin();
  }
  _opSqueezeOut(other, func) {
    const thisPat = this;
    const otherPat = reify(other);
    return otherPat.fmap((a) => thisPat.fmap((b) => func(b)(a))).squeezeJoin();
  }
  _opReset(other, func) {
    const otherPat = reify(other);
    return otherPat.fmap((b) => this.fmap((a) => func(a)(b))).resetJoin();
  }
  _opRestart(other, func) {
    const otherPat = reify(other);
    return otherPat.fmap((b) => this.fmap((a) => func(a)(b))).restartJoin();
  }
  _opPoly(other, func) {
    const otherPat = reify(other);
    return this.fmap((b) => otherPat.fmap((a) => func(a)(b))).polyJoin();
  }

  //////////////////////////////////////////////////////////////////////
  // End-user methods.
  // Those beginning with an underscore (_) are 'patternified',
  // i.e. versions are created without the underscore, that are
  // magically transformed to accept patterns for all their arguments.

  //////////////////////////////////////////////////////////////////////
  // Methods without corresponding toplevel functions

  /**
   * Superpose le résultat de la/des fonction(s) donnée(s). Comme `superimpose`, mais sans le pattern original :
   * @name layer
   * @memberof Pattern
   * @synonyms apply
   * @returns Pattern
   * @example
   * "<0 2 4 6 ~ 4 ~ 2 0!3 ~!5>*8"
   *   .layer(x=>x.add("0,2"))
   *   .scale('C minor').note()
   */
  layer(...funcs) {
    return stack(...funcs.map((func) => func(this)));
  }

  /**
   * Superpose le résultat de la/des fonction(s) donnée(s) par-dessus le pattern original :
   * @name superimpose
   * @memberof Pattern
   * @returns Pattern
   * @example
   * "<0 2 4 6 ~ 4 ~ 2 0!3 ~!5>*8"
   *   .superimpose(x=>x.add(2))
   *   .scale('C minor').note()
   */
  superimpose(...funcs) {
    return this.stack(...funcs.map((func) => func(this)));
  }

  //////////////////////////////////////////////////////////////////////
  // Multi-pattern functions

  stack(...pats) {
    return stack(this, ...pats);
  }

  sequence(...pats) {
    return sequence(this, ...pats);
  }

  seq(...pats) {
    return sequence(this, ...pats);
  }
  cat(...pats) {
    return cat(this, ...pats);
  }

  fastcat(...pats) {
    return fastcat(this, ...pats);
  }

  slowcat(...pats) {
    return slowcat(this, ...pats);
  }

  //////////////////////////////////////////////////////////////////////
  // Context methods - ones that deal with metadata

  onTrigger(onTrigger, dominant = true) {
    return this.withHap((hap) =>
      hap.setContext({
        ...hap.context,
        onTrigger: (...args) => {
          // run previously set trigger, if it exists
          hap.context.onTrigger?.(...args);
          onTrigger(...args);
        },
        // if dominantTrigger is set to true, the default output (webaudio) will be disabled
        // when using multiple triggers, you cannot flip this flag to false again!
        // example: x.csound('CooLSynth').log() as well as x.log().csound('CooLSynth') should work the same
        dominantTrigger: hap.context.dominantTrigger || dominant,
      }),
    );
  }

  /**
   * Écrit le contenu de l'événement actuel dans la console (visible dans le menu latéral).
   * @name log
   * @memberof Pattern
   * @example
   * s("bd sd").log()
   */
  log(func = (hap) => `[hap] ${hap.showWhole(true)}`, getData = (hap) => ({ hap })) {
    return this.onTrigger((...args) => {
      logger(func(...args), undefined, getData(...args));
    }, false);
  }

  /**
   * Une version simplifiée de `log` qui écrit toutes les "valeurs" (divers paramètres configurables)
   * de l'événement dans la console (visible dans le menu latéral).
   * @name logValues
   * @memberof Pattern
   * @example
   * s("bd sd").gain("0.25 0.5 1").n("2 1 0").logValues()
   */
  logValues(func = (value) => `[hap] ${stringifyValues(value, true)}`) {
    return this.log((hap) => func(hap.value));
  }

  //////////////////////////////////////////////////////////////////////
  // Visualisation

  drawLine() {
    console.log(drawLine(this));
    return this;
  }

  //////////////////////////////////////////////////////////////////////
  // methods relating to breaking patterns into subcycles

  // Breaks a pattern into a pattern of patterns, according to the structure of the given binary pattern.
  unjoin(pieces, func = id) {
    return pieces.withHap((hap) =>
      hap.withValue((v) => (v ? func(this.ribbon(hap.whole.begin, hap.whole.duration)) : this)),
    );
  }

  /**
   * Divise un pattern en morceaux selon la structure d'un pattern donné.
   * Les valeurs True dans le pattern donné font que le sous-cycle correspondant du
   * pattern source est bouclé, et qu'une fonction donnée (optionnelle) soit
   * appliquée. Les valeurs False font que la partie correspondante du pattern source
   * est jouée sans modification.
   * @name into
   * @memberof Pattern
   * @example
   * sound("bd sd ht lt").into("1 0", hurry(2))
   */
  into(pieces, func) {
    return this.unjoin(pieces, func).innerJoin();
  }
}

//////////////////////////////////////////////////////////////////////
// functions relating to chords/patterns of lists/lists of patterns

// returns Array<Hap[]> where each list of haps satisfies eq
function groupHapsBy(eq, haps) {
  let groups = [];
  haps.forEach((hap) => {
    const match = groups.findIndex(([other]) => eq(hap, other));
    if (match === -1) {
      groups.push([hap]);
    } else {
      groups[match].push(hap);
    }
  });
  return groups;
}

// congruent haps = haps with equal spans
const congruent = (a, b) => a.spanEquals(b);
// Pattern<Hap<T>> -> Pattern<Hap<T[]>>
// returned pattern contains arrays of congruent haps
Pattern.prototype.collect = function () {
  return this.withHaps((haps) =>
    groupHapsBy(congruent, haps).map((_haps) => new Hap(_haps[0].whole, _haps[0].part, _haps, {})),
  );
};

/**
 * Sélectionne des indices dans les notes empilées.
 * @example
 * note("<[c,eb,g]!2 [c,f,ab] [d,f,ab]>")
 * .arpWith(haps => haps[2])
 * */
export const arpWith = register('arpWith', (func, pat) => {
  return pat
    .collect()
    .fmap((v) => reify(func(v)))
    .innerJoin()
    .withHap((h) => new Hap(h.whole, h.part, h.value.value, h.combineContext(h.value)));
});

/**
 * Sélectionne des indices dans les notes empilées.
 * @example
 * note("<[c,eb,g]!2 [c,f,ab] [d,f,ab]>")
 * .arp("0 [0,2] 1 [0,2]")
 * */
export const arp = register(
  'arp',
  (indices, pat) => pat.arpWith((haps) => reify(indices).fmap((i) => haps[i % haps.length])),
  false,
);

/*
 * Takes a time duration followed by one or more patterns, and shifts the given patterns in time, so they are
 * distributed equally over the given time duration. They are then combined with the pattern 'weave' is called on, after it has been stretched out (i.e. slowed down by) the time duration.
 * @name weave
 * @memberof Pattern
 * @example pan(saw).weave(4, s("bd(3,8)"), s("~ sd"))
 * @example n("0 1 2 3 4 5 6 7").weave(8, s("bd(3,8)"), s("~ sd"))

addToPrototype('weave', function (t, ...pats) {
  return this.weaveWith(t, ...pats.map((x) => set.out(x)));
});

*/
/*
 * Like 'weave', but accepts functions rather than patterns, which are applied to the pattern.
 * @name weaveWith
 * @memberof Pattern

addToPrototype('weaveWith', function (t, ...funcs) {
  const pat = this;
  const l = funcs.length;
  t = Fraction(t);
  if (l == 0) {
    return silence;
  }
  return stack(...funcs.map((func, i) => pat.inside(t, func).early(Fraction(i).div(l))))._slow(t);
});
*/

//////////////////////////////////////////////////////////////////////
// compose matrix functions

function _nonArrayObject(x) {
  return !Array.isArray(x) && typeof x === 'object' && !isFraction(x);
}
function _composeOp(a, b, func) {
  if (_nonArrayObject(a) || _nonArrayObject(b)) {
    if (!_nonArrayObject(a)) {
      a = { value: a };
    }
    if (!_nonArrayObject(b)) {
      b = { value: b };
    }
    return unionWithObj(a, b, func);
  }
  return func(a, b);
}

// Make composers
(function () {
  // pattern composers
  const composers = {
    set: [(a, b) => b],
    keep: [(a) => a],
    keepif: [(a, b) => (b ? a : undefined)],

    // numerical functions
    /**
     *
     * Suppose un pattern de nombres. Ajoute le nombre donné à chaque élément du pattern.
     * @name add
     * @memberof Pattern
     * @example
     * // Here, the triad 0, 2, 4 is shifted by different amounts
     * n("0 2 4".add("<0 3 4 0>")).scale("C:major")
     * // Without add, the equivalent would be:
     * // n("<[0 2 4] [3 5 7] [4 6 8] [0 2 4]>").scale("C:major")
     * @example
     * // You can also use add with notes:
     * note("c3 e3 g3".add("<0 5 7 0>"))
     * // Behind the scenes, the notes are converted to midi numbers:
     * // note("48 52 55".add("<0 5 7 0>"))
     */
    add: [numeralArgs((a, b) => a + b)], // support string concatenation
    /**
     *
     * Comme add, mais les nombres donnés sont soustraits.
     * @name sub
     * @memberof Pattern
     * @example
     * n("0 2 4".sub("<0 1 2 3>")).scale("C4:minor")
     * // See add for more information.
     */
    sub: [numeralArgs((a, b) => a - b)],
    /**
     *
     * Multiplie chaque nombre par le facteur donné.
     * @name mul
     * @memberof Pattern
     * @example
     * "<1 1.5 [1.66, <2 2.33>]>*4".mul(150).freq()
     */
    mul: [numeralArgs((a, b) => a * b)],
    /**
     *
     * Divise chaque nombre par le facteur donné.
     * @name div
     * @memberof Pattern
     */
    div: [numeralArgs((a, b) => a / b)],
    mod: [numeralArgs(_mod)],
    pow: [numeralArgs(Math.pow)],
    log2: [numeralArgs(Math.log2)],
    band: [numeralArgs((a, b) => a & b)],
    bor: [numeralArgs((a, b) => a | b)],
    bxor: [numeralArgs((a, b) => a ^ b)],
    blshift: [numeralArgs((a, b) => a << b)],
    brshift: [numeralArgs((a, b) => a >> b)],

    // TODO - force numerical comparison if both look like numbers?
    lt: [(a, b) => a < b],
    gt: [(a, b) => a > b],
    lte: [(a, b) => a <= b],
    gte: [(a, b) => a >= b],
    eq: [(a, b) => a == b],
    eqt: [(a, b) => a === b],
    ne: [(a, b) => a != b],
    net: [(a, b) => a !== b],
    and: [(a, b) => a && b],
    or: [(a, b) => a || b],

    //  bitwise ops
    func: [(a, b) => b(a)],
  };

  const hows = ['In', 'Out', 'Mix', 'Squeeze', 'SqueezeOut', 'Reset', 'Restart', 'Poly'];

  // generate methods to do what and how
  for (const [what, [op, preprocess]] of Object.entries(composers)) {
    // make plain version, e.g. pat._add(value) adds that plain value
    // to all the values in pat
    Pattern.prototype['_' + what] = function (value) {
      return this.fmap((x) => op(x, value));
    };

    // make patternified monster version
    Object.defineProperty(Pattern.prototype, what, {
      // a getter that returns a function, so 'pat' can be
      // accessed by closures that are methods of that function..
      get: function () {
        const pat = this;

        // wrap the 'in' function as default behaviour
        const wrapper = (...other) => pat[what]['in'](...other);

        // add methods to that function for each behaviour
        for (const how of hows) {
          wrapper[how.toLowerCase()] = function (...other) {
            var howpat = pat;
            other = sequence(other);
            if (preprocess) {
              howpat = preprocess(howpat);
              other = preprocess(other);
            }
            var result;
            // hack to remove undefs when doing 'keepif'
            if (what === 'keepif') {
              // avoid union, as we want to throw away the value of 'b' completely
              result = howpat['_op' + how](other, (a) => (b) => op(a, b));
              result = result.removeUndefineds();
            } else {
              result = howpat['_op' + how](other, (a) => (b) => _composeOp(a, b, op));
            }
            return result;
          };
        }
        wrapper.squeezein = wrapper.squeeze;

        return wrapper;
      },
    });

    // Default op to 'set', e.g. pat.squeeze(pat2) = pat.set.squeeze(pat2)
    for (const how of hows) {
      Pattern.prototype[how.toLowerCase()] = function (...args) {
        return this.set[how.toLowerCase()](args);
      };
    }
  }

  // binary composers
  /**
   * Applique la structure donnée au pattern :
   *
   * @example
   * note("c,eb,g")
   *   .struct("x ~ x ~ ~ x ~ x ~ ~ ~ x ~ x ~ ~")
   *   .slow(2)
   */
  Pattern.prototype.struct = function (...args) {
    return this.keepif.out(...args);
  };
  Pattern.prototype.structAll = function (...args) {
    return this.keep.out(...args);
  };
  /**
   * Retourne le silence lorsque mask est 0 ou "~"
   *
   * @example
   * note("c [eb,g] d [eb,g]").mask("<1 [0 1]>")
   */
  Pattern.prototype.mask = function (...args) {
    return this.keepif.in(...args);
  };
  Pattern.prototype.maskAll = function (...args) {
    return this.keep.in(...args);
  };
  /**
   * Réinitialise le pattern au début du cycle pour chaque déclenchement du pattern de reset.
   *
   * @example
   * s("[<bd lt> sd]*2, hh*8").reset("<x@3 x(5,8)>")
   */
  Pattern.prototype.reset = function (...args) {
    return this.keepif.reset(...args);
  };
  Pattern.prototype.resetAll = function (...args) {
    return this.keep.reset(...args);
  };
  /**
   * Redémarre le pattern pour chaque déclenchement du pattern de restart.
   * Alors que reset ne réinitialise que le cycle actuel, restart démarre depuis le cycle 0.
   *
   * @example
   * s("[<bd lt> sd]*2, hh*8").restart("<x@3 x(5,8)>")
   */
  Pattern.prototype.restart = function (...args) {
    return this.keepif.restart(...args);
  };
  Pattern.prototype.restartAll = function (...args) {
    return this.keep.restart(...args);
  };
})();

// aliases
export const polyrhythm = stack;
export const pr = stack;

export const pm = polymeter;

// methods that create patterns, which are added to patternified Pattern methods
// TODO: remove? this is only used in old transpiler (shapeshifter)
// Pattern.prototype.factories = {
//   pure,
//   stack,
//   slowcat,
//   fastcat,
//   cat,
//   timecat,
//   sequence,
//   seq,
//   polymeter,
//   pm,
//   polyrhythm,
//   pr,
// };
// the magic happens in Pattern constructor. Keeping this in prototype enables adding methods from the outside (e.g. see tonal.ts)

// Elemental patterns

/**
 * Ne fait absolument rien, mais avec un nombre de 'steps' métrique donné
 * @name gap
 * @param  {number} steps
 * @example
 * gap(3) // "~@3"
 */
export const gap = (steps) => new Pattern(() => [], steps);

/**
 * Ne fait absolument rien..
 * @name silence
 * @example
 * silence // "~"
 */
export const silence = gap(1);

/* Like silence, but with a 'steps' (relative duration) of 0 */
export const nothing = gap(0);

/**
 * Une valeur discrète qui se répète une fois par cycle.
 *
 * @returns {Pattern}
 * @example
 * pure('e4') // "e4"
 * @noAutocomplete
 */
export function pure(value) {
  function query(state) {
    return state.span.spanCycles.map((subspan) => new Hap(Fraction(subspan.begin).wholeCycle(), subspan, value));
  }
  const result = new Pattern(query, 1);
  result.__pure = value;
  return result;
}

export function isPattern(thing) {
  // thing?.constructor?.name !== 'Pattern' // <- this will fail when code is mangled
  const is = thing instanceof Pattern || thing?._Pattern;
  // TODO: find out how to check wrong core dependency. below will never work !thing === 'undefined'
  // wrapping it in (..) will result other checks to log that warning (e.g. isPattern('kalimba'))
  /* if (!thing instanceof Pattern) {
    console.warn(
      `Found Pattern that fails "instanceof Pattern" check.
      This may happen if you are using multiple versions of @strudel/core.
      Please check by running "npm ls @strudel/core".`,
    );
    console.log(thing);
  } */
  return is;
}

export function reify(thing) {
  // Turns something into a pattern, unless it's already a pattern
  if (isPattern(thing)) {
    return thing;
  }
  if (stringParser && typeof thing === 'string') {
    return stringParser(thing);
  }
  return pure(thing);
}

/** Prend une liste de patterns, et retourne un pattern de listes.
 */
export function sequenceP(pats) {
  let result = pure([]);
  for (const pat of pats) {
    result = result.bind((list) => pat.fmap((v) => list.concat([v])));
  }
  return result;
}

/**
 * Les éléments donnés sont joués en même temps à la même longueur.
 *
 * @return {Pattern}
 * @synonyms polyrhythm, pr
 * @example
 * stack("g3", "b3", ["e4", "d4"]).note()
 * // "g3,b3,[e4 d4]".note()
 *
 * @example
 * // As a chained function:
 * s("hh*4").stack(
 *   note("c4(5,8)")
 * )
 */
export function stack(...pats) {
  // Array test here is to avoid infinite recursions..
  pats = pats.map((pat) => (Array.isArray(pat) ? sequence(...pat) : reify(pat)));
  const query = (state) => flatten(pats.map((pat) => pat.query(state)));
  const result = new Pattern(query);
  if (__steps) {
    result._steps = lcm(...pats.map((pat) => pat._steps));
  }
  return result;
}

function _stackWith(func, pats) {
  pats = pats.map((pat) => (Array.isArray(pat) ? sequence(...pat) : reify(pat)));
  if (pats.length === 0) {
    return silence;
  }
  if (pats.length === 1) {
    return pats[0];
  }
  const [left, ...right] = pats.map((pat) => pat._steps);
  const steps = __steps ? left.maximum(...right) : undefined;
  return stack(...func(steps, pats));
}

export function stackLeft(...pats) {
  return _stackWith(
    (steps, pats) => pats.map((pat) => (pat._steps.eq(steps) ? pat : stepcat(pat, gap(steps.sub(pat._steps))))),
    pats,
  );
}

export function stackRight(...pats) {
  return _stackWith(
    (steps, pats) => pats.map((pat) => (pat._steps.eq(steps) ? pat : stepcat(gap(steps.sub(pat._steps)), pat))),
    pats,
  );
}

export function stackCentre(...pats) {
  return _stackWith(
    (steps, pats) =>
      pats.map((pat) => {
        if (pat._steps.eq(steps)) {
          return pat;
        }
        const g = gap(steps.sub(pat._steps).div(2));
        return stepcat(g, pat, g);
      }),
    pats,
  );
}

export function stackBy(by, ...pats) {
  const [left, ...right] = pats.map((pat) => pat._steps);
  const steps = left.maximum(...right);
  const lookup = {
    centre: stackCentre,
    left: stackLeft,
    right: stackRight,
    expand: stack,
    repeat: (...args) => polymeter(...args).steps(steps),
  };
  return by
    .inhabit(lookup)
    .fmap((func) => func(...pats))
    .innerJoin()
    .setSteps(steps);
}

/**
 * Concaténation : combine une liste de patterns, basculant entre eux successivement, un par cycle.
 *
 * @return {Pattern}
 * @synonyms cat
 * @example
 * slowcat("e5", "b4", ["d5", "c5"])
 *
 */
export function slowcat(...pats) {
  // Array test here is to avoid infinite recursions..
  pats = pats.map((pat) => (Array.isArray(pat) ? fastcat(...pat) : reify(pat)));

  if (pats.length == 1) {
    return pats[0];
  }

  const query = function (state) {
    const span = state.span;
    const pat_n = _mod(span.begin.sam(), pats.length);
    const pat = pats[pat_n];
    if (!pat) {
      // pat_n can be negative, if the span is in the past..
      return [];
    }
    // A bit of maths to make sure that cycles from constituent patterns aren't skipped.
    // For example if three patterns are slowcat-ed, the fourth cycle of the result should
    // be the second (rather than fourth) cycle from the first pattern.
    const offset = span.begin.floor().sub(span.begin.div(pats.length).floor());
    return pat.withHapTime((t) => t.add(offset)).query(state.setSpan(span.withTime((t) => t.sub(offset))));
  };
  const steps = __steps ? lcm(...pats.map((x) => x._steps)) : undefined;
  return new Pattern(query).splitQueries().setSteps(steps);
}

/** Concaténation : combine une liste de patterns, basculant entre eux successivement, un par cycle. Contrairement à slowcat, cette version sautera des cycles.
 * @param {...any} items - Les éléments à concaténer
 * @return {Pattern}
 */
export function slowcatPrime(...pats) {
  pats = pats.map(reify);
  const query = function (state) {
    const pat_n = Math.floor(state.span.begin) % pats.length;
    const pat = pats[pat_n]; // can be undefined for same cases e.g. /#cHVyZSg0MikKICAuZXZlcnkoMyxhZGQoNykpCiAgLmxhdGUoLjUp
    return pat?.query(state) || [];
  };
  return new Pattern(query).splitQueries();
}

/** Les éléments donnés sont con**caténés**, où chacun prend un cycle.
 *
 * @param {...any} items - Les éléments à concaténer
 * @synonyms slowcat
 * @return {Pattern}
 * @example
 * cat("e5", "b4", ["d5", "c5"]).note()
 * // "<e5 b4 [d5 c5]>".note()
 *
 * @example
 * // As a chained function:
 * s("hh*4").cat(
 *    note("c4(5,8)")
 * )
 */
export function cat(...pats) {
  return slowcat(...pats);
}

/**
 * Permet d'arranger plusieurs patterns ensemble sur plusieurs cycles.
 * Prend un nombre variable de tableaux avec deux éléments spécifiant le nombre de cycles et le pattern à utiliser.
 *
 * @return {Pattern}
 * @example
 * arrange(
 *   [4, "<c a f e>(3,8)"],
 *   [2, "<g a>(5,8)"]
 * ).note()
 */
export function arrange(...sections) {
  const total = sections.reduce((sum, [cycles]) => sum + cycles, 0);
  sections = sections.map(([cycles, section]) => [cycles, section.fast(cycles)]);
  return stepcat(...sections).slow(total);
}

/**
 * Similaire à `arrange`, vous permet d'arranger plusieurs patterns ensemble sur plusieurs cycles.
 * Contrairement à `arrange`, vous spécifiez un temps de début et de fin pour chaque pattern plutôt qu'une durée, ce qui
 * signifie que les patterns peuvent se chevaucher.
 * @return {Pattern}
 * @example
seqPLoop([0, 2, "bd(3,8)"],
         [1, 3, "cp(3,8)"]
        )
  .sound()
 */
export function seqPLoop(...parts) {
  let total = Fraction(0);
  const pats = [];
  for (let part of parts) {
    if (part.length == 2) {
      part.unshift(total);
    }
    total = part[1];
  }

  return stack(
    ...parts.map(([start, stop, pat]) =>
      pure(reify(pat)).compress(Fraction(start).div(total), Fraction(stop).div(total)),
    ),
  )
    .slow(total)
    .innerJoin(); // or resetJoin or restartJoin ??
}

export function fastcat(...pats) {
  let result = slowcat(...pats);
  if (pats.length > 1) {
    result = result._fast(pats.length);
    result._steps = pats.length;
  }
  if (pats.length == 1 && pats[0].__steps_source) {
    pats._steps = pats[0]._steps;
  }
  return result;
}

/** Voir `fastcat` */
export function sequence(...pats) {
  return fastcat(...pats);
}

/** Comme **cat**, mais les éléments sont compressés dans un cycle.
 * @synonyms sequence, fastcat
 * @example
 * seq("e5", "b4", ["d5", "c5"]).note()
 * // "e5 b4 [d5 c5]".note()
 *
 * @example
 * // As a chained function:
 * s("hh*4").seq(
 *   note("c4(5,8)")
 * )
 */

export function seq(...pats) {
  return fastcat(...pats);
}

function _sequenceCount(x) {
  if (Array.isArray(x)) {
    if (x.length == 0) {
      return [silence, 0];
    }
    if (x.length == 1) {
      return _sequenceCount(x[0]);
    }
    return [fastcat(...x.map((a) => _sequenceCount(a)[0])), x.length];
  }
  return [reify(x), 1];
}

export const mask = curry((a, b) => reify(b).mask(a));
export const struct = curry((a, b) => reify(b).struct(a));
export const superimpose = curry((a, b) => reify(b).superimpose(...a));
export const withValue = curry((a, b) => reify(b).withValue(a));

export const bind = curry((a, b) => reify(b).bind(a));
export const innerBind = curry((a, b) => reify(b).innerBind(a));
export const outerBind = curry((a, b) => reify(b).outerBind(a));
export const squeezeBind = curry((a, b) => reify(b).squeezeBind(a));
export const stepBind = curry((a, b) => reify(b).stepBind(a));
export const polyBind = curry((a, b) => reify(b).polyBind(a));

// operators
export const set = curry((a, b) => reify(b).set(a));
export const keep = curry((a, b) => reify(b).keep(a));
export const keepif = curry((a, b) => reify(b).keepif(a));
export const add = curry((a, b) => reify(b).add(a));
export const sub = curry((a, b) => reify(b).sub(a));
export const mul = curry((a, b) => reify(b).mul(a));
export const div = curry((a, b) => reify(b).div(a));
export const mod = curry((a, b) => reify(b).mod(a));
export const pow = curry((a, b) => reify(b).pow(a));
export const band = curry((a, b) => reify(b).band(a));
export const bor = curry((a, b) => reify(b).bor(a));
export const bxor = curry((a, b) => reify(b).bxor(a));
export const blshift = curry((a, b) => reify(b).blshift(a));
export const brshift = curry((a, b) => reify(b).brshift(a));
export const lt = curry((a, b) => reify(b).lt(a));
export const gt = curry((a, b) => reify(b).gt(a));
export const lte = curry((a, b) => reify(b).lte(a));
export const gte = curry((a, b) => reify(b).gte(a));
export const eq = curry((a, b) => reify(b).eq(a));
export const eqt = curry((a, b) => reify(b).eqt(a));
export const ne = curry((a, b) => reify(b).ne(a));
export const net = curry((a, b) => reify(b).net(a));
export const and = curry((a, b) => reify(b).and(a));
export const or = curry((a, b) => reify(b).or(a));
export const func = curry((a, b) => reify(b).func(a));

/**
 * Enregistre une nouvelle méthode de pattern. La méthode est ajoutée à la classe Pattern + la fonction autonome est retournée par register.
 *
 * @param {string | string[]} name nom de la fonction, ou un tableau de noms à utiliser comme synonymes
 * @param {function} func fonction avec 1 ou plusieurs paramètres, où le dernier est le pattern actuel
 * @noAutocomplete
 *
 */
export function register(name, func, patternify = true, preserveSteps = false, join = (x) => x.innerJoin()) {
  if (Array.isArray(name)) {
    const result = {};
    for (const name_item of name) {
      result[name_item] = register(name_item, func, patternify, preserveSteps, join);
    }
    return result;
  }
  const arity = func.length;
  var pfunc; // the patternified function

  if (patternify) {
    pfunc = function (...args) {
      args = args.map(reify);
      const pat = args[args.length - 1];
      let result;

      if (arity === 1) {
        result = func(pat);
      } else {
        const firstArgs = args.slice(0, -1);

        if (firstArgs.every((arg) => arg.__pure != undefined)) {
          const pureArgs = firstArgs.map((arg) => arg.__pure);
          const pureLocs = firstArgs.filter((arg) => arg.__pure_loc).map((arg) => arg.__pure_loc);
          result = func(...pureArgs, pat);
          result = result.withContext((context) => {
            const locations = (context.locations || []).concat(pureLocs);
            return { ...context, locations };
          });
        } else {
          const [left, ...right] = firstArgs;

          let mapFn = (...args) => {
            return func(...args, pat);
          };
          mapFn = curry(mapFn, null, arity - 1);
          result = join(right.reduce((acc, p) => acc.appLeft(p), left.fmap(mapFn)));
        }
      }
      if (preserveSteps) {
        result._steps = pat._steps;
      }
      return result;
    };
  } else {
    pfunc = function (...args) {
      args = args.map(reify);
      const result = func(...args);
      if (preserveSteps) {
        result._steps = args[args.length - 1]._steps;
      }
      return result;
    };
  }

  Pattern.prototype[name] = function (...args) {
    // For methods that take a single argument (plus 'this'), allow
    // multiple arguments but sequence them
    if (arity === 2 && args.length !== 1) {
      args = [sequence(...args)];
    } else if (arity !== args.length + 1) {
      throw new Error(`.${name}() expects ${arity - 1} inputs but got ${args.length}.`);
    }
    args = args.map(reify);
    return pfunc(...args, this);
  };

  if (arity > 1) {
    // There are patternified args, so lets make an unpatternified
    // version, prefixed by '_'
    Pattern.prototype['_' + name] = function (...args) {
      const result = func(...args, this);
      if (preserveSteps) {
        result.setSteps(this._steps);
      }
      return result;
    };
  }

  // toplevel functions get curried as well as patternified
  // because pfunc uses spread args, we need to state the arity explicitly!
  return curry(pfunc, null, arity);
}

// Like register, but defaults to stepJoin
function stepRegister(name, func, patternify = true, preserveSteps = false, join = (x) => x.stepJoin()) {
  return register(name, func, patternify, preserveSteps, join);
}

//////////////////////////////////////////////////////////////////////
// Numerical transformations

/**
 * Suppose un pattern numérique. Retourne un nouveau pattern avec toutes les valeurs arrondies
 * à l'entier le plus proche.
 * @name round
 * @memberof Pattern
 * @returns Pattern
 * @example
 * n("0.5 1.5 2.5".round()).scale("C:major")
 */
export const round = register('round', function (pat) {
  return pat.asNumber().fmap((v) => Math.round(v));
});

/**
 * Suppose un pattern numérique. Retourne un nouveau pattern avec toutes les valeurs définies à
 * leur plancher mathématique. Par ex. `3.7` remplacé par `3`, et `-4.2`
 * remplacé par `-5`.
 * @name floor
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note("42 42.1 42.5 43".floor())
 */
export const floor = register('floor', function (pat) {
  return pat.asNumber().fmap((v) => Math.floor(v));
});

/**
 * Suppose un pattern numérique. Retourne un nouveau pattern avec toutes les valeurs définies à
 * leur plafond mathématique. Par ex. `3.2` remplacé par `4`, et `-4.2`
 * remplacé par `-4`.
 * @name ceil
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note("42 42.1 42.5 43".ceil())
 */
export const ceil = register('ceil', function (pat) {
  return pat.asNumber().fmap((v) => Math.ceil(v));
});
/**
 * Suppose un pattern numérique, contenant des valeurs unipolaires dans la plage 0 ..
 * 1. Retourne un nouveau pattern avec des valeurs mises à l'échelle dans la plage bipolaire -1 .. 1
 * @returns Pattern
 * @noAutocomplete
 */
export const toBipolar = register('toBipolar', function (pat) {
  return pat.fmap((x) => x * 2 - 1);
});

/**
 * Suppose un pattern numérique, contenant des valeurs bipolaires dans la plage -1 .. 1
 * Retourne un nouveau pattern avec des valeurs mises à l'échelle dans la plage unipolaire 0 .. 1
 * @returns Pattern
 * @noAutocomplete
 */
export const fromBipolar = register('fromBipolar', function (pat) {
  return pat.fmap((x) => (x + 1) / 2);
});

/**
 * Suppose un pattern numérique, contenant des valeurs unipolaires dans la plage 0 .. 1.
 * Retourne un nouveau pattern avec des valeurs mises à l'échelle dans la plage min/max donnée.
 * Plus utile en combinaison avec des patterns continus.
 * @name range
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("[bd sd]*2,hh*8")
 * .cutoff(sine.range(500,4000))
 */
export const range = register('range', function (min, max, pat) {
  return pat.mul(max - min).add(min);
});

/**
 * Suppose un pattern numérique, contenant des valeurs unipolaires dans la plage 0 .. 1
 * Retourne un nouveau pattern avec des valeurs mises à l'échelle dans la plage min/max donnée,
 * suivant une courbe exponentielle.
 * @name rangex
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("[bd sd]*2,hh*8")
 * .cutoff(sine.rangex(500,4000))
 */
export const rangex = register('rangex', function (min, max, pat) {
  return pat._range(Math.log(min), Math.log(max)).fmap(Math.exp);
});

/**
 * Suppose un pattern numérique, contenant des valeurs bipolaires dans la plage -1 .. 1
 * Retourne un nouveau pattern avec des valeurs mises à l'échelle dans la plage min/max donnée.
 * @name range2
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("[bd sd]*2,hh*8")
 * .cutoff(sine2.range2(500,4000))
 */
export const range2 = register('range2', function (min, max, pat) {
  return pat.fromBipolar()._range(min, max);
});

/**
 * Permet de diviser des nombres via la notation de liste en utilisant ":".
 * Retourne un nouveau pattern avec uniquement des nombres.
 * @name ratio
 * @memberof Pattern
 * @returns Pattern
 * @example
 * ratio("1, 5:4, 3:2").mul(110)
 * .freq().s("piano")
 */
export const ratio = register('ratio', (pat) =>
  pat.fmap((v) => {
    if (!Array.isArray(v)) {
      return v;
    }
    return v.slice(1).reduce((acc, n) => acc / n, v[0]);
  }),
);

//////////////////////////////////////////////////////////////////////
// Structural and temporal transformations

/** Compresse chaque cycle dans le timespan donné, laissant un vide
 * @example
 * cat(
 *   s("bd sd").compress(.25,.75),
 *   s("~ bd sd ~")
 * )
 */
export const compress = register('compress', function (b, e, pat) {
  b = Fraction(b);
  e = Fraction(e);
  if (b.gt(e) || b.gt(1) || e.gt(1) || b.lt(0) || e.lt(0)) {
    return silence;
  }
  return pat._fastGap(Fraction(1).div(e.sub(b)))._late(b);
});

export const { compressSpan, compressspan } = register(['compressSpan', 'compressspan'], function (span, pat) {
  return pat._compress(span.begin, span.end);
});

/**
 * accélère un pattern comme fast, mais plutôt que de le jouer plusieurs fois comme fast le ferait, il laisse un vide dans l'espace restant du cycle. Par exemple, ce qui suit jouera le pattern sonore "bd sn" une seule fois mais compressé dans la première moitié du cycle, c'est-à-dire deux fois plus vite.
 * @name fastGap
 * @synonyms fastgap
 * @example
 * s("bd sd").fastGap(2)
 */
export const { fastGap, fastgap } = register(['fastGap', 'fastgap'], function (factor, pat) {
  // A bit fiddly, to drop zero-width queries at the start of the next cycle
  const qf = function (span) {
    const cycle = span.begin.sam();
    const bpos = span.begin.sub(cycle).mul(factor).min(1);
    const epos = span.end.sub(cycle).mul(factor).min(1);
    if (bpos >= 1) {
      return undefined;
    }
    return new TimeSpan(cycle.add(bpos), cycle.add(epos));
  };
  // Also fiddly, to maintain the right 'whole' relative to the part
  const ef = function (hap) {
    const begin = hap.part.begin;
    const end = hap.part.end;
    const cycle = begin.sam();
    const beginPos = begin.sub(cycle).div(factor).min(1);
    const endPos = end.sub(cycle).div(factor).min(1);
    const newPart = new TimeSpan(cycle.add(beginPos), cycle.add(endPos));
    const newWhole = !hap.whole
      ? undefined
      : new TimeSpan(
          newPart.begin.sub(begin.sub(hap.whole.begin).div(factor)),
          newPart.end.add(hap.whole.end.sub(end).div(factor)),
        );
    return new Hap(newWhole, newPart, hap.value, hap.context);
  };
  return pat.withQuerySpanMaybe(qf).withHap(ef).splitQueries();
});

/**
 * Similaire à `compress`, mais ne laisse pas de vides, et le 'focus' peut être plus grand qu'un cycle
 * @example
 * s("bd hh sd hh").focus(1/4, 3/4)
 */
export const focus = register('focus', function (b, e, pat) {
  b = Fraction(b);
  e = Fraction(e);
  return pat
    ._early(b.sam())
    ._fast(Fraction(1).div(e.sub(b)))
    ._late(b);
});

export const { focusSpan, focusspan } = register(['focusSpan', 'focusspan'], function (span, pat) {
  return pat._focus(span.begin, span.end);
});

/** La fonction ply répète chaque événement le nombre de fois donné.
 * @example
 * s("bd ~ sd cp").ply("<1 2 3>")
 */
export const ply = register('ply', function (factor, pat) {
  const result = pat.fmap((x) => pure(x)._fast(factor)).squeezeJoin();
  if (__steps) {
    result._steps = Fraction(factor).mulmaybe(pat._steps);
  }
  return result;
});

/**
 * Accélère un pattern par le facteur donné. Utilisé par "*" dans la notation mini.
 *
 * @name fast
 * @synonyms density
 * @memberof Pattern
 * @param {number | Pattern} factor facteur d'accélération
 * @returns Pattern
 * @example
 * s("bd hh sd hh").fast(2) // s("[bd hh sd hh]*2")
 */
export const { fast, density } = register(
  ['fast', 'density'],
  function (factor, pat) {
    if (factor === 0) {
      return silence;
    }
    factor = Fraction(factor);
    const fastQuery = pat.withQueryTime((t) => t.mul(factor));
    return fastQuery.withHapTime((t) => t.div(factor)).setSteps(pat._steps);
  },
  true,
  true,
);

/**
 * Accélère à la fois le pattern (comme 'fast') et la lecture de l'échantillon (comme 'speed').
 * @example
 * s("bd sd:2").hurry("<1 2 4 3>").slow(1.5)
 */
export const hurry = register('hurry', function (r, pat) {
  return pat._fast(r).mul(pure({ speed: r }));
});

/**
 * Ralentit un pattern sur le nombre de cycles donné. Comme l'opérateur "/" dans la notation mini.
 *
 * @name slow
 * @synonyms sparsity
 * @memberof Pattern
 * @param {number | Pattern} factor facteur de ralentissement
 * @returns Pattern
 * @example
 * s("bd hh sd hh").slow(2) // s("[bd hh sd hh]/2")
 */
export const { slow, sparsity } = register(['slow', 'sparsity'], function (factor, pat) {
  if (factor === 0) {
    return silence;
  }
  return pat._fast(Fraction(1).div(factor));
});

/**
 * Effectue une opération 'à l'intérieur' d'un cycle.
 * @example
 * "0 1 2 3 4 3 2 1".inside(4, rev).scale('C major').note()
 * // "0 1 2 3 4 3 2 1".slow(4).rev().fast(4).scale('C major').note()
 */
export const inside = register('inside', function (factor, f, pat) {
  return f(pat._slow(factor))._fast(factor);
});

/**
 * Effectue une opération 'à l'extérieur' d'un cycle.
 * @example
 * "<[0 1] 2 [3 4] 5>".outside(4, rev).scale('C major').note()
 * // "<[0 1] 2 [3 4] 5>".fast(4).rev().slow(4).scale('C major').note()
 */
export const outside = register('outside', function (factor, f, pat) {
  return f(pat._fast(factor))._slow(factor);
});

/**
 * Applique la fonction donnée tous les n cycles, en commençant par le dernier cycle.
 * @name lastOf
 * @memberof Pattern
 * @param {number} n combien de cycles
 * @param {function} func fonction à appliquer
 * @returns Pattern
 * @example
 * note("c3 d3 e3 g3").lastOf(4, x=>x.rev())
 */
export const lastOf = register('lastOf', function (n, func, pat) {
  const pats = Array(n - 1).fill(pat);
  pats.push(func(pat));
  return slowcatPrime(...pats);
});

/**
 * Applique la fonction donnée tous les n cycles, en commençant par le premier cycle.
 * @name firstOf
 * @memberof Pattern
 * @param {number} n combien de cycles
 * @param {function} func fonction à appliquer
 * @returns Pattern
 * @example
 * note("c3 d3 e3 g3").firstOf(4, x=>x.rev())
 */

/**
 * Un alias pour `firstOf`
 * @name every
 * @memberof Pattern
 * @param {number} n combien de cycles
 * @param {function} func fonction à appliquer
 * @returns Pattern
 * @example
 * note("c3 d3 e3 g3").every(4, x=>x.rev())
 */
export const { firstOf, every } = register(['firstOf', 'every'], function (n, func, pat) {
  const pats = Array(n - 1).fill(pat);
  pats.unshift(func(pat));
  return slowcatPrime(...pats);
});

/**
 * Comme layer, mais avec une seule fonction :
 * @name apply
 * @memberof Pattern
 * @example
 * "<c3 eb3 g3>".scale('C minor').apply(scaleTranspose("0,2,4")).note()
 */
// TODO: remove or dedupe with layer?
export const apply = register('apply', function (func, pat) {
  return func(pat);
});

/**
 * Joue le pattern aux cycles par minute donnés.
 * @deprecated
 * @example
 * s("<bd sd>,hh*2").cpm(90) // = 90 bpm
 */
// this is redefined in repl.mjs, using the current cps as divisor
export const cpm = register('cpm', function (cpm, pat) {
  return pat._fast(cpm / 60 / 1);
});

/**
 * Décale un pattern pour qu'il démarre plus tôt. Équivalent de l'opérateur <~ de Tidal
 *
 * @name early
 * @memberof Pattern
 * @param {number | Pattern} cycles nombre de cycles à décaler vers la gauche
 * @returns Pattern
 * @example
 * "bd ~".stack("hh ~".early(.1)).s()
 */
export const early = register(
  'early',
  function (offset, pat) {
    offset = Fraction(offset);
    return pat.withQueryTime((t) => t.add(offset)).withHapTime((t) => t.sub(offset));
  },
  true,
  true,
);

/**
 * Décale un pattern pour qu'il démarre plus tard. Équivalent de l'opérateur ~> de Tidal
 *
 * @name late
 * @memberof Pattern
 * @param {number | Pattern} cycles nombre de cycles à décaler vers la droite
 * @returns Pattern
 * @example
 * "bd ~".stack("hh ~".late(.1)).s()
 */
export const late = register(
  'late',
  function (offset, pat) {
    offset = Fraction(offset);
    return pat._early(Fraction(0).sub(offset));
  },
  true,
  true,
);

/**
 * Joue une portion d'un pattern, spécifiée par le début et la fin d'un timespan. Le nouveau pattern résultant est joué sur la période de temps du pattern original :
 *
 * @example
 * s("bd*2 hh*3 [sd bd]*2 perc").zoom(0.25, 0.75)
 * // s("hh*3 [sd bd]*2") // equivalent
 */
export const zoom = register('zoom', function (s, e, pat) {
  e = Fraction(e);
  s = Fraction(s);
  if (s.gte(e)) {
    return nothing;
  }
  const d = e.sub(s);
  const steps = __steps ? pat._steps?.mulmaybe(d) : undefined;
  return pat
    .withQuerySpan((span) => span.withCycle((t) => t.mul(d).add(s)))
    .withHapSpan((span) => span.withCycle((t) => t.sub(s).div(d)))
    .splitQueries()
    .setSteps(steps);
});

export const { zoomArc, zoomarc } = register(['zoomArc', 'zoomarc'], function (a, pat) {
  return pat.zoom(a.begin, a.end);
});

/**
 * Divise un pattern en un nombre donné de tranches, et les joue selon un pattern de numéros de tranche.
 * Similaire à `slice`, mais découpe les patterns plutôt que les échantillons sonores.
 * @param {number} number of slices
 * @param {number} slices to play
 * @example
 * note("0 1 2 3 4 5 6 7".scale('c:mixolydian'))
 *.bite(4, "3 2 1 0")
 * @example
 * sound("bd - bd bd*2, - sd:6 - sd:5 sd:1 - [- sd:2] -, hh [- cp:7]")
  .bank("RolandTR909").speed(1.2)
  .bite(4, "0 0 [1 2] <3 2> 0 0 [2 1] 3")
 */
export const bite = register(
  'bite',
  (npat, ipat, pat) => {
    return ipat
      .fmap((i) => (n) => {
        const a = Fraction(i).div(n).mod(1);
        const b = a.add(Fraction(1).div(n));
        return pat.zoom(a, b);
      })
      .appLeft(npat)
      .squeezeJoin();
  },
  false,
);

/**
 * Sélectionne la fraction donnée du pattern et répète cette partie pour remplir le reste du cycle.
 * @param {number} fraction fraction à sélectionner
 * @example
 * s("lt ht mt cp, [hh oh]*2").linger("<1 .5 .25 .125>")
 */
export const linger = register(
  'linger',
  function (t, pat) {
    if (t == 0) {
      return silence;
    } else if (t < 0) {
      return pat._zoom(t.add(1), 1)._slow(t);
    }
    return pat._zoom(0, t)._slow(t);
  },
  true,
  true,
);

/**
 * Échantillonne le pattern à un taux de n événements par cycle. Utile pour transformer un pattern continu en un pattern discret.
 * @name segment
 * @synonyms seg
 * @param {number} segments nombre de segments par cycle
 * @example
 * note(saw.range(40,52).segment(24))
 */
export const { segment, seg } = register(['segment', 'seg'], function (rate, pat) {
  return pat.struct(pure(true)._fast(rate)).setSteps(rate);
});

/**
 * La fonction `swingBy x n` divise chaque cycle en `n` tranches, puis retarde les événements de la seconde moitié de chaque tranche par la quantité `x`, qui est relative à la taille de la (demi-)tranche. Donc si `x` est 0 elle ne fait rien, `0.5` retarde d'une demi-durée de note, et 1 boucle pour ne rien faire à nouveau. Le résultat final est un rythme shuffle ou swing
 * @param {number} subdivision
 * @param {number} offset
 * @example
 * s("hh*8").swingBy(1/3, 4)
 */
export const swingBy = register('swingBy', (swing, n, pat) => pat.inside(n, late(seq(0, swing / 2))));

/**
 * Raccourci pour swingBy avec 1/3 :
 * @param {number} subdivision
 * @example
 * s("hh*8").swing(4)
 * // s("hh*8").swingBy(1/3, 4)
 */
export const swing = register('swing', (n, pat) => pat.swingBy(1 / 3, n));

/**
 * Inverse les 1 et les 0 dans un pattern binaire.
 * @name invert
 * @synonyms inv
 * @example
 * s("bd").struct("1 0 0 1 0 0 1 0".lastOf(4, invert))
 */
export const { invert, inv } = register(
  ['invert', 'inv'],
  function (pat) {
    // Swap true/false in a binary pattern
    return pat.fmap((x) => !x);
  },
  true,
  true,
);

/**
 * Applique la fonction donnée chaque fois que le pattern donné est dans un état vrai.
 * @name when
 * @memberof Pattern
 * @param {Pattern} binary_pat
 * @param {function} func
 * @returns Pattern
 * @example
 * "c3 eb3 g3".when("<0 1>/2", x=>x.sub("5")).note()
 */
export const when = register('when', function (on, func, pat) {
  return on ? func(pat) : pat;
});

/**
 * Superpose le résultat de la fonction par-dessus le pattern original, retardé du temps donné.
 * @name off
 * @memberof Pattern
 * @param {Pattern | number} time temps de décalage
 * @param {function} func fonction à appliquer
 * @returns Pattern
 * @example
 * "c3 eb3 g3".off(1/8, x=>x.add(7)).note()
 */
export const off = register('off', function (time_pat, func, pat) {
  return stack(pat, func(pat.late(time_pat)));
});

/**
 * Retourne un nouveau pattern où un cycle sur deux est joué une fois, deux fois plus
 * vite, et décalé dans le temps d'un quart de cycle. Crée une sorte de
 * sensation de breakbeat.
 * @returns Pattern
 */
export const brak = register('brak', function (pat) {
  return pat.when(slowcat(false, true), (x) => fastcat(x, silence)._late(0.25));
});

/**
 * Inverse tous les haps dans un pattern
 *
 * @name rev
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note("c d e g").rev()
 */
export const rev = register(
  'rev',
  function (pat) {
    const query = function (state) {
      const span = state.span;
      const cycle = span.begin.sam();
      const next_cycle = span.begin.nextSam();
      const reflect = function (to_reflect) {
        const reflected = to_reflect.withTime((time) => cycle.add(next_cycle.sub(time)));
        // [reflected.begin, reflected.end] = [reflected.end, reflected.begin] -- didn't work
        const tmp = reflected.begin;
        reflected.begin = reflected.end;
        reflected.end = tmp;
        return reflected;
      };
      const haps = pat.query(state.setSpan(reflect(span)));
      return haps.map((hap) => hap.withSpan(reflect));
    };
    return new Pattern(query).splitQueries();
  },
  false,
  true,
);

/** Comme press, mais vous permet de spécifier la quantité par laquelle chaque
 * événement est décalé. pressBy(0.5) est identique à press, tandis que
 * pressBy(1/3) décale chaque événement d'un tiers de son timespan.
 * @example
 * stack(s("hh*4"),
 *       s("bd mt sd ht").pressBy("<0 0.5 0.25>")
 *      ).slow(2)
 */
export const pressBy = register('pressBy', function (r, pat) {
  return pat.fmap((x) => pure(x).compress(r, 1)).squeezeJoin();
});

/**
 * Syncope un rythme, en décalant chaque événement à mi-chemin dans son timespan.
 * @example
 * stack(s("hh*4"),
 *       s("bd mt sd ht").every(4, press)
 *      ).slow(2)
 */
export const press = register('press', function (pat) {
  return pat._pressBy(0.5);
});

/**
 * Réduit au silence un pattern.
 * @example
 * stack(
 *   s("bd").hush(),
 *   s("hh*3")
 * )
 */
Pattern.prototype.hush = function () {
  return silence;
};

/**
 * Applique `rev` à un pattern un cycle sur deux, de sorte que le pattern alterne entre avant et arrière.
 * @example
 * note("c d e g").palindrome()
 */
export const palindrome = register(
  'palindrome',
  function (pat) {
    return pat.lastOf(2, rev);
  },
  true,
  true,
);

/**
 * Jux avec largeur stéréo ajustable. 0 = mono, 1 = stéréo complet.
 * @name juxBy
 * @synonyms juxby
 * @example
 * s("bd lt [~ ht] mt cp ~ bd hh").juxBy("<0 .5 1>/2", rev)
 */
export const { juxBy, juxby } = register(['juxBy', 'juxby'], function (by, func, pat) {
  by /= 2;
  const elem_or = function (dict, key, dflt) {
    if (key in dict) {
      return dict[key];
    }
    return dflt;
  };
  const left = pat.withValue((val) => Object.assign({}, val, { pan: elem_or(val, 'pan', 0.5) - by }));
  const right = func(pat.withValue((val) => Object.assign({}, val, { pan: elem_or(val, 'pan', 0.5) + by })));

  return stack(left, right).setSteps(__steps ? lcm(left._steps, right._steps) : undefined);
});

/**
 * La fonction jux crée des effets stéréo étranges, en appliquant une fonction à un pattern, mais uniquement dans le canal droit.
 * @example
 * s("bd lt [~ ht] mt cp ~ bd hh").jux(rev)
 * @example
 * s("bd lt [~ ht] mt cp ~ bd hh").jux(press)
 * @example
 * s("bd lt [~ ht] mt cp ~ bd hh").jux(iter(4))
 */
export const jux = register('jux', function (func, pat) {
  return pat._juxBy(1, func, pat);
});

/**
 * Superpose et décale plusieurs fois, appliquant la fonction donnée à chaque fois.
 * @name echoWith
 * @synonyms echowith, stutWith, stutwith
 * @param {number} times combien de fois répéter
 * @param {number} time décalage de cycle entre les itérations
 * @param {function} func fonction à appliquer, donnant le pattern et l'index d'itération
 * @example
 * "<0 [2 4]>"
 * .echoWith(4, 1/8, (p,n) => p.add(n*2))
 * .scale("C:minor").note()
 */
export const { echoWith, echowith, stutWith, stutwith } = register(
  ['echoWith', 'echowith', 'stutWith', 'stutwith'],
  function (times, time, func, pat) {
    return stack(...listRange(0, times - 1).map((i) => func(pat.late(Fraction(time).mul(i)), i)));
  },
);

/**
 * Superpose et décale plusieurs fois, diminuant progressivement la vélocité
 * @name echo
 * @memberof Pattern
 * @returns Pattern
 * @param {number} times combien de fois répéter
 * @param {number} time décalage de cycle entre les itérations
 * @param {number} feedback multiplicateur de vélocité pour chaque itération
 * @example
 * s("bd sd").echo(3, 1/6, .8)
 */
export const echo = register('echo', function (times, time, feedback, pat) {
  return pat._echoWith(times, time, (pat, i) => pat.gain(Math.pow(feedback, i)));
});

/**
 * Obsolète. Comme echo, mais les 2 derniers paramètres sont inversés.
 * @name stut
 * @param {number} times combien de fois répéter
 * @param {number} feedback multiplicateur de vélocité pour chaque itération
 * @param {number} time décalage de cycle entre les itérations
 * @example
 * s("bd sd").stut(3, .8, 1/6)
 */
export const stut = register('stut', function (times, feedback, time, pat) {
  return pat._echoWith(times, time, (pat, i) => pat.gain(Math.pow(feedback, i)));
});

export const applyN = register('applyN', function (n, func, p) {
  let result = p;
  for (let i = 0; i < n; i++) {
    result = func(result);
  }
  return result;
});

/**
 * La fonction plyWith répète chaque événement le nombre de fois donné, appliquant la fonction donnée à chaque événement.\n
 * @name plyWith
 * @synonyms plywith
 * @param {number} factor combien de fois répéter
 * @param {function} func fonction à appliquer, donnant le pattern
 * @example
 * "<0 [2 4]>"
 * .plyWith(4, (p) => p.add(2))
 * .scale("C:minor").note()
 */
export const plyWith = register(['plyWith', 'plywith'], function (factor, func, pat) {
  const result = pat
    .fmap((x) => cat(...listRange(0, factor - 1).map((i) => applyN(i, func, x)))._fast(factor))
    .squeezeJoin();
  if (__steps) {
    result._steps = Fraction(factor).mulmaybe(pat._steps);
  }
  return result;
});

/**
 * La fonction plyForEach répète chaque événement le nombre de fois donné, appliquant la fonction donnée à chaque événement.
 * Cette version de ply utilise l'index d'itération comme argument de la fonction, similaire à echoWith.
 * @name plyForEach
 * @synonyms plyforeach
 * @param {number} factor combien de fois répéter
 * @param {function} func fonction à appliquer, donnant le pattern et l'index d'itération
 * @example
 * "<0 [2 4]>"
 * .plyForEach(4, (p,n) => p.add(n*2))
 * .scale("C:minor").note()
 */
export const plyForEach = register(['plyForEach', 'plyforeach'], function (factor, func, pat) {
  const result = pat
    .fmap((x) => cat(cat(pure(x), ...listRange(1, factor - 1).map((i) => func(pure(x), i))))._fast(factor))
    .squeezeJoin();
  if (__steps) {
    result._steps = Fraction(factor).mulmaybe(pat._steps);
  }
  return result;
});

/**
 * Divise un pattern en un nombre donné de subdivisions, joue les subdivisions dans l'ordre, mais incrémente la subdivision de départ à chaque cycle. Le pattern reboucle à la première subdivision après que la dernière subdivision soit jouée.
 * @name iter
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note("0 1 2 3".scale('A minor')).iter(4)
 */

const _iter = function (times, pat, back = false) {
  times = Fraction(times);
  return slowcat(
    ...listRange(0, times.sub(1)).map((i) =>
      back ? pat.late(Fraction(i).div(times)) : pat.early(Fraction(i).div(times)),
    ),
  );
};

export const iter = register(
  'iter',
  function (times, pat) {
    return _iter(times, pat, false);
  },
  true,
  true,
);

/**
 * Comme `iter`, mais joue les subdivisions dans l'ordre inverse. Connu sous le nom de iter' dans tidalcycles
 * @name iterBack
 * @synonyms iterback
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note("0 1 2 3".scale('A minor')).iterBack(4)
 */
export const { iterBack, iterback } = register(
  ['iterBack', 'iterback'],
  function (times, pat) {
    return _iter(times, pat, true);
  },
  true,
  true,
);

/**
 * Répète chaque cycle le nombre de fois donné.
 * @name repeatCycles
 * @memberof Pattern
 * @returns Pattern
 * @example
 * note(irand(12).add(34)).segment(4).repeatCycles(2).s("gm_acoustic_guitar_nylon")
 */
export const { repeatCycles } = register(
  'repeatCycles',
  function (n, pat) {
    return new Pattern(function (state) {
      const cycle = state.span.begin.sam();
      const source_cycle = cycle.div(n).sam();
      const delta = cycle.sub(source_cycle);
      state = state.withSpan((span) => span.withTime((spant) => spant.sub(delta)));
      return pat.query(state).map((hap) => hap.withSpan((span) => span.withTime((spant) => spant.add(delta))));
    }).splitQueries();
  },
  true,
  true,
);

/**
 * Divise un pattern en un nombre donné de parties, puis parcourt ces parties tour à tour, appliquant la fonction donnée à chaque partie à tour de rôle (une partie par cycle).
 * @name chunk
 * @synonyms slowChunk, slowchunk
 * @memberof Pattern
 * @returns Pattern
 * @example
 * "0 1 2 3".chunk(4, x=>x.add(7))
 * .scale("A:minor").note()
 */
const _chunk = function (n, func, pat, back = false, fast = false) {
  const binary = Array(n - 1).fill(false);
  binary.unshift(true);
  // Invert the 'back' because we want to shift the pattern forwards,
  // and so time backwards
  const binary_pat = _iter(n, sequence(...binary), !back);
  if (!fast) {
    pat = pat.repeatCycles(n);
  }
  return pat.when(binary_pat, func);
};

export const { chunk, slowchunk, slowChunk } = register(
  ['chunk', 'slowchunk', 'slowChunk'],
  function (n, func, pat) {
    return _chunk(n, func, pat, false, false);
  },
  true,
  true,
);

/**
 * Comme `chunk`, mais parcourt les parties dans l'ordre inverse. Connu sous le nom de chunk' dans tidalcycles
 * @name chunkBack
 * @synonyms chunkback
 * @memberof Pattern
 * @returns Pattern
 * @example
 * "0 1 2 3".chunkBack(4, x=>x.add(7))
 * .scale("A:minor").note()
 */
export const { chunkBack, chunkback } = register(
  ['chunkBack', 'chunkback'],
  function (n, func, pat) {
    return _chunk(n, func, pat, true);
  },
  true,
  true,
);

/**
 * Comme `chunk`, mais les cycles du pattern source ne sont pas répétés
 * pour chaque ensemble de morceaux.
 * @name fastChunk
 * @synonyms fastchunk
 * @memberof Pattern
 * @returns Pattern
 * @example
 * "<0 8> 1 2 3 4 5 6 7"
 * .fastChunk(4, x => x.color('red')).slow(2)
 * .scale("C2:major").note()
 */
export const { fastchunk, fastChunk } = register(
  ['fastchunk', 'fastChunk'],
  function (n, func, pat) {
    return _chunk(n, func, pat, false, true);
  },
  true,
  true,
);

/**
 * Comme `chunk`, mais la fonction est appliquée à un sous-cycle bouclé du pattern source.
 * @name chunkInto
 * @synonyms chunkinto
 * @memberof Pattern
 * @example
 * sound("bd sd ht lt bd - cp lt").chunkInto(4, hurry(2))
 *   .bank("tr909")
 */
export const { chunkinto, chunkInto } = register(['chunkinto', 'chunkInto'], function (n, func, pat) {
  return pat.into(fastcat(true, ...Array(n - 1).fill(false))._iterback(n), func);
});

/**
 * Comme `chunkInto`, mais se déplace en arrière à travers les morceaux.
 * @name chunkBackInto
 * @synonyms chunkbackinto
 * @memberof Pattern
 * @example
 * sound("bd sd ht lt bd - cp lt").chunkInto(4, hurry(2))
 *   .bank("tr909")
 */
export const { chunkbackinto, chunkBackInto } = register(['chunkbackinto', 'chunkBackInto'], function (n, func, pat) {
  return pat.into(
    fastcat(true, ...Array(n - 1).fill(false))
      ._iter(n)
      ._early(1),
    func,
  );
});

// TODO - redefine elsewhere in terms of mask
export const bypass = register(
  'bypass',
  function (on, pat) {
    on = Boolean(parseInt(on));
    return on ? silence : pat;
  },
  true,
  true,
);

/**
 * Boucle le pattern à l'intérieur d'un `offset` pour `cycles`.
 * Si vous pensez à toute la durée de temps en cycles comme un ruban, vous pouvez couper un seul morceau et le boucler.
 * @name ribbon
 * @synonyms rib
 * @param {number} offset point de départ de la boucle en cycles
 * @param {number} cycles longueur de la boucle en cycles
 * @example
 * note("<c d e f>").ribbon(1, 2)
 * @example
 * // Looping a portion of randomness
 * n(irand(8).segment(4)).scale("c:pentatonic").ribbon(1337, 2)
 * @example
 * // rhythm generator
 * s("bd!16?").ribbon(29,.5)
 */
export const { ribbon, rib } = register(['ribbon', 'rib'], (offset, cycles, pat) =>
  pat.early(offset).restart(pure(1).slow(cycles)),
);

export const hsla = register('hsla', (h, s, l, a, pat) => {
  return pat.color(`hsla(${h}turn,${s * 100}%,${l * 100}%,${a})`);
});

export const hsl = register('hsl', (h, s, l, pat) => {
  return pat.color(`hsl(${h}turn,${s * 100}%,${l * 100}%)`);
});

/**
 * Marque chaque Hap avec un identifiant. Bon pour le filtrage. La fonction remplit Hap.context.tags (Array).
 * @name tag
 * @noAutocomplete
 * @param {string} tag n'importe quoi d'unique
 */
Pattern.prototype.tag = function (tag) {
  return this.withContext((ctx) => ({ ...ctx, tags: (ctx.tags || []).concat([tag]) }));
};

/**
 * Filtre les haps en utilisant la fonction donnée
 * @name filter
 * @param {Function} test fonction pour tester Hap
 * @example
 * s("hh!7 oh").filter(hap => hap.value.s==='hh')
 */
export const filter = register('filter', (test, pat) => pat.withHaps((haps) => haps.filter(test)));

/**
 * Filtre les haps par leur temps de début
 * @name filterWhen
 * @noAutocomplete
 * @param {Function} test fonction pour tester Hap.whole.begin
 */
export const filterWhen = register('filterWhen', (test, pat) => pat.filter((h) => test(h.whole.begin)));

/**
 * Utilise within pour appliquer une fonction à seulement une partie d'un pattern.
 * @name within
 * @param {number} start début dans le cycle (0 - 1)
 * @param {number} end fin dans le cycle (0 - 1). Doit être > start
 * @param {Function} func fonction à appliquer au sous-pattern
 */
export const within = register('within', (a, b, fn, pat) =>
  stack(
    fn(pat.filterWhen((t) => t.cyclePos() >= a && t.cyclePos() <= b)),
    pat.filterWhen((t) => t.cyclePos() < a || t.cyclePos() > b),
  ),
);

//////////////////////////////////////////////////////////////////////
// Stepwise functions

Pattern.prototype.stepJoin = function () {
  const pp = this;
  const first_t = stepcat(..._retime(_slices(pp.queryArc(0, 1))))._steps;
  const q = function (state) {
    const shifted = pp.early(state.span.begin.sam());
    const haps = shifted.query(state.setSpan(new TimeSpan(Fraction(0), Fraction(1))));
    const pat = stepcat(..._retime(_slices(haps)));
    return pat.query(state);
  };
  return new Pattern(q, first_t);
};

Pattern.prototype.stepBind = function (func) {
  return this.fmap(func).stepJoin();
};

export function _retime(timedHaps) {
  const occupied_perc = timedHaps.filter((t, pat) => pat.hasSteps).reduce((a, b) => a.add(b), Fraction(0));
  const occupied_steps = removeUndefineds(timedHaps.map((t, pat) => pat._steps)).reduce(
    (a, b) => a.add(b),
    Fraction(0),
  );
  const total_steps = occupied_perc.eq(0) ? undefined : occupied_steps.div(occupied_perc);
  function adjust(dur, pat) {
    if (pat._steps === undefined) {
      return [dur.mulmaybe(total_steps), pat];
    }
    return [pat._steps, pat];
  }
  return timedHaps.map((x) => adjust(...x));
}

export function _slices(haps) {
  // slices evs = map (\s -> ((snd s - fst s), stack $ map value $ fit s evs))
  // $ pairs $ sort $ nubOrd $ 0:1:concatMap (\ev -> start (part ev):stop (part ev):[]) evs
  const breakpoints = flatten(haps.map((hap) => [hap.part.begin, hap.part.end]));
  const unique = uniqsortr([Fraction(0), Fraction(1), ...breakpoints]);
  const slicespans = pairs(unique);
  return slicespans.map((s) => [
    s[1].sub(s[0]),
    stack(..._fitslice(new TimeSpan(...s), haps).map((x) => x.value.withHap((h) => h.setContext(h.combineContext(x))))),
  ]);
}

export function _fitslice(span, haps) {
  return removeUndefineds(haps.map((hap) => _match(span, hap)));
}

export function _match(span, hap_p) {
  const subspan = span.intersection(hap_p.part);
  if (subspan == undefined) {
    return undefined;
  }
  return new Hap(hap_p.whole, subspan, hap_p.value, hap_p.context);
}

/**
 * *Expérimental*
 *
 * Accélère ou ralentit un pattern, pour s'adapter au nombre donné de pas par cycle.
 * @example
 * sound("bd sd cp").pace(4)
 * // The same as sound("{bd sd cp}%4") or sound("<bd sd cp>*4")
 */
export const pace = register('pace', function (targetSteps, pat) {
  if (pat._steps === undefined) {
    return pat;
  }
  if (pat._steps.eq(Fraction(0))) {
    // avoid divide by zero..
    return nothing;
  }
  return pat._fast(Fraction(targetSteps).div(pat._steps)).setSteps(targetSteps);
});

export function _polymeterListSteps(steps, ...args) {
  const seqs = args.map((a) => _sequenceCount(a));
  if (seqs.length == 0) {
    return silence;
  }
  if (steps == 0) {
    steps = seqs[0][1];
  }
  const pats = [];
  for (const seq of seqs) {
    if (seq[1] == 0) {
      continue;
    }
    if (steps == seq[1]) {
      pats.push(seq[0]);
    } else {
      pats.push(seq[0]._fast(Fraction(steps).div(Fraction(seq[1]))));
    }
  }
  return stack(...pats);
}

/**
 * *Expérimental*
 *
 * Aligne les pas des patterns, créant des polymètres. Les patterns sont répétés jusqu'à ce qu'ils s'adaptent tous au cycle. Par exemple, ci-dessous le premier pattern est répété deux fois, et le second est répété trois fois, pour s'adapter au plus petit commun multiple de six pas.
 * @synonyms pm
 * @example
 * // The same as note("{c eb g, c2 g2}%6")
 * polymeter("c eb g", "c2 g2").note()
 *
 */
export function polymeter(...args) {
  if (Array.isArray(args[0])) {
    // Support old behaviour
    return _polymeterListSteps(0, ...args);
  }

  // TODO currently ignoring arguments without steps...
  args = args.filter((arg) => arg.hasSteps);

  if (args.length == 0) {
    return silence;
  }
  const steps = lcm(...args.map((x) => x._steps));
  if (steps.eq(Fraction(0))) {
    return nothing;
  }

  const result = stack(...args.map((x) => x.pace(steps)));
  result._steps = steps;
  return result;
}

/** 'Concatène' les patterns comme `fastcat`, mais proportionnellement à un nombre de pas par cycle.
 * Les pas peuvent soit être déduits du pattern, soit fournis comme une paire [longueur, pattern].
 * A l'alias `timecat`.
 * @name stepcat
 * @synonyms timeCat, timecat
 * @return {Pattern}
 * @example
 * stepcat([3,"e3"],[1, "g3"]).note()
 * // the same as "e3@3 g3".note()
 * @example
 * stepcat("bd sd cp","hh hh").sound()
 * // the same as "bd sd cp hh hh".sound()
 */
export function stepcat(...timepats) {
  if (timepats.length === 0) {
    return nothing;
  }
  const findsteps = (x) => (Array.isArray(x) ? x : [x._steps ?? 1, x]);
  timepats = timepats.map(findsteps);
  if (timepats.find((x) => x[0] === undefined)) {
    const times = timepats.map((a) => a[0]).filter((x) => x !== undefined);
    if (times.length === 0) {
      return fastcat(...timepats.map((x) => x[1]));
    }
    if (times.length === timepats.length) {
      return nothing;
    }
    const avg = times.reduce((a, b) => a.add(b), Fraction(0)).div(times.length);
    for (let timepat of timepats) {
      if (timepat[0] === undefined) {
        timepat[0] = avg;
      }
    }
  }
  if (timepats.length == 1) {
    const result = reify(timepats[0][1]);
    return result.withSteps((_) => timepats[0][0]);
  }

  const total = timepats.map((a) => a[0]).reduce((a, b) => a.add(b), Fraction(0));
  let begin = Fraction(0);
  const pats = [];
  for (const [time, pat] of timepats) {
    if (Fraction(time).eq(0)) {
      continue;
    }
    const end = begin.add(time);
    pats.push(reify(pat)._compress(begin.div(total), end.div(total)));
    begin = end;
  }
  const result = stack(...pats);
  result._steps = total;
  return result;
}

/**
 * *Expérimental*
 *
 * Concatène les patterns pas à pas, selon un 'pas par cycle' déduit.
 * Similaire à `stepcat`, mais si un argument est une liste, le pattern entier alternera entre les éléments de la liste.
 *
 * @return {Pattern}
 * @example
 * stepalt(["bd cp", "mt"], "bd").sound()
 * // The same as "bd cp bd mt bd".sound()
 */
export function stepalt(...groups) {
  groups = groups.map((a) => (Array.isArray(a) ? a.map(reify) : [reify(a)]));

  const cycles = lcm(...groups.map((x) => Fraction(x.length)));

  let result = [];
  for (let cycle = 0; cycle < cycles; ++cycle) {
    result.push(...groups.map((x) => (x.length == 0 ? silence : x[cycle % x.length])));
  }
  result = result.filter((x) => x.hasSteps && x._steps > 0);
  const steps = result.reduce((a, b) => a.add(b._steps), Fraction(0));
  result = stepcat(...result);
  result._steps = steps;
  return result;
}

/**
 * *Expérimental*
 *
 * Prend le nombre de pas donné d'un pattern (supprimant le reste).
 * Un nombre positif prendra des pas depuis le début d'un pattern, et un nombre négatif depuis la fin.
 * @return {Pattern}
 * @example
 * "bd cp ht mt".take("2").sound()
 * // The same as "bd cp".sound()
 * @example
 * "bd cp ht mt".take("1 2 3").sound()
 * // The same as "bd bd cp bd cp ht".sound()
 * @example
 * "bd cp ht mt".take("-1 -2 -3").sound()
 * // The same as "mt ht mt cp ht mt".sound()
 */
export const take = stepRegister('take', function (i, pat) {
  if (!pat.hasSteps) {
    return nothing;
  }
  if (pat._steps.lte(0)) {
    return nothing;
  }
  i = Fraction(i);
  if (i.eq(0)) {
    return nothing;
  }
  const flip = i < 0;
  if (flip) {
    i = i.abs();
  }
  const frac = i.div(pat._steps);
  if (frac.lte(0)) {
    return nothing;
  }
  if (frac.gte(1)) {
    return pat;
  }
  if (flip) {
    return pat.zoom(Fraction(1).sub(frac), 1);
  }
  return pat.zoom(0, frac);
});

/**
 * *Expérimental*
 *
 * Supprime le nombre de pas donné d'un pattern.
 * Un nombre positif supprimera des pas depuis le début d'un pattern, et un nombre négatif depuis la fin.
 * @return {Pattern}
 * @example
 * "tha dhi thom nam".drop("1").sound().bank("mridangam")
 * @example
 * "tha dhi thom nam".drop("-1").sound().bank("mridangam")
 * @example
 * "tha dhi thom nam".drop("0 1 2 3").sound().bank("mridangam")
 * @example
 * "tha dhi thom nam".drop("0 -1 -2 -3").sound().bank("mridangam")
 */
export const drop = stepRegister('drop', function (i, pat) {
  if (!pat.hasSteps) {
    return nothing;
  }

  i = Fraction(i);
  if (i.lt(0)) {
    return pat.take(pat._steps.add(i));
  }
  return pat.take(Fraction(0).sub(pat._steps.sub(i)));
});

/**
 * *Expérimental*
 *
 * `extend` est similaire à `fast` en ce qu'il augmente sa densité, mais il augmente aussi le nombre de pas
 * en conséquence. Donc `stepcat("a b".extend(2), "c d")` serait identique à `"a b a b c d"`, tandis que
 * `stepcat("a b".fast(2), "c d")` serait identique à `"[a b] [a b] c d"`.
 * @example
 * stepcat(
 *   sound("bd bd - cp").extend(2),
 *   sound("bd - sd -")
 * ).pace(8)
 */
export const extend = stepRegister('extend', function (factor, pat) {
  return pat.fast(factor).expand(factor);
});

/**
 * *Experimental*
 *
 * `replicate` is similar to `fast` in that it increases its density, but it also increases the step count
 * accordingly. So `stepcat("a b".replicate(2), "c d")` would be the same as `"a b a b c d"`, whereas
 * `stepcat("a b".fast(2), "c d")` would be the same as `"[a b] [a b] c d"`.
 *
 * TODO: find out how this function differs from extend
 * @example
 * stepcat(
 *   sound("bd bd - cp").replicate(2),
 *   sound("bd - sd -")
 * ).pace(8)
 */
export const replicate = stepRegister('replicate', function (factor, pat) {
  return pat.repeatCycles(factor).fast(factor).expand(factor);
});

/**
 * *Experimental*
 *
 * Expands the step size of the pattern by the given factor.
 * @example
 * sound("tha dhi thom nam").bank("mridangam").expand("3 2 1 1 2 3").pace(8)
 */
export const expand = stepRegister('expand', function (factor, pat) {
  return pat.withSteps((t) => t.mul(Fraction(factor)));
});

/**
 * *Experimental*
 *
 * Contracts the step size of the pattern by the given factor. See also `expand`.
 * @example
 * sound("tha dhi thom nam").bank("mridangam").contract("3 2 1 1 2 3").pace(8)
 */
export const contract = stepRegister('contract', function (factor, pat) {
  return pat.withSteps((t) => t.div(Fraction(factor)));
});

Pattern.prototype.shrinklist = function (amount) {
  const pat = this;

  if (!pat.hasSteps) {
    return [pat];
  }

  let [amountv, times] = Array.isArray(amount) ? amount : [amount, pat._steps];
  amountv = Fraction(amountv);

  if (times === 0 || amountv === 0) {
    return [pat];
  }

  const fromstart = amountv > 0;
  const ranges = [];
  if (fromstart) {
    const seg = Fraction(1).div(pat._steps).mul(amountv);
    for (let i = 0; i < times; ++i) {
      const s = seg.mul(i);
      if (s.gt(1)) {
        break;
      }
      ranges.push([s, 1]);
    }
  } else {
    amountv = Fraction(0).sub(amountv);
    const seg = Fraction(1).div(pat._steps).mul(amountv);
    for (let i = 0; i < times; ++i) {
      const e = Fraction(1).sub(seg.mul(i));
      if (e.lt(0)) {
        break;
      }
      ranges.push([Fraction(0), e]);
    }
  }
  return ranges.map((x) => pat.zoom(...x));
};

export const shrinklist = (amount, pat) => pat.shrinklist(amount);

/**
 * *Experimental*
 *
 * Progressively shrinks the pattern by 'n' steps until there's nothing left, or if a second value is given (using mininotation list syntax with `:`),
 * that number of times.
 * A positive number will progressively drop steps from the start of a pattern, and a negative number from the end.
 * @return {Pattern}
 * @example
 * "tha dhi thom nam".shrink("1").sound()
 * .bank("mridangam")
 * @example
 * "tha dhi thom nam".shrink("-1").sound()
 * .bank("mridangam")
 * @example
 * "tha dhi thom nam".shrink("1 -1").sound().bank("mridangam").pace(4)
 * @example
 * note("0 1 2 3 4 5 6 7".scale("C:ritusen")).sound("folkharp")
   .shrink("1 -1").pace(8)

 */

export const shrink = register(
  'shrink',
  function (amount, pat) {
    if (!pat.hasSteps) {
      return nothing;
    }

    const list = pat.shrinklist(amount);
    const result = stepcat(...list);
    // TODO is this calculation needed?
    result._steps = list.reduce((a, b) => a.add(b._steps), Fraction(0));
    return result;
  },
  true,
  false,
  (x) => x.stepJoin(),
);

/**
 * *Experimental*
 *
 * Progressively grows the pattern by 'n' steps until the full pattern is played, or if a second value is given (using mininotation list syntax with `:`),
 * that number of times.
 * A positive number will progressively grow steps from the start of a pattern, and a negative number from the end.
 * @return {Pattern}
 * @example
 * "tha dhi thom nam".grow("1").sound()
 * .bank("mridangam")
 * @example
 * "tha dhi thom nam".grow("-1").sound()
 * .bank("mridangam")
 * @example
 * "tha dhi thom nam".grow("1 -1").sound().bank("mridangam").pace(4)
 * @example
 * note("0 1 2 3 4 5 6 7".scale("C:ritusen")).sound("folkharp")
   .grow("1 -1").pace(8)
 */

export const grow = register(
  'grow',
  function (amount, pat) {
    if (!pat.hasSteps) {
      return nothing;
    }

    const list = pat.shrinklist(Fraction(0).sub(amount));
    list.reverse();
    const result = stepcat(...list);
    // TODO is this calculation needed?
    result._steps = list.reduce((a, b) => a.add(b._steps), Fraction(0));
    return result;
  },
  true,
  false,
  (x) => x.stepJoin(),
);

/**
 * *Experimental*
 * 
 * Inserts a pattern into a list of patterns. On the first repetition it will be inserted at the end of the list, then moved backwards through the list 
 * on successive repetitions. The patterns are added together stepwise, with all repetitions taking place over a single cycle. Using `pace` to set the 
 * number of steps per cycle is therefore usually recommended.
 * 
 * @return {Pattern}
 * @example
 * "[c g]".tour("e f", "e f g", "g f e c").note()
   .sound("folkharp")
   .pace(8)
 */
export const tour = function (pat, ...many) {
  return pat.tour(...many);
};

Pattern.prototype.tour = function (...many) {
  return stepcat(
    ...[].concat(
      ...many.map((x, i) => [...many.slice(0, many.length - i), this, ...many.slice(many.length - i)]),
      this,
      ...many,
    ),
  );
};

/**
 * *Experimental*
 * 
 * 'zips' together the steps of the provided patterns. This can create a long repetition, taking place over a single, dense cycle. 
 * Using `pace` to set the number of steps per cycle is therefore usually recommended.
 * 
 * @returns {Pattern}
 * @example
 * zip("e f", "e f g", "g [f e] a f4 c").note()
   .sound("folkharp")
   .pace(8)
 */
export const zip = function (...pats) {
  pats = pats.filter((pat) => pat.hasSteps);
  const zipped = slowcat(...pats.map((pat) => pat._slow(pat._steps)));
  const steps = lcm(...pats.map((x) => x._steps));
  return zipped._fast(steps).setSteps(steps);
};

/** Aliases for `stepcat` */
export const timecat = stepcat;
export const timeCat = stepcat;

// Deprecated stepwise aliases
export const s_cat = stepcat;
export const s_alt = stepalt;
export const s_polymeter = polymeter;
Pattern.prototype.s_polymeter = Pattern.prototype.polymeter;
export const s_taper = shrink;
Pattern.prototype.s_taper = Pattern.prototype.shrink;
export const s_taperlist = shrinklist;
Pattern.prototype.s_taperlist = Pattern.prototype.shrinklist;
export const s_add = take;
Pattern.prototype.s_add = Pattern.prototype.take;
export const s_sub = drop;
Pattern.prototype.s_sub = Pattern.prototype.drop;
export const s_expand = expand;
Pattern.prototype.s_expand = Pattern.prototype.expand;
export const s_extend = extend;
Pattern.prototype.s_extend = Pattern.prototype.extend;
export const s_contract = contract;
Pattern.prototype.s_contract = Pattern.prototype.contract;
export const s_tour = tour;
Pattern.prototype.s_tour = Pattern.prototype.tour;
export const s_zip = zip;
Pattern.prototype.s_zip = Pattern.prototype.zip;
export const steps = pace;
Pattern.prototype.steps = Pattern.prototype.pace;

//////////////////////////////////////////////////////////////////////
// Control-related functions, i.e. ones that manipulate patterns of
// objects

/**
 * Cuts each sample into the given number of parts, allowing you to explore a technique known as 'granular synthesis'.
 * It turns a pattern of samples into a pattern of parts of samples.
 * @name chop
 * @memberof Pattern
 * @returns Pattern
 * @example
 * samples({ rhodes: 'https://cdn.freesound.org/previews/132/132051_316502-lq.mp3' })
 * s("rhodes")
 *  .chop(4)
 *  .rev() // reverse order of chops
 *  .loopAt(2) // fit sample into 2 cycles
 *
 */
export const chop = register('chop', function (n, pat) {
  const slices = Array.from({ length: n }, (x, i) => i);
  const slice_objects = slices.map((i) => ({ begin: i / n, end: (i + 1) / n }));
  const merge = function (a, b) {
    if ('begin' in a && 'end' in a && a.begin !== undefined && a.end !== undefined) {
      const d = a.end - a.begin;
      b = { begin: a.begin + b.begin * d, end: a.begin + b.end * d };
    }
    // return a;
    return Object.assign({}, a, b);
  };
  const func = function (o) {
    return sequence(slice_objects.map((slice_o) => merge(o, slice_o)));
  };
  return pat.squeezeBind(func).setSteps(__steps ? Fraction(n).mulmaybe(pat._steps) : undefined);
});

/**
 * Cuts each sample into the given number of parts, triggering progressive portions of each sample at each loop.
 * @name striate
 * @memberof Pattern
 * @returns Pattern
 * @example
 * s("numbers:0 numbers:1 numbers:2").striate(6).slow(3)
 */
export const striate = register('striate', function (n, pat) {
  const slices = Array.from({ length: n }, (x, i) => i);
  const slice_objects = slices.map((i) => ({ begin: i / n, end: (i + 1) / n }));
  const slicePat = slowcat(...slice_objects);
  return pat
    .set(slicePat)
    ._fast(n)
    .setSteps(__steps ? Fraction(n).mulmaybe(pat._steps) : undefined);
});

/**
 * Makes the sample fit the given number of cycles by changing the speed.
 * @name loopAt
 * @memberof Pattern
 * @returns Pattern
 * @example
 * samples({ rhodes: 'https://cdn.freesound.org/previews/132/132051_316502-lq.mp3' })
 * s("rhodes").loopAt(2)
 */
// TODO - global cps clock
const _loopAt = function (factor, pat, cps = 0.5) {
  return pat
    .speed((1 / factor) * cps)
    .unit('c')
    .slow(factor);
};

/**
 * Chops samples into the given number of slices, triggering those slices with a given pattern of slice numbers.
 * Instead of a number, it also accepts a list of numbers from 0 to 1 to slice at specific points.
 * @name slice
 * @memberof Pattern
 * @returns Pattern
 * @example
 * samples('github:tidalcycles/dirt-samples')
 * s("breaks165").slice(8, "0 1 <2 2*2> 3 [4 0] 5 6 7".every(3, rev)).slow(0.75)
 * @example
 * samples('github:tidalcycles/dirt-samples')
 * s("breaks125").fit().slice([0,.25,.5,.75], "0 1 1 <2 3>")
 */

export const slice = register(
  'slice',
  function (npat, ipat, opat) {
    return npat
      .innerBind((n) =>
        ipat.outerBind((i) =>
          opat.outerBind((o) => {
            // If it's not an object, assume it's a string and make it a 's' control parameter
            o = o instanceof Object ? o : { s: o };
            const begin = Array.isArray(n) ? n[i] : i / n;
            const end = Array.isArray(n) ? n[i + 1] : (i + 1) / n;
            return pure({ begin, end, _slices: n, ...o });
          }),
        ),
      )
      .setSteps(ipat._steps);
  },
  false, // turns off auto-patternification
);

/**
 *
 * make something happen on event time
 * uses browser timeout which is innacurate for audio tasks
 * @name onTriggerTime
 * @memberof Pattern
 *  @returns Pattern
 * @example
 * s("bd!8").onTriggerTime((hap) => {console.log(hap)})
 */
Pattern.prototype.onTriggerTime = function (func) {
  return this.onTrigger((hap, currentTime, _cps, targetTime) => {
    const diff = targetTime - currentTime;
    window.setTimeout(() => {
      func(hap);
    }, diff * 1000);
  }, false);
};

/**
 * Works the same as slice, but changes the playback speed of each slice to match the duration of its step.
 * @name splice
 * @example
 * samples('github:tidalcycles/dirt-samples')
 * s("breaks165")
 * .splice(8,  "0 1 [2 3 0]@2 3 0@2 7")
 */

export const splice = register(
  'splice',
  function (npat, ipat, opat) {
    const sliced = slice(npat, ipat, opat);
    return new Pattern((state) => {
      // TODO - default cps to 0.5
      const cps = state.controls._cps || 1;
      const haps = sliced.query(state);
      return haps.map((hap) =>
        hap.withValue((v) => ({
          ...{
            speed: (cps / v._slices / hap.whole.duration) * (v.speed || 1),
            unit: 'c',
          },
          ...v,
        })),
      );
    }).setSteps(ipat._steps);
  },
  false, // turns off auto-patternification
);

export const { loopAt, loopat } = register(['loopAt', 'loopat'], function (factor, pat) {
  const steps = pat._steps ? pat._steps.div(factor) : undefined;
  return new Pattern((state) => _loopAt(factor, pat, state.controls._cps).query(state), steps);
});

/**
 * Makes the sample fit its event duration. Good for rhythmical loops like drum breaks.
 * Similar to `loopAt`.
 * @name fit
 * @example
 * samples({ rhodes: 'https://cdn.freesound.org/previews/132/132051_316502-lq.mp3' })
 * s("rhodes/2").fit()
 */
export const fit = register('fit', (pat) =>
  pat.withHaps((haps, state) =>
    haps.map((hap) =>
      hap.withValue((v) => {
        const slicedur = ('end' in v ? v.end : 1) - ('begin' in v ? v.begin : 0);
        return {
          ...v,
          speed: ((state.controls._cps || 1) / hap.whole.duration) * slicedur,
          unit: 'c',
        };
      }),
    ),
  ),
);

/**
 * Makes the sample fit the given number of cycles and cps value, by
 * changing the speed. Please note that at some point cps will be
 * given by a global clock and this function will be
 * deprecated/removed.
 * @name loopAtCps
 * @memberof Pattern
 * @returns Pattern
 * @example
 * samples({ rhodes: 'https://cdn.freesound.org/previews/132/132051_316502-lq.mp3' })
 * s("rhodes").loopAtCps(4,1.5).cps(1.5)
 */
// TODO - global cps clock
export const { loopAtCps, loopatcps } = register(['loopAtCps', 'loopatcps'], function (factor, cps, pat) {
  return _loopAt(factor, pat, cps);
});

/** exposes a custom value at query time. basically allows mutating state without evaluation */
export const ref = (accessor) =>
  pure(1)
    .withValue(() => reify(accessor()))
    .innerJoin();

let fadeGain = (p) => (p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5);

/**
 * Cross-fades between left and right from 0 to 1:
 * - 0 = (full left, no right)
 * - .5 = (both equal)
 * - 1 = (no left, full right)
 *
 * @name xfade
 * @example
 * xfade(s("bd*2"), "<0 .25 .5 .75 1>", s("hh*8"))
 */
export let xfade = (a, pos, b) => {
  pos = reify(pos);
  a = reify(a);
  b = reify(b);
  let gaina = pos.fmap((v) => ({ gain: fadeGain(v) }));
  let gainb = pos.fmap((v) => ({ gain: fadeGain(1 - v) }));
  return stack(a.mul(gaina), b.mul(gainb));
};

// the prototype version is actually flipped so left/right makes sense
Pattern.prototype.xfade = function (pos, b) {
  return xfade(this, pos, b);
};

/**
 * creates a structure pattern from divisions of a cycle
 * especially useful for creating rhythms
 * @name beat
 * @example
 * s("bd").beat("0,7,10", 16)
 * @example
 * s("sd").beat("4,12", 16)
 */
const __beat = (join) => (t, div, pat) => {
  t = Fraction(t).mod(div);
  div = Fraction(div);
  const b = t.div(div);
  const e = t.add(1).div(div);
  return join(pat.fmap((x) => pure(x)._compress(b, e)));
};

export const { beat } = register(
  ['beat'],
  __beat((x) => x.innerJoin()),
);

export const _morph = (from, to, by) => {
  by = Fraction(by);
  const dur = Fraction(1).div(from.length);
  const positions = (list) => {
    const result = [];
    for (const [pos, value] of list.entries()) {
      if (value) {
        result.push([Fraction(pos).div(list.length), value]);
      }
    }
    return result;
  };
  const arcs = zipWith(
    ([posa, valuea], [posb, valueb]) => {
      const b = by.mul(posb - posa).add(posa);
      const e = b.add(dur);
      return new TimeSpan(b, e);
    },
    positions(from),
    positions(to),
  );
  function query(state) {
    const cycle = state.span.begin.sam();
    const cycleArc = state.span.cycleArc();
    const result = [];
    for (const whole of arcs) {
      const part = whole.intersection(cycleArc);
      if (part !== undefined) {
        result.push(
          new Hap(
            whole.withTime((x) => x.add(cycle)),
            part.withTime((x) => x.add(cycle)),
            true,
          ),
        );
      }
    }
    return result;
  }
  return new Pattern(query).splitQueries();
};

/**
 * Takes two binary rhythms represented as lists of 1s and 0s, and a number
 * between 0 and 1 that morphs between them. The two lists should contain the same
 * number of true values.
 * @example
 * sound("hh").struct(morph([1,0,1,0,1,0,1,0], // straight rhythm
 *                          [1,1,0,1,0,1,0], // wonky rhythm
 *                          0.25 // creates a slightly wonky rhythm
 *                         )
 *                   )
 * @example
 * sound("hh").struct(morph("1:0:1:0:1:0:1:0", // straight rhythm
 *                          "1:1:0:1:0:1:0", // wonky rhythm
 *                          sine.slow(8) // slowly morph between the rhythms
 *                         )
 *                   )
 */
export const morph = (frompat, topat, bypat) => {
  frompat = reify(frompat);
  topat = reify(topat);
  bypat = reify(bypat);
  return frompat.innerBind((from) => topat.innerBind((to) => bypat.innerBind((by) => _morph(from, to, by))));
};

/**
 * Soft-clipping distortion
 *
 * @name soft
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Hard-clipping distortion
 *
 * @name hard
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Cubic polynomial distortion
 *
 * @name cubic
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Diode-emulating distortion
 *
 * @name diode
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Asymmetrical diode distortion
 *
 * @name asym
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Wavefolding distortion
 *
 * @name fold
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Wavefolding distortion composed with sinusoid
 *
 * @name sinefold
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
/**
 * Distortion via Chebyshev polynomials
 *
 * @name chebyshev
 * @param {number | Pattern} distortion amount of distortion to apply
 * @param {number | Pattern} volume linear postgain of the distortion
 *
 */
const distAlgoNames = ['scurve', 'soft', 'hard', 'cubic', 'diode', 'asym', 'fold', 'sinefold', 'chebyshev'];
for (const name of distAlgoNames) {
  // Add aliases for distortion algorithms
  Pattern.prototype[name] = function (args) {
    const argsPat = reify(args).fmap((v) => (Array.isArray(v) ? [...v, name] : [v, 1, name]));
    return this.distort(argsPat);
  };
}
