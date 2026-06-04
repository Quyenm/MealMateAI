import { redirect } from "next/navigation";

// Profile now lives as a tab inside Settings; keep the old path working.
export default function ProfilePage() {
  redirect("/settings");
}
