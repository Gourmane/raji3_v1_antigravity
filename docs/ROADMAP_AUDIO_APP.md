# Roadmap Audio App - rajiaa

## Objectif

Faire évoluer `rajiaa` d'une PWA audio client-only prototype vers une application audio mobile-first plus stable, performante et maintenable, sans backend, sans React et sans réécriture inutile.

## Diagnostic court

- L'application actuelle est une PWA statique en HTML/CSS/JS Vanilla avec import audio, loop, extraction WAV/MP3, bibliothèque locale et fusion.
- Toute la logique est concentrée dans `app.js`, ce qui rend les changements risqués si les phases ne sont pas isolées.
- Les workflows principaux existent, mais l'extraction/fusion n'ont pas assez de `finally`, validation, messages d'erreur actionnables ou états de progression.
- La persistance utilise encore des DataURL base64, acceptable pour petits fichiers mais non adaptée aux audios longs.
- L'accessibilité mobile doit être renforcée : zoom, focus visible, toasts, modale, actions clavier.

## Principes de livraison

- Exécuter une seule phase à la fois.
- Ne pas casser les fonctionnalités existantes.
- Garder les changements petits et vérifiables.
- Stabiliser avant d'optimiser.
- Déplacer les traitements lourds seulement dans les phases prévues.
- Ajouter des tests manuels vérifiables à chaque phase.

## Phase 1 - Stabilisation des workflows existants

### Objectif

Fiabiliser les workflows actuels sans changer le modèle de stockage ni ajouter la waveform.

### Tâches

- Ajouter des validations centralisées pour les loops :
  - start/end valides.
  - fin après début.
  - durée minimale 0.3 seconde.
  - fin limitée à la durée audio.
- Ajouter `try/catch/finally` sur extraction, sauvegarde d'extrait, fusion, téléchargement MP3 et sauvegardes.
- Restaurer systématiquement les boutons et labels après erreur.
- Fermer `AudioContext` dans les chemins d'erreur.
- Afficher des erreurs claires et actionnables :
  - format non supporté.
  - fichier trop lourd.
  - durée longue.
  - loop invalide.
  - loop trop courte.
  - stockage plein.
  - export en cours/réussi.
- Corriger les bugs save/download :
  - attendre correctement `FileReader`.
  - respecter le format choisi pour sauvegarder un extrait.
  - ajouter un bouton télécharger dans la bibliothèque.
- Réduire les handlers inline de la bibliothèque via event delegation.
- Corriger les évidences d'accessibilité :
  - ne plus bloquer le zoom mobile.
  - focus visible sur boutons, nav, inputs, selects.
  - toasts avec `role="status"` ou `role="alert"`.
  - modale renommage avec `role="dialog"`, `aria-modal`, Escape.

### Fichiers ciblés

- `index.html`
- `style.css`
- `app.js`

### Critères d'acceptation

- Importer un fichier audio valide fonctionne encore.
- Un fichier non audio affiche une erreur claire.
- Un fichier volumineux affiche un warning ou une erreur selon seuil.
- Loop invalide et loop trop courte sont refusées.
- Extraire WAV/MP3 restaure toujours le bouton.
- Sauvegarder une loop respecte le format choisi.
- La bibliothèque permet écouter, télécharger, renommer et supprimer.
- La fusion restaure toujours le bouton après succès ou erreur.
- Le zoom mobile n'est plus bloqué.
- La modale peut être fermée par Escape.

## Phase 2 - Stockage performant

### Objectif

Remplacer progressivement le stockage DataURL par un stockage Blob IndexedDB compatible audios longs.

### Tâches

- Introduire un schéma IndexedDB versionné avec stores séparés :
  - `audioMetadata`
  - `audioBlobs`
- Stocker les fichiers audio en `Blob`.
- Garder les métadonnées séparées : nom, type, durée, taille, format, date, source.
- Charger les métadonnées au démarrage.
- Lazy-load des Blobs seulement au moment de lire, exporter ou fusionner.
- Prévoir migration depuis anciens `dataURL`.
- Garder un fallback propre si IndexedDB échoue.
- Ajouter gestion stockage plein.

### Fichiers ciblés

- `app.js`
- éventuellement nouveaux modules JS si découpage minimal accepté.

