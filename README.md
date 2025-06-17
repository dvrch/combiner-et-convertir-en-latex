# Obsidian Markdown Combiner

Un plugin Obsidian qui combine le contenu d'un fichier Markdown avec ses fichiers liés (embarqués) de manière récursive.

## Fonctionnalités

- Combine le contenu d'un fichier Markdown avec ses liens embarqués (`![[note]]`)
- Supporte les liens vers des sections spécifiques (`![[note#section]]`)
- Supporte les liens vers des blocs spécifiques (`![[note^block-id]]`)
- Traitement récursif des liens (les liens dans les fichiers liés sont également traités)
- Interface utilisateur simple et intuitive

## Installation

1. Ouvrez les paramètres d'Obsidian
2. Allez dans "Modules complémentaires"
3. Désactivez le mode sans échec
4. Cliquez sur "Parcourir" et recherchez "Markdown Combiner"
5. Installez le plugin
6. Activez le plugin

## Utilisation

1. Ouvrez un fichier Markdown contenant des liens embarqués
2. Utilisez la commande "Combine Markdown Files with Embeds" via :
   - La palette de commandes (Ctrl/Cmd + P)
   - Le menu contextuel
3. Un nouveau fichier sera créé avec le suffixe "-combined" contenant le contenu combiné

## Développement

### Prérequis

- Node.js
- pnpm

### Installation des dépendances

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Développement

```bash
pnpm dev
```

## Structure du projet

```
.
├── src/
│   ├── components/         # Composants Svelte
│   │   └── MarkdownProcessor.svelte
│   ├── main.ts            # Point d'entrée du plugin
│   └── svelte.d.ts        # Déclarations TypeScript pour Svelte
├── manifest.json          # Configuration du plugin
├── package.json           # Dépendances et scripts
└── tsconfig.json          # Configuration TypeScript
```

## Licence

MIT
