# Notes techniques - rajiaa

## Architecture

`rajiaa` est une PWA statique sans backend :

- `index.html` : structure des ecrans Loop, Fusion, Parametres et modale.
- `style.css` : design system, responsive, etats UI.
- `app.js` : logique UI, stockage, audio, waveform, bibliotheque, fusion.
- `export-worker.js` : extraction/encodage WAV et MP3 hors thread UI.
- `sw.js` : cache PWA.
- `vendor/lame.min.js` : encodeur MP3 local.

## Stockage

Le stockage privilegie IndexedDB avec deux stores modernes :

- `audioMetadata` pour les metadonnees.
- `audioBlobs` pour les fichiers audio.

Un fallback legacy existe pour les anciens `dataURL` et pour les environnements ou IndexedDB echoue.

## Export

Le flux d'export est :

1. Validation de la loop dans `app.js`.
2. Decodage du fichier via Web Audio API.
3. Copie des canaux dans des `Float32Array`.
4. Transfert des buffers au `export-worker.js`.
5. Encodage WAV ou MP3 dans le worker.
6. Retour d'un `Blob` vers l'UI pour telechargement ou sauvegarde.

L'export est limite a `MAX_LOOP_EXPORT_DURATION` pour proteger les appareils avec peu de memoire.

## PWA/offline

`sw.js` utilise un cache statique avec strategie network-first et fallback cache. Le worker d'export est inclus dans le cache.

Apres modification des fichiers statiques, incrementer `CACHE_NAME` pour forcer la mise a jour du cache.

## Commandes de verification

```powershell
node --check app.js
node --check export-worker.js
Get-Content manifest.json | ConvertFrom-Json | Out-Null
```

Test HTTP local :

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

## Limites connues

- Pas de backend, pas de synchronisation cloud.
- Pas de chiffrement applicatif des audios stockes localement.
- Export MP3 dependant de `lamejs`.
- Les tres gros fichiers peuvent echouer selon memoire navigateur.
- Les tests automatises navigateur ne sont pas encore outilles.
