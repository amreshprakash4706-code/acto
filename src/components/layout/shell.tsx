import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { CommandPalette } from "./command-palette";
import { CompareTray } from "./compare-tray";
import { useAppStore } from "@/lib/atconiz/store";

export function Shell({ children }: { children: ReactNode }) {
  const [command, setCommand] = useState(false);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header onCommand={() => setCommand(true)} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <CompareTray />
      <CommandPalette open={command} onClose={() => setCommand(false)} />
    </div>
  );
}
