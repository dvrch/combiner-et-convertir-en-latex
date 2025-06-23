import { writable } from 'svelte/store';
import yaml from 'js-yaml';

export const uiTexts = writable<Record<string, string>>({});

export async function loadUiTexts(path = 'locales/fr.yaml') {
  try {
    const response = await fetch(path);
    const yamlText = await response.text();
    const data = yaml.load(yamlText) as Record<string, string>;
    uiTexts.set(data);
  } catch (e) {
    uiTexts.set({ error: 'Erreur de chargement des textes UI.' });
  }
} 