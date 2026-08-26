import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./context";

type Props = {
  className?: string;
};

/** Single switch: sun (light) ↔ moon (dark). */
export function ThemeSelector({ className }: Props) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t("common.themeDark") : t("common.themeLight")}
      title={isDark ? t("common.themeDark") : t("common.themeLight")}
      className={[
        "relative inline-flex h-8 w-13 shrink-0 items-center rounded-full bg-default p-0.5 transition-colors",
        "hover:bg-default/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={toggle}
    >
      <span
        aria-hidden
        className={[
          "absolute left-1.5 text-muted transition-opacity duration-200",
          isDark ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <Sun size={12} strokeWidth={2.25} />
      </span>
      <span
        aria-hidden
        className={[
          "absolute right-1.5 text-muted transition-opacity duration-200",
          isDark ? "opacity-0" : "opacity-100",
        ].join(" ")}
      >
        <Moon size={12} strokeWidth={2.25} />
      </span>
      <span
        aria-hidden
        className={[
          "relative z-10 flex size-7 items-center justify-center rounded-full bg-surface text-foreground shadow-sm transition-transform duration-200 ease-out",
          isDark ? "translate-x-[1.35rem]" : "translate-x-0",
        ].join(" ")}
      >
        {isDark ? <Moon size={14} strokeWidth={2} /> : <Sun size={14} strokeWidth={2} />}
      </span>
    </button>
  );
}
