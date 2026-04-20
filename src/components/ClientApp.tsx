import { useEffect, useState } from "react";

/**
 * Client-only mount point for the original react-router-dom App.
 * BrowserRouter requires `document`, so this only loads in the browser.
 */
export default function ClientApp() {
  const [App, setApp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;
    import("../App").then((mod) => {
      if (mounted) setApp(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!App) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        Loading…
      </div>
    );
  }

  return <App />;
}
