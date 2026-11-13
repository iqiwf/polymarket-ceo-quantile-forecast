// Tuned constants for main.ts, fitted on the practice cases.
//
// Selection: coordinate descent over five rolling practice windows (104 market-windows),
// each window scored against the minutes the next case's history holds. The shape is a
// Student-t random walk whose volatility is the market's own MAD, rescaled by how fast the
// last hour moves relative to that baseline, and capped near zero by a multiple of the price
// itself (a 0.004 market cannot move 0.02).

export const VOL_WINDOW = 1200;
export const SIGMA_MULT = 1.0;
export const ALPHA = 0.55;
export const MULT = [1.7, 0.7, 0.65, 0.7, 1.0];
export const SHORT_HISTORY_SCALE = 1.0;
export const MIN_HISTORY = 60;
export const DF = 3;
export const POOL_Q = 50;
export const VOL_RATIO_GAMMA = 1.0;
export const VOL_RATIO_CAP = 2.0;
export const LOW_PRICE_THRESHOLD = 0.05;
export const LOW_PRICE_SCALE = 1.0;
export const LOW_PRICE_REL = 0.04;
export const T_RAW = [-1.358715, -0.441611, 0.0, 0.441611, 1.358715];
