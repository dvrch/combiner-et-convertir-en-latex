# Conversion Markdown → LaTeX avec le plugin Obsidian

## Fonctionnalité
Ce plugin combine plusieurs fichiers Markdown (avec gestion récursive des liens Obsidian) puis convertit le résultat en un document LaTeX prêt à compiler.

## Utilisation

1. **Ouvrez** le fichier Markdown principal dans Obsidian.
2. **Cliquez** sur le bouton « Combiner et Convertir » dans l’interface du plugin.
3. Le plugin va :
   - Combiner tous les fichiers liés (embeds, inclusions, etc.)
   - Convertir le Markdown consolidé en LaTeX
   - Créer un fichier `.tex` dans le même dossier que le fichier source
   - Afficher un aperçu du code LaTeX généré

## Points forts
- Conversion des titres, listes, tableaux, code, math, liens, formatage…
- Support des blocs de code et des équations mathématiques
- Génération d’un en-tête LaTeX complet (packages, geometry, etc.)
- Conversion robuste et extensible

## Personnalisation
- Modifiez la configuration LaTeX dans `LatexConverter.svelte` pour changer la classe, les packages ou la géométrie du document.

## Exemple de flux
1. Créez ou ouvrez une note principale avec des inclusions Obsidian (`![[note2]]`, etc.)
2. Lancez la commande de combinaison/conversion
3. Récupérez le fichier `.tex` généré et compilez-le avec votre outil LaTeX favori (pdflatex, latexmk, etc.)

---

Pour toute extension ou adaptation, modifiez les fonctions de conversion dans `LatexConverter.svelte`.
