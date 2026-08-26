import type { ReactNode } from "react";

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="app-drag flex min-h-dvh items-center justify-center bg-background p-6 pt-10 text-foreground">
      {children}
    </div>
  );
}

Frame.displayName = "App.Loading.Frame";
