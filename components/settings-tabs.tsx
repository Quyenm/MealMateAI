"use client";

import { useState } from "react";
import { useT } from "@/components/landing/i18n";
import { ProfileView } from "@/components/profile-view";
import { SettingsForm } from "@/components/settings-form";
import { AccountView } from "@/components/account-view";

type Prefs = {
  dietary_pref: "none" | "keto" | "eat_clean" | "muscle_gain";
  cook_time_pref: "5min" | "15min" | "30min_plus";
  spice_pref: "mild" | "medium" | "hot";
  allergies: string[];
  never_suggest: string[];
};
type ProfileProps = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tier: string;
  memberSince: string;
  stats: { scans: number; saved: number; posts: number };
};

export function SettingsTabs({ profile, prefs }: { profile: ProfileProps; prefs: Prefs }) {
  const t = useT();
  const [tab, setTab] = useState<"profile" | "taste" | "account">("profile");

  const tabs = [
    { key: "profile", label: t.account.tabProfile },
    { key: "taste", label: t.account.tabTaste },
    { key: "account", label: t.account.tabAccount },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-full bg-muted p-1">
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tab === x.key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileView {...profile} />}
      {tab === "taste" && <SettingsForm initial={prefs} />}
      {tab === "account" && <AccountView email={profile.email} />}
    </div>
  );
}
