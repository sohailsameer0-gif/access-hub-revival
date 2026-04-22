// Netlify Function that wraps the TanStack Start SSR worker entry.
// This lets Netlify serve the SSR app the same way Cloudflare Workers does.
import handler from "../../dist/server/index.js";

export default async (request, context) => {
  return handler.fetch(request, {}, context);
};

export const config = {
  path: "/*",
  preferStatic: true,
};
