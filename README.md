# Obsidian Markdown Combiner

Un plugin Obsidian qui combine le contenu d'un fichier Markdown avec ses fichiers liés (embarqués) de manière récursive.

## Fonctionnalités

- Combine le contenu d'un fichier Markdown avec ses liens embarqués (`![[note]]`)
- Supporte les liens vers des sections spécifiques (`![[note#section]]`)
- Supporte les liens vers des blocs spécifiques (`![[note^block-id]]`)
- Traitement récursif des liens (les liens dans les fichiers liés sont également traités)
- Génération automatique de noms de fichiers uniques (ajout de numéros si nécessaire)
- Ouverture automatique du fichier combiné dans un nouveau volet

## Installation

### Installation manuelle (développement)

1. Clonez ce repository dans votre dossier de plugins Obsidian :
   ```
   .obsidian/plugins/combiner et convertir en latex/
   ```

2. Installez les dépendances :
   ```bash
   pnpm install
   ```

3. Compilez le plugin :
   ```bash
   pnpm build
   ```

4. Redémarrez Obsidian et activez le plugin dans les paramètres

### Installation depuis la communauté (à venir)

1. Ouvrez les paramètres d'Obsidian
2. Allez dans "Modules complémentaires"
3. Désactivez le mode sans échec
4. Cliquez sur "Parcourir" et recherchez "Markdown Combiner"
5. Installez le plugin
6. Activez le plugin

## Utilisation

1. **Ouvrez un fichier Markdown** contenant des liens embarqués (par exemple : `![[Note B]]`)

2. **Lancez la commande** de l'une de ces façons :
   - **Palette de commandes** : `Ctrl/Cmd + P` puis tapez "Combiner les fichiers Markdown avec les embeds"
   - **Raccourci clavier** : Le raccourci sera configurable dans les paramètres du plugin

3. **Résultat** :
   - Un nouveau fichier sera créé avec le suffixe `-combined` (ex: `Note A-combined.md`)
   - Si un fichier avec ce nom existe déjà, un numéro sera ajouté (ex: `Note A-combined-1.md`)
   - Le fichier combiné s'ouvrira automatiquement dans un nouveau volet à droite

## Exemples d'utilisation

### Liens simples
```markdown
# Note principale
Voici le contenu principal.

![[Note B]]
```

### Liens vers des sections
```markdown
# Note principale
Voici le contenu principal.

![[Note B#Section spécifique]]
```

### Liens vers des blocs
```markdown
# Note principale
Voici le contenu principal.

![[Note B^block-id]]
```

## Développement

### Prérequis

- Node.js (version 18+)
- pnpm

### Installation des dépendances

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Développement avec rechargement automatique

```bash
pnpm dev
```

### Vérification TypeScript

```bash
pnpm svelte-check
```

## Structure du projet

```
.
├── src/
│   ├── components/
│   │   └── CombinerApp.svelte    # Composant principal avec logique de combinaison
│   ├── main.ts                   # Point d'entrée du plugin
│   └── svelte.d.ts              # Déclarations TypeScript pour Svelte
├── manifest.json                 # Configuration du plugin Obsidian
├── package.json                  # Dépendances et scripts
├── esbuild.config.mjs           # Configuration de build
└── tsconfig.json                # Configuration TypeScript
```

## Technologies utilisées

- **Svelte 4** : Interface utilisateur et logique métier
- **TypeScript** : Typage statique
- **esbuild** : Build et bundling
- **pnpm** : Gestionnaire de paquets

## Licence

MIT
