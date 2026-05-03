# PROJECT ANALYSIS PRD - rajiaa Audio Loop & Fusion

## 1. Vue générale du projet

| Élément | Analyse |
|---|---|
| Nom détecté | `rajiaa` / `rajiaa - Audio Loop & Fusion` |
| Type de projet | Application web statique mobile-first, installable comme PWA |
| Domaine | Audio, utilitaire créatif, édition audio légère |
| Objectif principal | Importer un fichier audio, définir une boucle, extraire une portion, enregistrer des audios dans une bibliothèque locale et fusionner deux audios |
| Problème résolu | Permettre à un utilisateur de manipuler rapidement des extraits audio sans backend, sans compte et directement dans le navigateur |
| Utilisateurs ciblés | Créateurs audio, musiciens, étudiants, utilisateurs mobiles voulant découper/fusionner des audios. À confirmer |
| État général | Prototype fonctionnel avancé côté client, mais sans architecture modulaire, sans tests, avec limites de performance, accessibilité et robustesse |

### Résumé simple du fonctionnement

L'utilisateur ouvre `index.html`, importe un fichier audio via un input fichier, lit l'audio dans un lecteur HTML natif, définit un début et une fin de loop, active/désactive la boucle, extrait la portion en WAV ou MP3, ou sauvegarde l'audio dans une bibliothèque locale. Les audios sauvegardés sont stockés dans IndexedDB quand disponible, avec fallback localStorage. Une section Fusion permet de sélectionner deux audios sauvegardés, de les concaténer, puis de télécharger ou sauvegarder le résultat. Une section Paramètres existe mais reste placeholder.

## 2. Stack technique

| Couche | Technologie détectée |
|---|---|
| Frontend | HTML5, CSS3, JavaScript Vanilla |
| Backend | Aucun backend détecté |
| Base de données | IndexedDB navigateur (`rajiaaAudioDB`) + fallback localStorage |
| Build tool | Aucun outil de build détecté |
| Framework | Aucun framework détecté |
| Authentification | Aucun système d'authentification détecté |
| Autorisation/rôles | Aucun système de rôles détecté |
| PWA | `manifest.json`, `sw.js`, service worker, icons |
| Audio | HTMLAudioElement, Web Audio API (`AudioContext`, `decodeAudioData`, `AudioBuffer`) |
| Encodage MP3 | `vendor/lame.min.js` via `lamejs.Mp3Encoder` |
| Encodage WAV | Fonction custom `bufferToWave()` dans `app.js` |
| Services externes | Google Fonts pour Inter |
| Versions détectées | Version application affichée : `1.0.0`; commentaire JS : `Full Application Logic v2.0`; cache service worker : `rajiaa-cache-v3` |

### Dépendances principales

| Fichier | Rôle |
|---|---|
| `vendor/lame.min.js` | Librairie locale minifiée pour encoder du MP3 côté navigateur |
| Google Fonts | Chargement externe de la police Inter |
| APIs navigateur | IndexedDB, localStorage, FileReader, Blob, URL.createObjectURL, AudioContext, Cache API, Service Worker |

### Points à confirmer

- Source exacte de `vendor/lame.min.js`.
- Licence de `lamejs`.
- Navigateurs cibles.
- Besoin réel du mode offline PWA.
- Taille maximale audio attendue.

## 3. Structure du projet

