import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { businessQuery } from "@/lib/business-query";
import { activeSeasonalTheme, audienceCanSeeTheme, defaultSeasonalThemeSettings } from "@/lib/seasonal-theme";

function SeasonalDecorations({ themeId }: { themeId: string }) {
  if (themeId === "christmas") {
    return (
      <aside className="seasonal-decorations seasonal-snow" aria-hidden="true">
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
        <span className="snowflake">❆</span>
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
        <span className="snowflake">❆</span>
        <span className="snowflake">❄</span>
        <span className="snowflake">❅</span>
      </aside>
    );
  }

  if (themeId === "halloween") {
    return (
      <aside className="seasonal-decorations seasonal-spooky" aria-hidden="true">
        <div className="floating-ghost ghost-1">
          <svg viewBox="0 0 40 50" width="36" height="45">
            <path
              d="M 5 25 C 5 10, 35 10, 35 25 L 35 45 C 31 42, 27 47, 24 43 C 20 47, 16 42, 12 45 C 9 42, 5 45, 5 43 Z"
              fill="rgba(255,255,255,0.85)"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="1.5"
            />
            <circle cx="15" cy="22" r="3" fill="#1e1e1e" />
            <circle cx="25" cy="22" r="3" fill="#1e1e1e" />
            <ellipse cx="20" cy="30" rx="2.5" ry="4" fill="#1e1e1e" />
          </svg>
        </div>
        <div className="floating-ghost ghost-2">
          <svg viewBox="0 0 40 50" width="28" height="36">
            <path
              d="M 5 25 C 5 10, 35 10, 35 25 L 35 45 C 31 42, 27 47, 24 43 C 20 47, 16 42, 12 45 C 9 42, 5 45, 5 43 Z"
              fill="rgba(255,255,255,0.75)"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth="1.5"
            />
            <circle cx="15" cy="22" r="2.5" fill="#1e1e1e" />
            <circle cx="25" cy="22" r="2.5" fill="#1e1e1e" />
          </svg>
        </div>
        <div className="bat bat-1">🦇</div>
        <div className="bat bat-2">🦇</div>
      </aside>
    );
  }

  if (themeId === "valentine") {
    return (
      <aside className="seasonal-decorations seasonal-hearts" aria-hidden="true">
        <span className="heart heart-1">♥</span>
        <span className="heart heart-2">♥</span>
        <span className="heart heart-3">♥</span>
      </aside>
    );
  }

  return null;
}

export function SeasonalTheme() {
  const { data: config } = useSuspenseQuery(businessQuery);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const admin = useQuery({
    queryKey: ["seasonal-theme-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const result = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return result.data === true;
    },
  });

  const viewer = admin.data === true ? "admin" : "client";
  const settings = { ...defaultSeasonalThemeSettings, ...(config.seasonalTheme ?? {}) };
  const theme = activeSeasonalTheme(settings);

  useEffect(() => {
    document.documentElement.classList.remove(
      "season-new-year",
      "season-valentine",
      "season-spring",
      "season-easter",
      "season-summer",
      "season-back-to-school",
      "season-autumn",
      "season-halloween",
      "season-black-friday",
      "season-christmas",
    );

    if (theme && audienceCanSeeTheme(settings.audience, viewer)) {
      document.documentElement.classList.add(theme.className);
    }

    return () => {
      document.documentElement.classList.remove(
        "season-new-year",
        "season-valentine",
        "season-spring",
        "season-easter",
        "season-summer",
        "season-back-to-school",
        "season-autumn",
        "season-halloween",
        "season-black-friday",
        "season-christmas",
      );
    };
  }, [settings.audience, theme, viewer]);

  if (!theme || !audienceCanSeeTheme(settings.audience, viewer)) {
    return null;
  }

  return (
    <>
      <SeasonalDecorations themeId={theme.id} />
      <div className="seasonal-ribbon" role="status">
        <span aria-hidden="true" className="seasonal-ribbon-icon">
          {theme.id === "christmas"
            ? "🎅"
            : theme.id === "halloween"
              ? "🎃"
              : theme.id === "valentine"
                ? "🌹"
                : theme.id === "easter"
                  ? "🐰"
                  : "✦"}
        </span>
        <span>{theme.name}</span>
        <span className="seasonal-ribbon-text">{theme.description}</span>
      </div>
    </>
  );
}
