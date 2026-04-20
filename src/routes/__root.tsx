import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MenuQR — QR Menu & Ordering for Pakistan" },
      {
        name: "description",
        content:
          "MenuQR (Access Hub Evolved): QR menu, table ordering, payments, and reports for restaurants, cafes, and outlets in Pakistan.",
      },
      { property: "og:title", content: "MenuQR — QR Menu & Ordering" },
      {
        property: "og:description",
        content:
          "Let customers scan, order from their table, and pay — all from their phone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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

