const fs = require('fs')

const dictionary = require('json/dictionary.json')
const bttv = require('json/bttv.json')
const ffz = require('json/ffz.json')
const twitch = require('json/twitch.json')

const newEmotes = require('json/newEmotes.json')

const emoteDictionary = new Map()

Object.keys(twitch).forEach((key) => {
  emoteDictionary.set(key, { file: `https://static-cdn.jtvnw.net/emoticons/v1/${twitch[key].code}/1.0`, source: 'Twitch' })
})

ffz.set.emoticons.forEach((emote) => {
  emoteDictionary.set(emote.name, { file: `https://cdn.frankerfacez.com/emote/${emote.id}/1`, source: 'FFZ' })
})

Object.keys(bttv).forEach((emote) => {
  emoteDictionary.set(emote, { file: bttv[emote].url, source: 'BTTV' })
})

Object.keys(dictionary).forEach((key) => {
  emoteDictionary.set(key, { file: `assets/images/${dictionary[key]}`, source: 'Custom' })
})

// Generating HTML for each section of the dictionary
const tableCell = ({ code, file, source }) => `<div class="cell"><div class="emote"><img class="emote" alt="${code}" src="${file}"></div><code>${code}</code><div class="source">${source}</div></div>`

const tableTemplate = (title, emotes) => `
<h2>${title}</h2>
<div class="section"><div class="table">
${emotes.map(emote => tableCell(emote)).join('\n')}
</div></div>
`

const specialCell = ({ code, file, source }) => `<div class="cell special"><div class="special emote"><img alt="${code}" src="${file}"></div><code>${code}</code></div>`

const specialTemplate = (title, emotes) => `
<h3>${title}</h3>
<div class="section"><div class="table">
${emotes.map(emote => specialCell(emote)).join('\n')}
</div></div>
`

const emoteToObj = code => ({ code, file: emoteDictionary.get(code).file, source: emoteDictionary.get(code).source })

const emoteKeys = [...emoteDictionary.keys()].sort((a, b) => { return a.toLowerCase().localeCompare(b.toLowerCase()) })
const sorted = new Map()

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const numeric = /\d/
const special = /[^A-Za-z0-9\s]/

// New & Updated
const newUpdatedEmotes = emoteKeys
  .filter(code => code in newEmotes)
  .map(emoteToObj)

// Special
const specialCharEmotes = emoteKeys
  .filter(code => special.exec(code[0]) !== null)
  .map(emoteToObj)
sorted.set('Special Characters', specialCharEmotes)

// 0-9
const numericCharEmotes = emoteKeys
  .filter(code => numeric.exec(code[0]))
  .map(emoteToObj)
sorted.set('0-9', numericCharEmotes)

// A-Z
alpha.forEach(char => {
  const thisCharEmotes = emoteKeys
    .filter(code => code[0].toUpperCase() === char)
    .map(emoteToObj)

  if (thisCharEmotes.length > 0) {
    sorted.set(char, thisCharEmotes)
  }
})

let htmlstring = `<html class="theme-dark">
<head>
<title>BetterNaifuYTG Emotes</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="assets/style.css">
<link rel="shortcut icon" type="image/png" href="assets/favicon.png">
</head>
<body>
<div class="container">
<label id="switch" class="switch">
<input type="checkbox" id="slider" autocomplete="off">
<span class="slider round"></span>
</label>
</div>
<div id='content'>
<h1 id="emote-dictionary">Emote Dictionary</h1>
<p>This is a list of the extension emotes, most of which are taken from <a href="https://betterttv.com/emotes">BetterTTV</a> and <a href="https://www.frankerfacez.com/emoticons">FrankerFaceZ</a>.</p>
<p>Non-custom emotes are global BTTV/FFZ/Twitch emotes and sourced from the following (extension might not be up to date):<br />
<a href="https://betterttv.com/emotes/global">Global BTTV emotes</a><br />
<a href="https://www.frankerfacez.com/channel/__ffz_global">Global FFZ emotes</a><br />
<a href="https://twitchemotes.com/">Global Twitch emotes</a></p>
<p><em>Note: Some emote names might conflict with Youtube's default emotes if the "Disable Youtube emoji autocomplete" option isn't enabled.</em></p>
`

htmlstring += specialTemplate('New/Updated Emotes', newUpdatedEmotes)

sorted.forEach((emotes, title) => {
  htmlstring += tableTemplate(title, emotes)
})

htmlstring += `
</div>
<script src="assets/dictionary.js"></script>
</body>
</html>`

// Write out
const filePath = process.cwd() + 'index.html'
fs.writeFile(filePath, htmlstring, /* { flag: "wx" }, */ function (err) {
  if (err) {
    console.log("File '" + filePath + "' couldn't be overwritten (or some other error occurred). Aborted!")
  } else {
    console.log('Done, saved to ' + filePath)
  }
})
