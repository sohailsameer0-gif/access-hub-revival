// Vercel Serverless Function that wraps the TanStack Start SSR worker entry.
// Bridges Vercel's Node.js (req/res) runtime to the Web Fetch API the SSR worker expects.
import handler from "../dist/server/index.js";

export const config = {
  runtime: "nodejs",
};

export default async function ssr(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

    // Build a Web Request from the incoming Node request.
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else if (value !== undefined) {
        headers.set(key, String(value));
      }
    }

    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const response = await handler.fetch(request, {}, {});

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("SSR handler error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
