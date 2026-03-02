# Dokumentoversettar (GitHub Pages)

Webapp for iPad-elevar:
- Kamera (live) eller opplasting av bilde
- OCR av norsk dokumenttekst
- Omsetjing til ukrainsk
- Opplesing på ukrainsk

## Publisering på GitHub Pages

1. Push repoet til GitHub.
2. Gå til **Settings -> Pages**.
3. Vel **Deploy from a branch**.
4. Vel branch `main` og mappa `/docs`.
5. Vent til Pages-URL er publisert.

## Viktige merknader

- Kamera krev HTTPS og brukartillatelse. GitHub Pages brukar HTTPS.
- På iPad: bruk Safari og sjekk at kamera er tillate for nettsida.
- OCR brukar `tesseract.js` frå CDN og krev nett.
- Omsetjing brukar offentlege LibreTranslate-endepunkt; stabilitet kan variere.
