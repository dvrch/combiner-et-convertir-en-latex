import yaml from 'js-yaml';

let uiTexts: Record<string, string> = {};

export function getUiTexts(): Record<string, string> {
  return { ...uiTexts };
}

export async function loadUiTexts(path = 'locales/fr.yaml') {
  try {
    const response = await fetch(path);
    const yamlText = await response.text();
    const data = yaml.load(yamlText) as Record<string, string>;
    uiTexts = { ...data };
  } catch (e) {
    uiTexts = { error: 'Erreur de chargement des textes UI.' };
  }
} 