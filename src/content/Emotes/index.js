import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'

import Emote from './Emote'

const REMOTE_OWNER = 'betternaifu'
const REMOTE_REPO = 'betternaifuytg'
const REMOTE_URL = `https://cdn.jsdelivr.net/gh/${REMOTE_OWNER}/${REMOTE_REPO}`
// const DEFAULT_BRANCH = 'main'
// const FALLBACK_URL = `https://raw.githubusercontent.com/${REMOTE_OWNER}/${REMOTE_REPO}/${DEFAULT_BRANCH}`

const fetchJSON = (url) => {
  return new Promise((res, rej) => {
    fetch(url).then(response => response.status === 200 ? response.json() : response.status).then(res).catch(caught => { console.log(caught); rej(caught) })
  })
}

const fetchDict = (dict) => {
  return new Promise((res, rej) => {
    fetchJSON(`${REMOTE_URL}/json/${dict}.json`).then((ans) => {
      if (isNaN(ans)) {
        res(ans)
      } else {
        rej()
      }
    })
  })
}

class Emotes {
  constructor () {
    this.dictionary = new Map()
    this.init = this.init.bind(this)
    this.blacklist = new Map()
  }

  init (suppress) {
    this.suppressLogging = suppress || false
    this.dictionary = new Map()
    this.blacklist = new Map()
    this.styles = null
    this.dimensions = null
    this.loadedCustom = null
    this.loadedTwitch = null
    this.loadedBTTV = null
    this.loadedFFZ = null
    this.loadedCustom = null
    this.loadedCustom = null
    return Promise.all([
      PersistentSyncStorage.data.options.enableBetterYTGEmotes &&
        this.loadDimensions(),
      (PersistentSyncStorage.data.options.enableBetterYTGEmotes ||
        PersistentSyncStorage.data.options.enableBTTVEmotes) &&
        this.loadStyles()
    ])
  }

  loadEmotes () {
    return Promise.all([
      PersistentSyncStorage.data.options.enableTwitchEmotes &&
        this.loadTwitch(),
      PersistentSyncStorage.data.options.enableFFZEmotes &&
        this.loadFFZ(),
      PersistentSyncStorage.data.options.enableBTTVEmotes &&
        this.loadBTTV(),
      PersistentSyncStorage.data.options.enableBetterYTGEmotes &&
        this.loadBetterYTG(),
      PersistentSyncStorage.data.options.emoteBlacklist &&
        this.loadBlacklist()
    ])
  }

  doneLoading () {
    const loadedDims = (this.dimensions != null) || !PersistentSyncStorage.data.options.enableBetterYTGEmotes
    const loadedStyles = (this.styles != null) || !(PersistentSyncStorage.data.options.enableBTTVEmotes || PersistentSyncStorage.data.options.enableBetterYTGEmotes)
    const loadedBetterYTGEmotes = (this.loadedCustom != null) || !PersistentSyncStorage.data.options.enableBetterYTGEmotes
    const loadedTwitch = (this.loadedTwitch != null) || !PersistentSyncStorage.data.options.enableTwitchEmotes
    const loadedBTTV = (this.loadedBTTV != null) || !PersistentSyncStorage.data.options.enableBTTVEmotes
    const loadedFFZ = (this.loadedFFZ != null) || !PersistentSyncStorage.data.options.enableFFZEmotes
    return loadedDims && loadedStyles && loadedBetterYTGEmotes && loadedTwitch && loadedBTTV && loadedFFZ
  }

