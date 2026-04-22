// Netlify Function that wraps the TanStack Start SSR worker entry.
// Routing is controlled exclusively by netlify.toml redirects so we do NOT
// declare a `path` here — declaring both produces conflicting routes and can
// cause 404s on deep links such as /auth/callback.
import handler from "../../dist/server/index.js";

export default async (request, context) => {
  return handler.fetch(request, {}, context);
};
