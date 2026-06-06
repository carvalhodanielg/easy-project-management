import type { HelmetOptions } from 'helmet';

/**
 * Helmet configuration for the API.
 *
 * Uploaded attachments are served from `/uploads/*` and embedded by the SPA,
 * which runs on a different origin (e.g. localhost:5173 → localhost:3000).
 * Helmet's default `Cross-Origin-Resource-Policy: same-origin` blocks those
 * cross-origin <img>/<embed> loads, leaving broken previews. Relaxing CORP to
 * `cross-origin` lets the frontend display attachments while the rest of the
 * default protections stay in place.
 */
export const helmetOptions: HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};
