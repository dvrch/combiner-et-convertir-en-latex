import yaml from 'js-yaml';

let uiTexts = {};
let commands: any[] = [];

export async function loadUiTexts(app, plugin) {
    try {
        const basePath = plugin.manifest.dir;
        const yamlText = await app.vault.adapter.read(`${basePath}/src/locales/fr.yaml`);
        uiTexts = yaml.load(yamlText) || {};
    } catch (error) {
        uiTexts = {
            'splitview.original': 'Original',
            'splitview.combined': 'Combiné',
            'save_button': '💾 Sauvegarder le combiné',
            'save_success': 'Fichier sauvegardé sous :'
        };
    }
}

export function getUiTexts() {
    return { ...uiTexts };
}

export async function loadCommands(app, plugin) {
    try {
        const basePath = plugin.manifest.dir;
        const yamlText = await app.vault.adapter.read(`${basePath}/src/locales/commands.yaml`);
        commands = yaml.load(yamlText) || [];
    } catch (error) {
        commands = [];
    }
}

export function getCommands() {
    return [...commands];
} 