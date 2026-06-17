// Absolute base URL for links that travel outside the app (emails). Set APP_URL
// in production (e.g. https://leaflet-gules.vercel.app); defaults to localhost
// for dev so verification/reset links are clickable without any config.
export function appUrl(path = ""): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}
