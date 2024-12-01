## Building the extension
Install project dependencies:
```
npm start
```

To build the extension at `builds/chrome-dev`:
```
npm run build
```

To build a prod version (minified) at `builds/chrome-prod`:
```
npm run prod
```

Extension builds are unpacked.

<br>

## Updating emotes

This affects both the `chrome` and `firefox` extension versions.

### Updating the repository files and the dictionary
In a PR to the `main` branch:
- Upload the new/changed emote asset in `assets/images/`
- Update the respective `dictionary|twitch|bttv|ffz.json` dictionary in `json/src/`
- Update `json/src/styles.json` or `json/src/hats.json` if needed
- Add emotes to `json/src/newEmotes.json` (these are added to a section for new/updated emotes in `index.html`)
- Run `npm run emotes` to update `index.html` and the emote JSON files

Once merged, Github Pages should update [the emote dictionary](https://betternaifu.github.io/betternaifuytg).

### Purging the jsDelivr CDN cache
Go to [jsDelivr](https://www.jsdelivr.com/tools/purge) and purge the cache for the relevant files from the following:
```
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/custom.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/twitch.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/ffz.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/bttv.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/hats.json
```

Keep these updated if supporting extension versions before `1.5.6`:
```
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/dictionary.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/dims.json
https://cdn.jsdelivr.net/gh/betternaifu/betternaifuytg@latest/json/styles.json
```
Once the cache is successfully purged (may require multiple attempts), the extension should be able to use the new/updated emotes.