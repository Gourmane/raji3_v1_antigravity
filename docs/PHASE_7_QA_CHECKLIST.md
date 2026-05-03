# Phase 7 QA Checklist - rajiaa

## Objectif

Valider les workflows critiques de `rajiaa` avant livraison : import, loop, waveform, export, bibliotheque, fusion, PWA/offline, clavier et mobile.

## Environnement de test

Lancer l'application via HTTP local, pas en `file://`, car le Web Worker d'export et le Service Worker ont besoin d'un contexte web.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Ouvrir ensuite :

```text
http://127.0.0.1:4173/
```

## Donnees de test recommandees

- Audio court : 5 a 30 secondes, MP3 ou WAV.
- Audio moyen : 2 a 5 minutes.
- Audio long : 15 a 20 minutes.
- Fichier non audio : `.txt` ou image renommee.
- Deux audios sauvegardes pour tester la fusion.

## Tests critiques

| ID | Scenario | Etapes | Resultat attendu | Statut |
|---|---|---|---|---|
| QA-01 | Import audio valide | Importer un MP3/WAV court | Lecteur visible, duree affichee, waveform chargee | A faire |
| QA-02 | Format invalide | Importer un fichier non audio | Message d'erreur clair, aucun crash | A faire |
| QA-03 | Loop invalide | Mettre une fin avant le debut | Message de validation, export bloque | A faire |
| QA-04 | Loop courte | Selectionner moins de 0.3 s | Message de validation, export bloque | A faire |
| QA-05 | Waveform lecture | Cliquer sur la waveform hors selection | La lecture se deplace sans changer start/end | A faire |
| QA-06 | Waveform handles | Deplacer les handles start/end | Les valeurs visibles restent synchronisees | A faire |
| QA-07 | Lock selection | Activer Lock puis tenter de drag | La selection reste fixe, lecture possible | A faire |
| QA-08 | Export WAV | Exporter une loop courte en WAV | Progression visible, telechargement demarre | A faire |
| QA-09 | Export MP3 | Exporter une loop courte en MP3 | Worker encode, progression visible, fichier telecharge | A faire |
| QA-10 | Annuler export | Lancer export puis cliquer Annuler | Export arrete, message d'annulation | A faire |
| QA-11 | Sauver loop | Enregistrer une loop dans la bibliotheque | Item ajoute avec format, duree, taille, date | A faire |
| QA-12 | Recherche bibliotheque | Chercher par nom | Liste filtree, etat vide si aucun resultat | A faire |
| QA-13 | Tri bibliotheque | Tester recents, anciens, nom, duree, taille | Ordre change correctement | A faire |
| QA-14 | Actions item | Lire, telecharger, renommer, supprimer | Chaque action fonctionne et affiche un retour | A faire |
| QA-15 | Fusion | Selectionner deux audios et fusionner | Resultat lisible, telechargeable, sauvegardable | A faire |
| QA-16 | Clavier | Tab, Enter, Escape dans modale | Focus visible, modale piegee, Escape ferme | A faire |
| QA-17 | Mobile | Tester largeur 360 px et tactile | Aucun chevauchement, boutons accessibles | A faire |
| QA-18 | PWA/offline | Charger, couper reseau, recharger | App disponible depuis cache apres installation SW | A faire |

## Verifications techniques rapides

```powershell
node --check app.js
node --check export-worker.js
Get-Content manifest.json | ConvertFrom-Json | Out-Null
```

## Limites connues

- Les audios et exports restent locaux au navigateur.
- Les gros fichiers dependent fortement de la memoire disponible sur l'appareil.
- Les exports de loop sont limites a 20 minutes pour eviter les blocages.
- Le WAV peut produire des fichiers lourds.
- MP3 depend de `vendor/lame.min.js`.
- Le mode offline depend du Service Worker et ne fonctionne pas en `file://`.
