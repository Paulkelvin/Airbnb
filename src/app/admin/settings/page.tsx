import { getPlatformSettings } from "@/modules/admin/queries";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Platform Settings" };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Platform Settings
      </h2>
      <SettingsForm settings={settingsMap} />
    </div>
  );
}
