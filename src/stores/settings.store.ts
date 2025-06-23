import { writable, get } from 'svelte/store';

export const settings = writable({
  useHiddenEmbeds: true,
});

export function setSetting(key: string, value: any) {
  settings.update(s => ({ ...s, [key]: value }));
}

export async function loadSettingsFromPlugin(plugin: any) {
  const data = await plugin.loadData();
  if (data) settings.set(data);
}

export async function saveSettingsToPlugin(plugin: any) {
  await plugin.saveData(get(settings));
} 