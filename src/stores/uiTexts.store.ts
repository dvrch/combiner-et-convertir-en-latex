import yaml from 'js-yaml';

let uiTexts: Record<string, string> = {};
let commands: any[] = [];

export function getUiTexts(): Record<string, string> {
  return { ...uiTexts };
}

export function getCommands(): any[] {
  return [...commands];
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

export async function loadCommands(path = 'locales/commands.yaml') {
  try {
    const response = await fetch(path);
    const yamlText = await response.text();
    const data = yaml.load(yamlText) as any[];
    commands = data || [];
  } catch (e) {
    commands = [];
  }
} 