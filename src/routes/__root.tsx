import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const SITE_NAME = "MenuQR";
const SITE_DESCRIPTION =
  "MenuQR: QR menu, table ordering, payments, and reports for restaurants, cafes, and outlets in Pakistan.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#15803d" },
      { name: "format-detection", content: "telephone=no" },
      { title: "MenuQR — QR Menu & Ordering for Pakistan" },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "keywords", content: "QR menu, restaurant ordering, table ordering, digital menu, Pakistan, cafe POS, outlet management" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: SITE_NAME },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: "MenuQR — QR Menu & Ordering for Pakistan" },
      { property: "og:description", content: "Access Hub Revival is a web application for managing outlets and their associated data." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_PK" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MenuQR — QR Menu & Ordering for Pakistan" },
      { name: "twitter:description", content: "Access Hub Revival is a web application for managing outlets and their associated data." },
      { name: "description", content: "Access Hub Revival is a web application for managing outlets and their associated data." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RzPQE5ue3lOwC0LZc5OKWsKGyde2/social-images/social-1776842599558-MenuQR_ad.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/RzPQE5ue3lOwC0LZc5OKWsKGyde2/social-images/social-1776842599558-MenuQR_ad.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "shortcut icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