### Critères d'acceptation

- Les anciens audios sauvegardés restent utilisables si possible.
- Les nouveaux audios ne sont plus stockés en DataURL.
- La bibliothèque s'affiche sans charger tous les fichiers audio en mémoire.
- Les erreurs IndexedDB sont compréhensibles pour l'utilisateur.

## Phase 3 - Waveform / wave bar

### Objectif

Ajouter une waveform interactive performante, indépendante de la position de lecture.

### Tâches

- Dessiner une waveform légère sur canvas.
- Générer des peaks avec décodage contrôlé.
- Afficher durée, current time, loop start et loop end.
- Clic sur waveform = changer `currentTime` uniquement.
- Région sélectionnée = loopStart/loopEnd uniquement.
- Ne jamais modifier la sélection quand l'utilisateur déplace seulement la lecture.
- Ajouter états loading waveform.

### Fichiers ciblés

- `index.html`
- `style.css`
- `app.js`
- potentiel worker/utility dédié en phase suivante si nécessaire.

### Critères d'acceptation

- La waveform s'affiche sur audio court et moyen.
- Le clic change la lecture sans changer la loop.
- La sélection loop reste stable pendant la lecture.
- L'UI reste utilisable sur mobile.

## Phase 4 - Loop UX avancée

### Objectif

Rendre la sélection loop plus précise et confortable.

### Tâches

- Ajouter handles drag start/end.
- Bouton loop ON/OFF.
- Bouton go to loop start.
- Bouton clear loop.
- Validation en temps réel.
- Option lock/unlock de la sélection.
- Préserver la sélection quand la position de lecture change.

### Critères d'acceptation

- Les handles modifient seulement start/end.
- La lecture peut partir d'un autre point sans perdre la loop.
- Les valeurs start/end visibles restent synchronisées.

## Phase 5 - Export loop performant

### Objectif

Exporter et sauvegarder les loops avec progression et sans bloquer l'interface.

### Tâches

- Créer Web Worker pour extraction/export WAV.
- Ajouter MP3 worker si compatible avec `lamejs`.
- Progress bar pour export.
- Message “Export de la boucle... ne ferme pas l'application.”
- Téléchargement loop sélectionnée.
- Sauvegarde loop sélectionnée dans bibliothèque.
- Annulation si possible.
- Limites raisonnables pour audio long.

### Critères d'acceptation

- Export WAV/MP3 fonctionne pour petit et moyen audio.
- UI reste responsive pendant export.
- Progression affichée.
- Erreur claire si l'appareil ne peut pas traiter le fichier.

## Phase 6 - UI/UX premium

### Objectif

Améliorer la qualité perçue, les états et la bibliothèque sans casser les workflows.

### Tâches

- Empty states orientés action.
- Loading states cohérents.
- Error states actionnables.
- Toasts accessibles.
- Modale accessible complète.
- Design system boutons/cards/forms.
- Bibliothèque enrichie :
  - durée.
  - taille.
  - date.
  - type.
  - download.
  - rename.
  - delete.
- Recherche et tri simple.
- QA mobile-first.

### Critères d'acceptation

- L'app paraît plus professionnelle sans sacrifier la simplicité.
- Les actions principales restent accessibles en un ou deux gestes.
- Les états vide/erreur/chargement guident l'utilisateur.

## Phase 7 - Tests, nettoyage et documentation

### Objectif

Finaliser la maintenabilité et la confiance de livraison.

### Tâches

- Tests manuels documentés :
  - audio court.
  - audio moyen.
  - audio long.
  - offline/PWA.
  - clavier.
  - mobile.
- Documentation utilisateur.
- Documentation technique.
- Nettoyage code mort.
- Vérification PWA/offline.
- Contrôle performance navigateur.
- Ajouter lint/format si outillage accepté.

### Critères d'acceptation

- Un autre développeur peut comprendre et tester le projet.
- Les workflows critiques sont documentés.
- Les limites connues sont explicites.

## Ordre recommandé

1. Phase 1 - Stabilisation.
2. Phase 2 - Stockage performant.
3. Phase 3 - Waveform.
4. Phase 4 - Loop UX avancée.
5. Phase 5 - Export performant.
6. Phase 6 - UI/UX premium.
7. Phase 7 - Tests et documentation.
