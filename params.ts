// Tuned constants for main.ts, fitted on the six practice cases.
//
// Selection: coordinate descent on the practice pinball loss, with p05's answers refetched from
// Polymarket (the house baseline reproduces to 6e-5 on the six local windows). The shape is a
// Student-t random walk whose volatility is the 90th percentile of the market's absolute minute
// changes (the MAD is exactly zero for most of these markets), rescaled by how fast the last hour
// is moving, capped near zero by a multiple of the price itself, and shifted by a smoothed anchor
// plus the exclusive-outcome sum constraint.

/** History used for the volatility estimate, in minutes. */
export const VOL_WINDOW = 1200;
/** Multiplier applied to the volatility estimate. */
export const SIGMA_MULT = 0.65;
/** Spread exponent: width grows like h^ALPHA. */
export const ALPHA = 0.6;
/** Per-level multipliers for 0.05, 0.25, 0.5, 0.75 and 0.95. The downside is wider: these
 *  markets decay faster than they rise. */
export const MULT = [1.5, 0.9, 0.3, 0.3, 0.8];
/** Extra widening for markets with less than MIN_HISTORY minutes of prices. */
export const SHORT_HISTORY_SCALE = 1.0;
/** A market below this many minutes borrows the cross-sectional volatility. */
export const MIN_HISTORY = 60;
/** Percentile of the cross-sectional volatilities used as the pooled estimate. */
export const POOL_Q = 50;
/** Recent-vs-baseline volatility ratio: exponent and clamp. */
export const VOL_RATIO_GAMMA = 0.5;
export const VOL_RATIO_CAP = 1.5;
/** Below LOW_PRICE_THRESHOLD, the volatility is capped at LOW_PRICE_REL * price. */
export const LOW_PRICE_THRESHOLD = 0.05;
export const LOW_PRICE_SCALE = 1.0;
export const LOW_PRICE_REL = 0.04;
/** Anchor smoothing over the last ANCHOR_WINDOW minutes. */
export const ANCHOR_WEIGHT = 0.3;
export const ANCHOR_WINDOW = 3;
/** Weight of the exclusive-outcome sum reversion, x / sum(prices). */
export const KAPPA_SUM = 0.5;
/** Volatility estimator: 'q90', 'meanabs', 'rms' or 'mad'. */
export const ESTIMATOR = 'q90';
/** Student-t(3) quantiles at the five levels, rescaled to unit variance. */
export const T_RAW = [-1.358715, -0.441611, 0.0, 0.441611, 1.358715];
