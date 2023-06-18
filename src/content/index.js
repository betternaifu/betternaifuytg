import 'src/stylus/content.styl'
import ChatWatcher from './ChatWatcher'
import RouteWatcher from './RouteWatcher'

import {
  isLivestream, isYoutubeGaming,
  isYoutubeEmbed, isYoutubeVanilla,
  isChatPopout
} from 'src/helpers/Identification'

import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'

let MAIN = null

// ---

class Main {
  constructor (emitEvent) {
    this.routeWatcher = null
    this.chatWatcher = null

    this.onRouteChange = this.onRouteChange.bind(this)

    this.source = emitEvent

    this.load()
  }

  load () {
    this.routeWatcher = new RouteWatcher()
    this.routeWatcher.on('change', this.onRouteChange)

    this.onRouteChange()
  }

  onRouteChange () {
    const {
      enableYoutubeGaming,
      enableYoutubeVanilla,
      enableYoutubeEmbed,
      enableChatPopout
    } = PersistentSyncStorage.data.options

    if (
      isLivestream() &&
      (
        (isYoutubeGaming() && enableYoutubeGaming) ||
        (isYoutubeVanilla() && enableYoutubeVanilla) ||
        (isYoutubeEmbed() && enableYoutubeEmbed) ||
        (isChatPopout() && enableChatPopout)
      )
    ) {
      chrome.runtime.sendMessage({ name: 'icon', color: 'red', title: 'BetterNaifuYTG', tab: true })
      this.init()
    }
    // setTimeout(() => {
    // }, 500);
  }

  init () {
    this.chatWatcher = new ChatWatcher()
    this.chatWatcher.init(this.source)
  }
}

// ---

PersistentSyncStorage.on('ready', () => {
  MAIN = new Main('ready')
})

PersistentSyncStorage.on('chat-refresh', () => {
  MAIN = new Main('chat-refresh')
})

console.log('BYTG INIT')