```text
raji3_v1_antigravity/
├── app.js
├── index.html
├── style.css
├── sw.js
├── manifest.json
├── vendor/
│   └── lame.min.js
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

| Dossier/fichier | Rôle |
|---|---|
| `index.html` | Structure HTML complète de l'application : écrans Loop, Fusion, Paramètres, navigation basse, modale de renommage, chargement scripts/CSS, enregistrement service worker |
| `style.css` | Design system CSS simple, layout mobile-first, cartes, boutons, modales, navigation, responsive |
| `app.js` | Toute la logique métier et UI : state global, DOM refs, stockage, import audio, loop, extraction, bibliothèque, fusion, conversion WAV/MP3, événements |
| `sw.js` | Service worker PWA avec cache statique et stratégie network-first |
| `manifest.json` | Métadonnées PWA : nom, scope, start URL, thème, orientation, icônes |
| `vendor/` | Dépendance tierce locale pour MP3 |
| `icons/` | Icônes PWA déclarées dans le manifest et le HTML |

### Éléments non détectés

| Élément | Statut |
|---|---|
| `package.json` | Non détecté |
| Backend/routes serveur | Non détecté |
| Controllers | Non détecté |
| Models serveur | Non détecté |
| Views côté serveur | Non détecté |
| Migrations/seeders | Non détectés |
| Tests | Non détectés |
| CI/CD | Non détecté |
| Configuration lint/format | Non détectée |

## 4. Fonctionnalités existantes

### Synthèse

| Fonctionnalité | Niveau | Fichiers principaux |
|---|---|---|
| Import audio | Partiel à complet | `index.html`, `app.js` |
| Lecture audio | Complet | `index.html`, `app.js` |
| Définition d'un loop | Partiel | `index.html`, `app.js` |
| Lecture en boucle | Partiel | `app.js` |
| Extraction loop WAV/MP3 | Partiel | `app.js`, `vendor/lame.min.js` |
| Sauvegarde audio importé | Partiel | `app.js` |
| Bibliothèque locale | Partiel | `app.js`, IndexedDB/localStorage |
| Lecture depuis bibliothèque | Partiel | `app.js` |
| Renommage | Complet basique | `index.html`, `app.js` |
| Suppression | Complet basique | `app.js` |
| Fusion A+B | Partiel | `index.html`, `app.js` |
| Téléchargement fusion | Partiel | `app.js` |
| Sauvegarde fusion | Partiel | `app.js` |
| PWA/offline | Partiel | `manifest.json`, `sw.js` |
| Paramètres | Placeholder | `index.html` |

### Détail des fonctionnalités

#### Import audio

| Champ | Analyse |
|---|---|
| Description | L'utilisateur choisit un fichier `audio/*`; le fichier est lu en DataURL via FileReader et chargé dans `<audio>` |
| Fichiers concernés | `index.html`, `app.js` |
| Routes/écrans concernés | Écran interne `loop` |
| Modèles concernés | Objet audio local avec `id`, `nom`, `type`, `dataURL`, `dateCreation`, `loopStart`, `loopEnd` |
| Niveau | Partiel à complet |
| Problèmes | Pas de validation MIME réelle, pas de limite bloquante, stockage en DataURL coûteux, message d'avertissement seulement au-delà de 5 Mo |

#### Lecture audio et loop

| Champ | Analyse |
|---|---|
| Description | Lecture via `<audio controls>`, affichage durée, boucle manuelle via `timeupdate` et reset de `currentTime` |
| Fichiers concernés | `index.html`, `app.js` |
| Routes/écrans concernés | Écran `loop` |
| Niveau | Partiel |
| Problèmes | Loop dépend de `timeupdate` donc précision limitée; pas de validation stricte `mm:ss`; si la tab est ralentie, la boucle peut être imprécise |

#### Extraction loop

| Champ | Analyse |
|---|---|
| Description | Décodage de l'audio avec Web Audio API, copie des samples entre start/end, export WAV ou MP3 |
| Fichiers concernés | `app.js`, `vendor/lame.min.js` |
| Routes/écrans concernés | Écran `loop` |
| Niveau | Partiel |
| Problèmes | Traitement synchrone lourd sur thread principal; pas de progress bar; retour anticipé possible laissant le bouton désactivé; la sauvegarde d'extrait recrée toujours un WAV si aucun extrait n'est déjà en mémoire |

#### Bibliothèque locale

| Champ | Analyse |
|---|---|
| Description | Liste des audios sauvegardés, compteur, lecture, renommage, suppression |
| Fichiers concernés | `app.js`, `index.html` |
| Routes/écrans concernés | Écran `loop`, écran `fusion` via selects |
| Niveau | Partiel |
| Problèmes | Tous les audios sont chargés en mémoire; aucune pagination; métadonnées limitées; pas de durée/taille affichée; fonction `downloadAudio()` existe mais aucun bouton ne l'appelle dans la bibliothèque |

#### Fusion audio

| Champ | Analyse |
|---|---|
| Description | Sélection de deux audios sauvegardés, décodage, concaténation des buffers, export WAV et conversion MP3 optionnelle |
| Fichiers concernés | `app.js`, `index.html` |
| Routes/écrans concernés | Écran `fusion` |
| Niveau | Partiel |
| Problèmes | Fusion par concaténation uniquement; pas de crossfade; pas de normalisation; risque si les sample rates diffèrent; gros coût mémoire; pas de blocage contre sélectionner le même audio deux fois |

#### PWA/offline

| Champ | Analyse |
|---|---|
| Description | Manifest + service worker qui pré-cache les fichiers statiques et sert le cache en fallback |
| Fichiers concernés | `manifest.json`, `sw.js`, `index.html` |
| Routes/écrans concernés | Toutes les ressources statiques |
| Niveau | Partiel |
| Problèmes | Pas d'UI de mise à jour; les polices Google ne sont pas mises en cache; icônes déclarées avec tailles différentes mais fichiers réels en 800x800 |

## 5. Rôles utilisateurs et permissions

Aucun système de rôles détecté.

| Aspect | Analyse |
|---|---|
| Authentification | Absente |
| Rôles | Aucun |
| Permissions | Aucune permission applicative; seulement permissions navigateur implicites pour fichiers locaux et stockage |
| Routes protégées | Aucune |
| Données privées | Audios stockés localement dans le navigateur |
| Risques | Toute personne ayant accès au profil navigateur/appareil peut accéder aux audios sauvegardés; pas de chiffrement local |

## 6. Analyse de la base de données

Il n'y a pas de base de données serveur. Le projet utilise une persistance locale navigateur.

### IndexedDB

| Élément | Valeur |
|---|---|
| Nom DB | `rajiaaAudioDB` |
| Version | `1` |
| Object store | `audios` |
| Clé primaire | `id` (`keyPath: 'id'`) |
| Index | Aucun index détecté |
| Migrations | `onupgradeneeded` crée seulement l'object store |

### localStorage

| Clé | Utilisation |
|---|---|
| `audioLooper_saved` | Sauvegarde complète de la bibliothèque quand IndexedDB n'est pas utilisé |
| `audioLooper_saved_meta` | Backup metadata sans `dataURL` quand IndexedDB est utilisé |

### Modèle logique `AudioItem`

| Champ | Type attendu | Description | Remarques |
|---|---|---|---|
| `id` | string | Identifiant généré par timestamp + random | Pas cryptographiquement sûr, suffisant pour usage local |
| `nom` | string | Nom affiché | Échappé à l'affichage dans la bibliothèque/selects |
| `type` | string | `import` ou `fusion` | Pas validé avant rendu |
| `dataURL` | string | Audio complet encodé en base64 DataURL | Très coûteux en stockage/mémoire |
| `dateCreation` | ISO string | Date de création | Non affichée dans l'UI |
| `loopStart` | number | Début loop en secondes | Utilisé lors de lecture bibliothèque |
| `loopEnd` | number | Fin loop en secondes | Peut être `0` ou absent |

### Relations

Aucune relation relationnelle. Les fusions stockent seulement un nouveau DataURL final; elles ne conservent pas de relation vers les sources A/B.

### Incohérences possibles

| Problème | Impact |
|---|---|
| Pas d'index IndexedDB | Difficile d'ajouter tri/recherche par date/type sans migration |
| Pas de schéma explicite/versionné | Les futures évolutions risquent de casser les anciens audios |
| Pas de stockage Blob natif | DataURL augmente la taille mémoire et stockage d'environ 33% |
| Pas de metadata audio riche | Impossible d'afficher durée, format, taille, sample rate sans redécoder |
| Pas de relation fusion-source | Impossible d'auditer ou rééditer une fusion |

## 7. Analyse des routes/API

Le projet ne contient aucune route backend ni API HTTP applicative. Les seules "routes" sont des fichiers statiques et des écrans internes pilotés par JavaScript.

### Routes web statiques si servi par un serveur HTTP

| Méthode | URL | Fichier/action | Middleware | Rôle attendu | Description | Entrée | Réponse |
|---|---|---|---|---|---|---|---|
| GET | `/` ou `./` | `index.html` | Aucun | Public | Charge l'application | Aucune | HTML |
| GET | `/index.html` | `index.html` | Aucun | Public | Application principale | Aucune | HTML |
| GET | `/style.css` | `style.css` | Aucun | Public | Styles | Aucune | CSS |
| GET | `/app.js` | `app.js` | Aucun | Public | Logique applicative | Aucune | JS |
| GET | `/manifest.json` | `manifest.json` | Aucun | Public | Manifest PWA | Aucune | JSON |
| GET | `/sw.js` | `sw.js` | Aucun | Public | Service worker | Aucune | JS |
| GET | `/vendor/lame.min.js` | Librairie MP3 | Aucun | Public | Encodeur MP3 | Aucune | JS |
| GET | `/icons/*.png` | Icônes | Aucun | Public | Assets PWA | Aucune | PNG |

### Écrans internes

| Écran | Identifiant | Déclencheur | Description |
|---|---|---|---|
| Loop | `screen-loop` | Bouton nav `data-screen="loop"` | Import, lecture, loop, extraction, bibliothèque |
| Fusion | `screen-fusion` | Bouton nav `data-screen="fusion"` | Sélection A/B, fusion, résultat, sauvegarde/téléchargement |
| Paramètres | `screen-settings` | Bouton nav `data-screen="settings"` | Placeholder options et à propos |

### Routes protégées/admin/API

| Catégorie | Statut |
|---|---|
| Routes publiques | Tous les fichiers statiques |
| Routes protégées | Aucune |
| Routes admin | Aucune |
| Routes utilisateur | Aucune route serveur; écrans internes seulement |
| Routes API | Aucune |

## 8. Analyse UI/UX

### Style global

L'interface est mobile-first, centrée dans un conteneur maximum de 540px, avec fond noir, cartes gris foncé, accent vert néon, boutons arrondis, navigation basse fixe et composants compacts. Le produit ressemble à une mini-app mobile PWA.

### Points positifs

| Point | Pourquoi c'est utile |
|---|---|
| Navigation basse simple | Adaptée à une expérience mobile et à trois sections seulement |
| Actions principales visibles | Import, loop, sauvegarde, fusion sont accessibles rapidement |
| Design tokens CSS | Variables `:root` pour couleurs, espacements, radius, transitions |
| Feedback toast | Confirme les actions principales |
| Responsive basique | Breakpoints à 540px et 360px |

### Problèmes UI/UX détectés

| Problème | Gravité | Fichiers | Impact |
|---|---|---|---|
| `maximum-scale=1.0, user-scalable=no` | Élevée | `index.html` | Empêche le zoom utilisateur, problème accessibilité mobile |
| Focus clavier insuffisant sur boutons/nav/radios | Élevée | `style.css`, `index.html` | Utilisation clavier difficile; non conforme accessibilité |
| Radios cachés avec `display: none` | Moyenne | `style.css` | Les options WAV/MP3 peuvent être moins accessibles au clavier/lecteurs d'écran |
| Empty states faibles | Moyenne | `index.html`, `app.js` | La bibliothèque vide n'oriente pas l'utilisateur vers l'import |
| Loading states insuffisants | Moyenne | `app.js` | Extraction/fusion peuvent bloquer sans progression ni annulation |
| Erreurs trop génériques | Moyenne | `app.js` | L'utilisateur ne sait pas comment corriger un fichier non supporté ou trop lourd |
| Section Paramètres placeholder | Faible à moyenne | `index.html` | Donne l'impression d'une fonctionnalité incomplète |
| Palette très "dark + néon" | Faible à moyenne | `style.css` | Peut sembler générique; à valider avec le positionnement produit |
| Interface très card-based | Faible | `index.html`, `style.css` | Hiérarchie visuelle répétitive; peu de différenciation entre tâches |

### Accessibilité

| Aspect | État |
|---|---|
| Labels de formulaire | Présents pour les champs principaux |
| Landmarks | `header`, `main`, `nav` présents |
| Contraste | Globalement fort, à vérifier précisément pour textes secondaires |
| Focus visible | Présent surtout sur inputs/selects, faible sur boutons |
| Zoom | Bloqué sur mobile, problème important |
| Réduction animations | Aucun `prefers-reduced-motion` détecté |
| ARIA live pour toasts | Absent |
| Modale | Pas de focus trap, pas d'ARIA dialog, pas de fermeture Escape |

### Axes d'amélioration UI/UX

| Axe | Recommandation |
|---|---|
| Design system | Formaliser boutons, inputs, badges, modales, toasts, états disabled/loading/error |
| Layout | Réduire la dépendance aux cartes, améliorer hiérarchie par sections et actions principales |
| Navbar | Ajouter focus states, labels plus robustes, état actif accessible |
| Dashboard/bibliothèque | Ajouter durée, date, taille, type, bouton téléchargement, tri/recherche |
| Tables/listes | Passer à une liste plus informative avec actions visibles progressivement |
| Forms | Valider les temps en temps réel, afficher messages inline |
| Feedback | Ajouter progress indicators, états busy, erreurs spécifiques, succès avec next step |
| Loading states | Pour extraction/fusion/MP3, ajouter progression et désactivation cohérente |
| Empty states | Expliquer quoi faire ensuite, avec CTA import audio |
| Error states | Messages actionnables : format non supporté, fichier trop lourd, stockage plein |
| Mobile | Réactiver zoom, vérifier touch targets, gérer petits écrans et clavier virtuel |

## 9. Analyse performance

| Problème | Gravité | Fichiers concernés | Impact | Suggestion |
|---|---|---|---|---|
| Encodage/décodage audio sur thread principal | Élevée | `app.js` | UI bloquée pendant extraction, fusion et conversion MP3 | Déplacer traitement audio dans Web Worker; ajouter progress/cancel |
| Stockage en DataURL base64 | Élevée | `app.js` | Surcoût stockage/mémoire, limites rapides localStorage/IndexedDB | Stocker des `Blob` dans IndexedDB et metadata séparée |
| Chargement complet de la bibliothèque avec `getAll()` | Moyenne | `app.js` | Tous les audios chargés en mémoire au démarrage | Charger metadata d'abord; lazy-load les blobs |
| Fusion crée un buffer complet A+B | Élevée | `app.js` | Gros pic mémoire pour longs fichiers | Stream/chunk quand possible; imposer taille/durée max |
| Conversion MP3 crée tableaux Int16 complets | Moyenne à élevée | `app.js` | Mémoire proportionnelle à durée audio | Encoder par chunks depuis AudioBuffer, worker |
| Icônes PWA déclarées multiples mais réelles 800x800 | Moyenne | `icons/`, `manifest.json` | Téléchargement/cache inutilement lourd pour petites icônes | Générer de vraies tailles 72/96/128/144/152/192/384/512 |
| Pas de pagination/tri bibliothèque | Moyenne | `app.js` | Liste lente si beaucoup d'items | Pagination, virtualisation légère ou limite affichage |
| Pas de cache versioning automatisé | Faible à moyenne | `sw.js` | Risque d'anciens assets en cache après changement | Stratégie de versioning build-time ou update prompt |
| Google Fonts externe | Faible | `index.html` | Dépendance réseau; offline incomplet | Self-host font ou fallback assumé |
| Un seul fichier JS de 1074 lignes | Moyenne | `app.js` | Maintenance et bundling difficiles | Modulariser par domaines : storage/audio/ui/fusion/pwa |

## 10. Analyse sécurité

### Synthèse

Le périmètre sécurité est celui d'une application client-only. Il n'y a pas de serveur, donc pas de SQL injection, CSRF serveur ou gestion session. Les risques principaux sont XSS côté client, stockage local non chiffré, dépendances externes et absence de politique CSP.

| Risque | Gravité | Description | Fichiers concernés | Recommandation |
|---|---|---|---|---|
| Absence de CSP | Moyenne | Scripts inline et handlers inline empêchent une CSP stricte | `index.html`, `app.js` | Déplacer scripts inline, supprimer `onclick`, ajouter CSP adaptée |
| Handlers inline dans `innerHTML` | Moyenne | La bibliothèque génère des boutons avec `onclick` | `app.js` | Utiliser event delegation avec `addEventListener` |
| Données IndexedDB/localStorage non chiffrées | Moyenne | Les audios sauvegardés restent accessibles dans le profil navigateur | `app.js` | Ajouter avertissement confidentialité; option purge; chiffrement local si besoin |
| Validation fichier insuffisante | Moyenne | `accept="audio/*"` n'est pas une validation fiable | `index.html`, `app.js` | Vérifier MIME, extension, taille, durée après décodage |
| Pas de limite dure de taille/durée | Moyenne | Risque freeze navigateur par fichier énorme | `app.js` | Refuser au-delà d'un seuil configurable |
| Dépendance vendored non documentée | Moyenne | Source/licence/intégrité de `lame.min.js` inconnue | `vendor/lame.min.js` | Documenter provenance, version, licence, hash |
| Google Fonts externe | Faible | Requête externe et dépendance réseau | `index.html` | Self-host ou accepter explicitement |
| Pas de SRI | Faible | Pour assets externes, pas d'intégrité | `index.html` | Ajouter SRI si CDN; ici surtout Google Fonts difficile |
| XSS via storage modifié manuellement | Faible à moyenne | `nom` est échappé, mais `id`/`type` ne sont pas validés avant injection HTML | `app.js` | Valider/sanitizer tous les champs chargés depuis storage |
| Suppression irréversible | Faible | `confirm()` natif seulement, pas d'undo | `app.js` | Ajouter corbeille/undo temporaire |

### Contrôles existants

| Contrôle | État |
|---|---|
| Échappement nom audio | Présent via `escapeHtml()` |
| CSRF | Non applicable |
| SQL injection | Non applicable |
| Auth/session/token | Non applicable |
| HTTPS | Nécessaire pour service worker hors localhost, non contrôlé par le code |

## 11. Qualité du code

### Points solides

| Point | Analyse |
|---|---|
| Code lisible | Fonctions nommées clairement, sections commentées |
| State centralisé | `state` regroupe les données courantes |
| DOM refs centralisées | `initDOMElements()` évite beaucoup de requêtes dispersées |
| Fallback stockage | IndexedDB prioritaire, localStorage fallback |
| Échappement HTML | Présent pour les noms affichés |

### Problèmes techniques

| Problème | Gravité | Fichiers | Détail |
|---|---|---|---|
| Monolithe JS | Élevée | `app.js` | UI, stockage, audio processing, PWA-adjacent et rendu mélangés |
| Pas de tests | Élevée | Projet entier | Aucun test pour parsing temps, WAV/MP3, storage, fusion |
| Pas de build/lint/format | Moyenne | Projet entier | Difficile de maintenir qualité et compatibilité |
| Couplage DOM/logique | Moyenne | `app.js` | Les fonctions métier manipulent directement le DOM |
| Duplication extraction | Moyenne | `app.js` | `extractLoop()` et `saveExtractedLoop()` recopient la logique de découpage |
| Gestion erreurs incomplète | Moyenne | `app.js` | Pas de `finally` pour restaurer certains états UI |
| Rendu via `innerHTML` + handlers inline | Moyenne | `app.js` | Moins maintenable, moins compatible CSP |
| Typage absent | Moyenne | `app.js` | Aucun contrat explicite pour `AudioItem`, `state`, `fusionResult` |
| HTML possiblement mal imbriqué | Moyenne | `index.html` | Zone autour de la carte Bibliothèque et fermeture de l'extract card à vérifier |
| Fonctions inutilisées | Faible | `app.js` | `downloadAudio()` n'a pas de bouton associé détecté |

## 12. Bugs ou incohérences détectés

| Bug/incohérence | Fichier | Cause probable | Correction recommandée |
|---|---|---|---|
| Bouton extraction peut rester désactivé si la portion est invalide après décodage | `app.js` | `return` dans le `try` avant restauration du bouton et fermeture `AudioContext` | Utiliser `finally`; valider avant création du contexte; fermer le contexte |
| `AudioContext` peut ne pas être fermé sur certaines erreurs/retours anticipés | `app.js` | Fermeture manuelle uniquement dans le chemin nominal | `try/finally` autour du contexte |
| Sauvegarde d'un extrait ignore le format choisi si aucun extrait n'est déjà généré | `app.js` | `saveExtractedLoop()` reconstruit toujours un WAV | Respecter `extract-format` ou séparer "sauver WAV" et "sauver MP3" |
| `state.extractedDataURL` est rempli async dans `extractLoop()` sans attente | `app.js` | `FileReader.onload` non awaité | Promisifier FileReader avant de considérer l'extraction prête |
| Bouton de téléchargement bibliothèque absent | `app.js`, `index.html` | `downloadAudio()` existe mais n'est pas rendu | Ajouter une action télécharger ou supprimer la fonction |
| Fusion de fichiers avec sample rates différents probablement incorrecte | `app.js` | `mergedBuffer` utilise `audioContext.sampleRate`, longueurs copiées depuis buffers source sans resampling explicite | Resampler/normaliser les buffers avant concaténation |
| Sélection possible du même audio pour A et B | `app.js` | Aucun contrôle `idA !== idB` | Interdire ou confirmer explicitement |
| Icônes déclarées en tailles multiples mais fichiers réels 800x800 | `icons/`, `manifest.json` | Export d'une seule image copiée sous plusieurs noms | Régénérer les dimensions réelles |
| Service worker ne cache pas les polices Google | `sw.js`, `index.html` | Fetch externe ignoré | Self-host ou accepter fallback offline |
| Modale renommage sans Escape/focus trap | `index.html`, `app.js` | Modale custom minimale | Ajouter ARIA, focus trap, Escape |
| Zoom mobile désactivé | `index.html` | Viewport `user-scalable=no` | Supprimer `maximum-scale` et `user-scalable=no` |
| Paramètres non fonctionnels | `index.html` | Placeholder | Définir vraies options ou masquer l'écran jusqu'à disponibilité |

## 13. Plan d'amélioration recommandé

### Phase 1 - Stabilisation

| Élément | Détail |
|---|---|
| Objectif | Corriger les bugs qui peuvent bloquer les actions principales |
| Tâches | Ajouter `finally` extraction/fusion; valider start/end avant décodage; corriger sauvegarde extrait; ajouter bouton téléchargement bibliothèque ou retirer fonction; vérifier HTML imbriqué |
| Fichiers concernés | `app.js`, `index.html` |
| Priorité | Élevée |
| Risque | Faible à moyen |
| Résultat attendu | Les workflows import > loop > extract/save > fusion deviennent fiables |

### Phase 2 - Sécurité et robustesse locale

| Élément | Détail |
|---|---|
| Objectif | Réduire les risques client-side et éviter les corruptions/plantages |
| Tâches | Validation MIME/taille/durée; sanitation des objets chargés depuis storage; supprimer handlers inline; préparer CSP; documenter `lame.min.js`; ajouter purge bibliothèque |
| Fichiers concernés | `app.js`, `index.html`, `vendor/lame.min.js` |
| Priorité | Élevée |
| Risque | Moyen |
| Résultat attendu | Données locales mieux contrôlées, surface XSS réduite, app plus défensive |

### Phase 3 - Performance audio et stockage

| Élément | Détail |
|---|---|
| Objectif | Supporter des audios plus grands sans freeze UI |
| Tâches | Stocker Blobs dans IndexedDB; séparer metadata/blobs; déplacer extraction/fusion/MP3 dans Web Worker; progress bar; limites configurables; lazy-load bibliothèque |
| Fichiers concernés | `app.js`, nouveau module worker à créer plus tard |
| Priorité | Élevée |
| Risque | Élevé |
| Résultat attendu | Moins de mémoire consommée, meilleure expérience sur mobile |

### Phase 4 - Architecture et maintenabilité

| Élément | Détail |
|---|---|
| Objectif | Rendre le projet évolutif |
| Tâches | Découper `app.js` en modules `storage`, `audio`, `library`, `fusion`, `ui`; introduire types JSDoc ou TypeScript; ajouter tests unitaires; ajouter lint/format; définir scripts dev |
| Fichiers concernés | `app.js`, potentiels nouveaux fichiers/modules, config future |
| Priorité | Moyenne à élevée |
| Risque | Moyen |
| Résultat attendu | Code testable, moins couplé, plus simple à modifier |

### Phase 5 - UI/UX et accessibilité

| Élément | Détail |
|---|---|
| Objectif | Améliorer usage mobile, accessibilité et perception qualité |
| Tâches | Réactiver zoom; focus-visible; ARIA toasts/modale; empty/loading/error states; bibliothèque enrichie; design system; paramètres réels; responsive QA |
| Fichiers concernés | `index.html`, `style.css`, `app.js` |
| Priorité | Moyenne |
| Risque | Faible à moyen |
| Résultat attendu | Interface plus professionnelle, accessible et compréhensible |

### Phase 6 - Fonctionnalités produit

| Élément | Détail |
|---|---|
| Objectif | Transformer le prototype en outil audio plus utile |
| Tâches | Recherche/tri bibliothèque; metadata audio; undo suppression; export choix qualité MP3; normalisation volume; crossfade; historique fusions; partage fichier |
| Fichiers concernés | À confirmer selon architecture future |
| Priorité | Moyenne |
| Risque | Moyen à élevé |
| Résultat attendu | Produit plus complet pour créateurs audio |

## 14. Liste des fichiers importants

| Fichier | Rôle | Pourquoi important | À modifier plus tard ? |
|---|---|---|---|
| `app.js` | Logique applicative complète | Contient toutes les fonctionnalités, bugs et dette principale | Oui |
| `index.html` | Structure UI et PWA registration | Définit écrans, inputs, nav, modale, scripts | Oui |
| `style.css` | Design system et responsive | Contrôle UI/UX, accessibilité visuelle et mobile | Oui |
| `sw.js` | Service worker | Offline/cache/update behavior | Oui |
| `manifest.json` | Manifest PWA | Installation, icons, nom, thème | Oui |
| `vendor/lame.min.js` | Encodage MP3 | Dépendance critique pour export MP3 | À confirmer |
| `icons/*.png` | Icônes PWA | Assets installabilité; actuellement dimensions réelles suspectes | Oui |

## 15. Résumé pour développement futur

`rajiaa` est une PWA audio client-only qui permet d'importer un audio, de définir une boucle, d'extraire un segment, de sauvegarder les audios localement et de fusionner deux audios sauvegardés. Le projet est utilisable comme prototype et contient déjà une logique produit réelle : stockage IndexedDB, fallback localStorage, Web Audio API, export WAV custom, export MP3 via `lamejs`, interface mobile-first et service worker.

Les parties solides sont la simplicité d'installation, l'absence de backend, la clarté des workflows principaux et le regroupement fonctionnel dans une seule app statique. Les parties faibles sont la dette d'architecture, le traitement audio lourd sur le thread principal, le stockage DataURL, les bugs d'état autour de l'extraction, l'accessibilité incomplète et l'absence totale de tests/outils qualité.

La meilleure stratégie est de ne pas commencer par ajouter beaucoup de fonctionnalités. Il faut d'abord stabiliser les workflows existants, sécuriser la validation des fichiers, fiabiliser l'extraction/fusion, puis migrer le stockage vers des Blobs IndexedDB et déplacer les traitements lourds dans un Web Worker. Ensuite seulement, il sera pertinent de refondre l'UI/UX, d'ajouter un design system, de rendre la bibliothèque plus riche et d'améliorer les fonctionnalités audio comme normalisation, qualité MP3, crossfade et historique.

### Priorités immédiates

1. Corriger les bugs d'extraction/sauvegarde et garantir la restauration des boutons via `finally`.
2. Ajouter validation stricte des fichiers audio, taille et durée.
3. Remplacer le stockage DataURL par Blob IndexedDB + metadata.
4. Déplacer conversion/extraction/fusion dans un Web Worker avec progression.
5. Corriger accessibilité mobile : zoom, focus-visible, modale, radios, toasts.
