## Building the extension
Install project dependencies with
```
npm start
```

To build the extension at `builds/firefox-dev`
```
npm run build
```

To build a prod version (minified) at `builds/firefox-prod`
```
npm run prod
```

Extension builds are unpacked.

<br>

## Updating or uploading emotes
In a PR to the `main` branch:
- make sure the new/changed emote asset is in `assets/images/`
- update the respective `dictionary|twitch|bttv|ffz.json` dictionary in `json/`
- make sure image dimensions are properly reflected in `json/dims.json`
- update `json/styles.json` if needed
- add emote to `json/newEmotes.json` (time window for "new/updated" still nebulous)
- run `node indexGenerator.js` to update `index.html`

Once merged, Github Pages should shortly update [the emote dictionary](https://betternaifu.github.io/betternaifuytg) and the emote should be available for the extension to use once it's picked up by jsDelivr.
