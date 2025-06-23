// Store simplifié sans réactivité Svelte
export interface Settings {
  useHiddenEmbeds: boolean;
}

let settings: Settings = {
  useHiddenEmbeds: true,
};

export function getSettings(): Settings {
  return { ...settings };
}

export function setSetting(key: string, value: any) {
  settings = { ...settings, [key]: value };
}

export async function loadSettingsFromPlugin(plugin: any) {
  const data = await plugin.loadData();
  if (data) settings = { ...settings, ...data };
}

export async function saveSettingsToPlugin(plugin: any) {
  await plugin.saveData(settings);
} 