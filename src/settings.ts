// ARCHIVÉ : Les paramètres sont désormais gérés dans src/stores/settings.store.ts (store Svelte)

export interface PluginSettings {
    useHiddenEmbeds: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    useHiddenEmbeds: true,
}; 