import { getPlatformSettings } from "@/modules/admin/queries";
import { SettingsForm } from "./SettingsForm";
import { AdminPageHeader } from "../AdminUI";

export const metadata = { title: "Platform Settings" };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div>
      <AdminPageHeader
        title="Platform Settings"
        description="Global configuration that affects every listing and booking."
      />
      <SettingsForm settings={settingsMap} />
    </div>
  );
}