  loadStyles () {
    return new Promise((res) => {
      fetchDict('styles').then(styling => {
        this.styles = styling
        if (!this.suppressLogging) console.log('Loaded styling')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load styling'); this.styles = false; res() })
    })
  }

  loadDimensions () {
    return new Promise((res) => {
      fetchDict('dims').then(dims => {
        this.dimensions = dims
        if (!this.suppressLogging) console.log('Loaded dimensions')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load dimensions'); this.dimensions = false; res() })
    })
  }

  loadTwitch () {
    return new Promise((res, rej) => {
      fetchDict('twitch').then(TwitchEmotes => {
        const emoteCodes = Object.keys(TwitchEmotes)
        for (let i = emoteCodes.length - 1; i >= 0; i--) {
          const code = emoteCodes[i]
          const emoteId = TwitchEmotes[code].code
          const url = `https://static-cdn.jtvnw.net/emoticons/v1/${emoteId}/1.0`
          const source = 'Twitch'
          const style = this.styles[code]
          const height = TwitchEmotes[code].height
          const width = TwitchEmotes[code].width
          this.dictionary.set(code, new Emote({ code, url, source, style, height, width }))
        }
        if (PersistentSyncStorage.data.options.ClickThis) {
          const roll = Math.random()
          if (roll < 0.01) {
            const code = 'Kappa'
            const emoteId = '80393'
            const url = `https://static-cdn.jtvnw.net/emoticons/v1/${emoteId}/1.0`
            const source = 'Twitch'
            const style = this.styles[code]
            const height = TwitchEmotes[code].height
            const width = TwitchEmotes[code].width
            this.dictionary.set('Kappa', new Emote({ code, url, source, style, height, width }))
            console.log('You struck gold!')
          }
        }
        if (!this.suppressLogging) console.log('Loaded Twitch emotes')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load Twitch emotes'); this.loadedTwitch = false; res() })
    })
  }

  loadFFZ () {
    return new Promise((res, rej) => {
      fetchDict('ffz').then(FFZEmotes => {
        const emotes = FFZEmotes.set.emoticons
        for (let i = 0; i < emotes.length; i++) {
          const code = emotes[i].name
          const emoteId = emotes[i].id
          const url = `https://cdn.frankerfacez.com/emote/${emoteId}/1`
          const source = 'FFZ'
          const style = this.styles[code]
          const height = emotes[i].height
          const width = emotes[i].width
          this.dictionary.set(code, new Emote({ code, url, source, style, height, width }))
        }
        if (!this.suppressLogging) console.log('Loaded FFZ emotes')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load FFZ emotes'); this.loadedFFZ = false; res() })
    })
  }

  loadBTTV () {
    return new Promise((res, rej) => {
      fetchDict('bttv').then(BTTVEmotes => {
        const emotes = Object.keys(BTTVEmotes)
        for (let i = 0; i < emotes.length; i++) {
          const code = emotes[i]
          const url = BTTVEmotes[code].url
          const style = this.styles[code]
          const source = 'BTTV'
          const height = BTTVEmotes[code].height
          const width = BTTVEmotes[code].width
          this.dictionary.set(code, new Emote({ code, url, source, style, height, width }))
        }
        if (!this.suppressLogging) console.log('Loaded BTTV emotes')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load BTTV emotes'); this.loadedBTTV = false; res() })
    })
  }

  loadBetterYTG () {
    return new Promise((res, rej) => {
      fetchDict('dictionary').then(CustomEmotes => {
        const emoteCodes = Object.keys(CustomEmotes)
        for (let i = emoteCodes.length - 1; i >= 0; i--) {
          const code = emoteCodes[i]
          const filename = CustomEmotes[code]
          const url = `${REMOTE_URL}/assets/images/${filename}`
          const source = 'Custom'
          const style = this.styles[code]
          const height = this.dimensions[code].height
          const width = this.dimensions[code].width
          this.dictionary.set(code, new Emote({ code, url, source, style, height, width }))
        }
        if (!this.suppressLogging) console.log('Loaded custom emotes')
        res()
      }).catch(() => { if (!this.suppressLogging) console.log('Failed to load custom emotes'); this.loadedCustom = false; res() })
    })
  }

  loadBlacklist () {
    const blacklist = PersistentSyncStorage.data.options.emoteBlacklist.trim()
    const words = blacklist.split(' ')
    for (let i = 0; i < words.length; i++) {
      if (words[i].trim() !== '') {
        this.blacklist.set(words[i], true)
      }
    }
  }

  get (key) {
    return this.dictionary.get(key)
  }

  set (key, value) {
    return this.dictionary.set(key, new Emote(value))
  }

  has (key) {
    return this.dictionary.has(key)
  }

  screen (key) {
    return this.blacklist.has(key)
  }
}

export default new Emotes()
