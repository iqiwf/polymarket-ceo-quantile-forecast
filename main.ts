// polymarket-nvidia-ceo-forecast-01 entrypoint (Node 22, standard library only).
//
// For every market of a case it forecasts the next HORIZON minutes of the Yes price as
// five quantiles. The shape is a fat-tailed random walk around the checkpoint price:
//
//   q_tau(h) = x + m_tau * t_tau(df) * s * h^alpha
//
// where s is the market's recent volatility (1.4826 * MAD of its last minute changes),
// t_tau(df) is a Student-t quantile rescaled to unit variance, m_tau is a per-level
// calibration fitted on the practice cases, and x is clamped into [0,1].
//
// Deterministic: no randomness, no clock, no network; the same case always writes the
// same bytes. Reads $MAKEFUN_INPUT_DIR (default /input), writes $MAKEFUN_OUTPUT_DIR
// (default /output).

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALPHA, LOW_PRICE_REL, LOW_PRICE_SCALE, LOW_PRICE_THRESHOLD, MIN_HISTORY, MULT, POOL_Q, SHORT_HISTORY_SCALE, SIGMA_MULT, T_RAW, VOL_RATIO_CAP, VOL_RATIO_GAMMA, VOL_WINDOW } from './params.ts';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Quantile levels, in the order each row lists them. */
const TAU = [0.05, 0.25, 0.5, 0.75, 0.95];


/** Volatility floor and pooled fallback, in price units per minute. */
const SIGMA_FLOOR = 0.0005;
const SIGMA_FALLBACK = 0.002;

interface CaseMarket {
  id: string;
  name?: string;
  prices: number[];
  start?: string;
}

interface CaseFile {
  case: string;
  at: string;
  horizon_minutes: number;
  quantiles: number[];
  markets: CaseMarket[];
}

/** 1.4826 * MAD of the diffs of the last `window` minutes. */
function madSigma(prices: number[], window: number): number {
  const n = prices.length;
  const start = Math.max(1, n - window);
  const d: number[] = [];
  for (let i = start; i < n; i++) d.push(prices[i] - prices[i - 1]);
  if (d.length < 20) return NaN;
  const med = median(d);
  for (let i = 0; i < d.length; i++) d[i] = Math.abs(d[i] - med);
  return 1.4826 * median(d);
}

function median(a: number[]): number {
  const s = a.slice().sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function quantilesFor(m: CaseMarket, sigma: number, horizon: number): number[][] {
  const n = m.prices.length;
  const x = n ? m.prices[n - 1] : 0.5;
  const rows: number[][] = new Array(horizon);
  const s = Math.max(SIGMA_FLOOR, sigma * SIGMA_MULT);
  for (let h = 1; h <= horizon; h++) {
    const width = s * Math.pow(h, ALPHA);
    const row = new Array<number>(5);
    let prev = 0;
    for (let j = 0; j < 5; j++) {
      const z = T_RAW[j] * MULT[j];
      const raw = x + z * width;
      const rounded = Math.round(Math.min(1, Math.max(0, raw)) * 1e6) / 1e6 + 0;
      const q = rounded < prev ? prev : rounded;
      prev = q;
      row[j] = q;
    }
    rows[h - 1] = row;
  }
  return rows;
}

/**
 * The per-market volatility fed to the quantiles: a long-window MAD estimate, widened
 * or narrowed by how fast the last hour is moving relative to that baseline. A market
 * with too little history borrows the case's cross-sectional estimate instead.
 */
function marketVolatility(prices: number[], own: number, pooled: number): number {
  let base = prices.length < MIN_HISTORY || !Number.isFinite(own) || own <= 0 ? pooled * SHORT_HISTORY_SCALE : own;
  const x = prices.length ? prices[prices.length - 1] : 0.5;
  if (x < LOW_PRICE_THRESHOLD) {
    base *= LOW_PRICE_SCALE;
    if (LOW_PRICE_REL > 0) base = Math.min(base, LOW_PRICE_REL * x);
  }
  if (VOL_RATIO_GAMMA <= 0) return base;
  const fast = madSigma(prices, 60);
  if (!Number.isFinite(fast) || fast <= 0 || base <= 0) return base;
  const ratio = Math.min(VOL_RATIO_CAP, Math.max(1 / VOL_RATIO_CAP, fast / base));
  return base * Math.pow(ratio, VOL_RATIO_GAMMA);
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith('.in'))
    .sort();
  for (const file of files) {
    const id = file.slice(0, -3);
    const raw = readFileSync(join(INPUT_DIR, file), 'utf8');
    const c = JSON.parse(raw) as CaseFile;
    if (c.quantiles.length !== 5 || c.quantiles.some((t, j) => t !== TAU[j])) {
      throw new Error(`${file}: unexpected quantile levels ${JSON.stringify(c.quantiles)}`);
    }
    // First pass: each market's own volatility; the median of those is the pooled value.
    const own = c.markets.map((m) => madSigma(m.prices, VOL_WINDOW));
    const usable = own.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    const rank = usable.length ? Math.min(usable.length - 1, Math.floor((POOL_Q / 100) * usable.length)) : -1;
    const pooled = rank >= 0 ? usable[rank] : SIGMA_FALLBACK;
    const forecasts = c.markets.map((m, i) => ({
      id: m.id,
      q: quantilesFor(m, marketVolatility(m.prices, own[i], pooled), c.horizon_minutes),
    }));
    writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify({ forecasts })}\n`);
  }
}

main();
