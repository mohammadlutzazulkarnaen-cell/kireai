/**
 * Build mode.
 *
 * - default (Express server): the client talks to /api and the server owns the
 *   database, sessions and document parsing.
 * - "pages" (GitHub Pages): there is no server, so the client runs the same
 *   detection engine and stores everything in this browser.
 */
export const MODE = import.meta.env.MODE;
export const LOCAL_MODE = MODE === 'pages';
