import Emotes from './Emotes'
import Message from './message'
import TabCompleter from './TabCompleter'

import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'

import EventEmitter from 'events'

class ChatWatcher extends EventEmitter {
  constructor () {
    super()

    this.watchChat = this.watchChat.bind(this)

    this._chatContainer = null
    this._observer = null

    this.messages = new Map()

    this._container = null
    this._overseer = null

    this.blacklist = new Map()

    this.completer = null

    this._ticker = null
    this._tickerWatcher = null
    this.watchTicker = this.watchTicker.bind(this)

    this._docker = null
    this._banner = null
    this._dockerWatcher = null
    this._bannerWatcher = null
    this.watchDocker = this.watchDocker.bind(this)
    this.watchBanner = this.watchBanner.bind(this)

    this.avatarSheet = document.createElement('style')
    this.avatarSheet.id = 'bytg-avatar-sheet'
    this.avatarSheet.innerHTML = 'yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer>yt-img-shadow#author-photo, ytd-sponsorships-live-chat-gift-redemption-announcement-renderer.yt-live-chat-item-list-renderer>yt-img-shadow#author-photo, .bytg-hat {display: none;};'

    this.messageSheet = document.createElement('style')
    this.messageSheet.id = 'bytg-message-sheet'
    this.messageSheet.innerHTML = 'yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer[author-type=""] {display: none;}'

    this.reactionSheet = document.createElement('style')
    this.reactionSheet.id = 'bytg-reaction-sheet'
    this.reactionSheet.innerHTML = '#reaction-control-panel-overlay.yt-live-chat-renderer {display: none;}'

    this.overflowSheet = document.createElement('style')
    this.overflowSheet.id = 'bytg-overflow-sheet'
    this.overflowSheet.innerHTML = 'yt-live-chat-text-message-renderer.yt-live-chat-item-list-renderer, yt-live-chat-text-message-renderer.yt-live-chat-banner-renderer {overflow: initial; contain: none;};' // include #container.yt-live-chat-participant-renderer for participants list?

    this._participantList = null
    this._participantsWatcher = null
    this.watchParticipants = this.watchParticipants.bind(this)

    this.emotes = null
    this.hats = null

    this.authorAvatar = null

    PersistentSyncStorage.on('change', (changes) => {
      this.toggleAvatars()
      this.toggleMessages()
      this.toggleReactions()
      this.toggleOverflow()
    })
    // yt-live-chat-ninja-message-renderer shows up when you popout chat
    // yt-live-chat-toast-container for mobile?
  }

  init (emitEvent) {
    this.source = emitEvent
    const activated = emitEvent !== 'ready'
    const checkForEmotes = (res) => {
      if (this.emotes?.dictionary?.size || this.emotes?.doneLoading()) {
        res()
      } else {
        setTimeout(checkForEmotes.bind(this, res), 100)
      }
    }
    const waitForEmotes = new Promise(checkForEmotes)
    return new Promise((res, rej) => {
      this.getContainer()
        .then(() => {
          if (!activated && PersistentSyncStorage.data.options.liveChatByDefault) {
            document.querySelectorAll('tp-yt-paper-listbox > a')[1]?.click() // wait to see if getElementById('trigger') is viable
          };
          this.watchContainer()
          this.injectButtons()
          this.getChatContainer().then(() => {
            this.toggleMessages()
            this.toggleAvatars()
            this.toggleReactions()
            this.toggleOverflow()
            Emotes.init(!activated).then(() => { Emotes.loadEmotes() })
          })
            .then(waitForEmotes)
            .then(() => {
              this.emotes = Emotes
              this.hats = Emotes.hats
            })
            .then(() => {
              if (activated) {
                this.watchChat()
                this.parsePreloadedMessages()
                if (PersistentSyncStorage.data.options.fixMemoryLeaks) {
                  chrome.runtime.sendMessage({ name: 'fixMemoryLeaks' }, (response) => { if (response)console.info('Trying memory leak fix.') })
                }
                this.getBannerContainer().then(() => { this.watchBanner(); this.parsePreloadedPins() })
                this.getTicker().then(() => { this.watchTicker() })
                const tabComplete = PersistentSyncStorage.data.options.tabComplete
                const disableAutoEmoji = PersistentSyncStorage.data.options.disableAutoEmoji
                if (tabComplete || disableAutoEmoji) {
                  const restricted = document.querySelector('yt-live-chat-restricted-participation-renderer') // unsure if this is still rendered
                  if (restricted) { console.info('Live chat input is restricted.') } else {
                    const input = document.querySelector('yt-live-chat-text-input-field-renderer#input')?.children[1]
                    if (input) {
                      if (tabComplete) {
                        this.completer = new TabCompleter(input)
                        let arr = []
                        waitForEmotes.then(() => { // dubious
                          Emotes.dictionary.forEach((value, key) => { arr.push({ name: key, url: value.url }) }) // sort while inserting for efficiency?
                          arr = arr.filter(x => !x.name.includes(' '))
                          arr.sort((a, b) => { return a.name.localeCompare(b.name) })
                          this.completer.init(arr)
                        })
                      }
                      if (disableAutoEmoji) {
                        chrome.runtime.sendMessage({ name: 'disableEmojiComplete' }, (response) => { if (response)console.info('Disabled Youtube emoji complete.') })
                      }
                    } else { console.info('No live chat input found.') }
                  }
                }
                this.getParticipants().then(() => { this.watchParticipants(); this.parsePreloadedParticipants() })
                this.getDockedContainer().then(() => { this.watchDocker() })
                this.authorAvatar = document.querySelector('yt-live-chat-message-input-renderer #avatar #img')?.src || null
              } else { // ugly workaround for tab completion breaking on first init after waitForEmotes implemented
                this.source = 'chat-refresh'
                setTimeout(() => { document.querySelector('tp-yt-paper-listbox > a[aria-selected=\'true\']')?.click() }, 100)
              }
            })
        })
    })
  }

  getParticipants () {
    const checkForParticipants = (res, rej) => {
      this._participantList = document.querySelector('yt-live-chat-participant-list-renderer')
      if (this._participantList !== null) {
        res()
      } else {
        setTimeout(checkForParticipants.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForParticipants)
  } // This only refreshes upon chat reopen

  watchParticipants () {
    this._participantsWatcher = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const { addedNodes } = mutation
        if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
          for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
            const node = addedNodes[i]
            const { isMessage, messageType } = this.isMessageNode(node)
            if (isMessage) {
              this.onNewMessage(node, messageType, 'participants')
              // participant renderers don't have an id (or emotes)
            }
          }
        }
      })
    })
    this._participantsWatcher.observe(this._participantList, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    })
  }

  parsePreloadedParticipants () {
    const participants = this._participantList.querySelector('#participants')?.children
    if (typeof participants !== 'undefined') {
      for (let i = participants.length - 1; i >= 0; i--) {
        const node = participants[i]
        const { isMessage, messageType } = this.isMessageNode(node)
        if (isMessage) {
          this.onNewMessage(node, messageType, 'participants')
        }
      }
    }
  }

  injectRefreshButton () { // could use yt's own material design version instead
    if (document.getElementById('refreshButton')) return

    const buttonContainer = document.createElement('div')
    buttonContainer.setAttribute('data-tooltip', 'Refresh chat')
    buttonContainer.setAttribute('tabindex', '0')
    buttonContainer.id = 'refreshButtonContainer'
    buttonContainer.className = 'tooltip-left'

    const button = document.createElement('div')
    button.id = 'refreshButton'
    button.addEventListener('click', () => {
      document.querySelector('tp-yt-paper-listbox > a[aria-selected=\'true\']')?.click() // wait to see if getElementById('trigger') is viable
      document.getElementById('refreshButtonContainer').setAttribute('data-tooltip', 'Refreshing...')
      console.log('Chat refreshed')
    })
    button.innerHTML = '<span class="material-icons">refresh</span>'
    buttonContainer.appendChild(button)
    document.getElementById('action-buttons').appendChild(buttonContainer)
    button.style.display = 'flex'

    buttonContainer.addEventListener('keydown', (key) => {
      if (key.code === 'Space' || key.code === 'Enter' || key.code === 'NumpadEnter') {
        document.querySelector('tp-yt-paper-listbox > a[aria-selected=\'true\']')?.click() // wait to see if getElementById('trigger') is viable
        document.getElementById('refreshButtonContainer').setAttribute('data-tooltip', 'Refreshing...')
        console.log('Chat refreshed')
      }
    })
  }

  injectOptionsButton () {
    if (document.getElementById('optionsButton')) return

    const buttonContainer = document.createElement('div')
    buttonContainer.setAttribute('data-tooltip', 'BetterNaifuYTG options')
    buttonContainer.setAttribute('tabindex', '0')
    buttonContainer.id = 'optionsButtonContainer'
    buttonContainer.className = 'tooltip-left'

    const button = document.createElement('div')
    button.id = 'optionsButton'
    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({ name: 'optionsPopup' })
    })
    button.innerHTML = '<span class="material-icons">settings</span>'
    buttonContainer.appendChild(button)
    document.getElementById('action-buttons').appendChild(buttonContainer)
    button.style.display = 'flex'

    buttonContainer.addEventListener('keydown', (key) => {
      if (key.code === 'Space' || key.code === 'Enter' || key.code === 'NumpadEnter') {
        chrome.runtime.sendMessage({ name: 'optionsPopup' })
      }
    })
  }

  injectButtons () {
    this.injectRefreshButton()
    this.injectOptionsButton()
    document.getElementById('action-buttons').setAttribute('style', 'display: flex; gap: 10px')
  }

  getTicker () { // This isn't actually getting the ticker element but the ancestor of the yt-live-chat-pinned-message-renderer that's linked to ticker events
    const checkForTicker = (res, rej) => {
      this._ticker = document.getElementById('pinned-message')
      // '#message.style-scope.yt-live-chat-pinned-message-renderer' (no relation to yt-live-chat-banner-renderer which shows pinned messages)
      if (this._ticker !== null) {
        res()
      } else {
        setTimeout(checkForTicker.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForTicker)
  } // Does not refresh upon chat refresh

  watchTicker () {
    if (this._tickerWatcher === null) {
      this._tickerWatcher = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const { addedNodes } = mutation
          if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
            for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
              const node = addedNodes[i]
              const { isMessage, messageType } = this.isMessageNode(node)
              if (isMessage) {
                this.onNewMessage(node, messageType, 'ticker')
              }
            }
          }
        })
      })
    }
    this._tickerWatcher.observe(this._ticker, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    })
  }

  getContainer () {
    // Parent of yt-live-chat-item-list-renderer.style-scope.yt-live-chat-renderer that gets reset when live/top chat toggled
    // Basically the chat container ancestor
    const checkForContainer = (res, rej) => {
      this._container = document.getElementById('item-list')
      if (this._container !== null) {
        res()
      } else {
        setTimeout(checkForContainer.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForContainer)
  }

  watchContainer () {
    let removed = false
    let finished = false
    if (this._overseer === null) {
      this._overseer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (!finished) {
            const { addedNodes, removedNodes } = mutation

            if (typeof removedNodes !== 'undefined' && removedNodes.length > 0) {
              for (let i = 0, length = removedNodes.length - 1; i <= length; i++) {
                const node = removedNodes[i]
                if (node.tagName === 'YT-LIVE-CHAT-ITEM-LIST-RENDERER') {
                  removed = true
                }
              }
            }

            if (typeof addedNodes !== 'undefined' && addedNodes.length > 0 && removed) {
              for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
                const node = addedNodes[i]
                if (node.tagName === 'YT-LIVE-CHAT-ITEM-LIST-RENDERER') {
                  finished = true
                  PersistentSyncStorage.emit(this.source)
                  return
                }
              }
            }
          }
        })
      })
    }
    this._overseer.observe(this._container, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: false
    })
  }

  getChatContainer () {
    // Parent of actual chat (children are messages)
    const checkForContainer = (res, rej) => {
      this._chatContainer = document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer')
      if (this._chatContainer !== null) {
        res()
      } else {
        setTimeout(checkForContainer.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForContainer)
  }

  getDockedContainer () { // behaves like a pinned message?
    const checkForContainer = (res, rej) => {
      this._docker = document.getElementById('docked-messages')
      if (this._docker !== null) {
        res()
      } else {
        setTimeout(checkForContainer.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForContainer)
  }

  getBannerContainer () { // pinned messages/polls/etc
    const checkForContainer = (res, rej) => {
      this._banner = document.getElementById('live-chat-banner')
      if (this._banner !== null) {
        res()
      } else {
        setTimeout(checkForContainer.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForContainer)
  }

  watchDocker () {
    if (this._dockerWatcher === null) {
      this._dockerWatcher = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const { addedNodes } = mutation
          if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
            for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
              const node = addedNodes[i]
              const { isMessage, messageType } = this.isMessageNode(node)
              if (isMessage) {
                this.onNewMessage(node, messageType, 'docker')
              }
            }
          }
        })
      })
    }
    this._dockerWatcher.observe(this._docker, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    })
  }

  watchBanner () { // Doesn't convert polls (or anything besides messages) atm
    if (this._bannerWatcher === null) {
      this._bannerWatcher = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const { addedNodes } = mutation
          if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
            for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
              const node = addedNodes[i]
              const { isMessage, messageType } = this.isMessageNode(node)
              if (isMessage) {
                this.onNewMessage(node, messageType, 'banner')
              }
            }
          }
        })
      })
    }
    this._bannerWatcher.observe(this._banner, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    })
  }

  parsePreloadedMessages () {
    const messages = this._chatContainer.children
    for (let i = messages.length - 1; i >= 0; i--) {
      const node = messages[i]
      const { isMessage, messageType } = this.isMessageNode(node)
      if (isMessage) {
        this.onNewMessage(node, messageType, 'chat')
      }
    }
  }

  parsePreloadedPins () { // For preloaded pinned messages
    const messages = this._banner.querySelector('#visible-banners').children
    for (let i = messages.length - 1; i >= 0; i--) {
      const node = messages[i].querySelector('#contents').firstChild
      const { isMessage, messageType } = this.isMessageNode(node)
      if (isMessage) {
        this.onNewMessage(node, messageType, 'banner')
      }
    }

    // haven't tested how to handle docked items yet...
  }

  watchChat () {
    document.getElementById('refreshButtonContainer').setAttribute('data-tooltip', 'Refresh chat')
    this._observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const { addedNodes } = mutation
        if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
          for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
            const node = addedNodes[i]
            const { isMessage, messageType } = this.isMessageNode(node)
            if (isMessage) {
              this.onNewMessage(node, messageType, 'chat')
            }
          }
        }
      })
    })
    this._observer.observe(this._chatContainer, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: false
    })
  }

  onNewMessage (node, messageType, source) {
    const hats = this.hats ? Object.keys(this.hats) : null
    const hat = hats ? this.hats[hats[Math.floor(hats.length * Math.random())]] : null
    const message = new Message(node, messageType, source, this.emotes, this.authorAvatar, hat)
  }

  isMessageNode (node) {
    const tagDict = {
      'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER': 'message',
      'YT-LIVE-CHAT-PAID-MESSAGE-RENDERER': 'superchat',
      'YT-LIVE-CHAT-MEMBERSHIP-ITEM-RENDERER': 'resub',
      'YTD-SPONSORSHIPS-LIVE-CHAT-GIFT-PURCHASE-ANNOUNCEMENT-RENDERER': 'gift',
      'YTD-SPONSORSHIPS-LIVE-CHAT-GIFT-REDEMPTION-ANNOUNCEMENT-RENDERER': 'redeem',
      'YT-LIVE-CHAT-PAID-STICKER-RENDERER': 'sticker',
      'YT-LIVE-CHAT-PARTICIPANT-RENDERER': 'participant'//, // maybe make another handler for participants?
      // 'YT-LIVE-CHAT-VIEWER-ENGAGEMENT-MESSAGE-RENDERER': 'engagement' // includes poll results
    }
    const tag = node.tagName
    const isMessage = tag in tagDict
    let messageType = null
    if (isMessage) {
      messageType = tagDict[tag]
    }
    return { isMessage, messageType }
  }

  isObservedMessage (node) {
    return node.getAttribute('bytg-id') !== null
  }

  hideAvatars () {
    if (!document.getElementById('bytg-avatar-sheet')) document.body.appendChild(this.avatarSheet)
  }

  hideMessages () {
    if (!document.getElementById('bytg-message-sheet')) document.body.appendChild(this.messageSheet)
  }

  hideReactions () {
    if (!document.getElementById('bytg-reaction-sheet')) document.body.appendChild(this.reactionSheet)
  }

  showOverflow () {
    if (!document.getElementById('bytg-overflow-sheet')) document.body.appendChild(this.overflowSheet)
  }

  showAvatars () {
    const sheetPresent = document.getElementById('bytg-avatar-sheet')
    if (sheetPresent) {
      sheetPresent.parentNode.removeChild(sheetPresent)
    }
  }

  showMessages () {
    const sheetPresent = document.getElementById('bytg-message-sheet')
    if (sheetPresent) {
      sheetPresent.parentNode.removeChild(sheetPresent)
    }
  }

  showReactions () {
    const sheetPresent = document.getElementById('bytg-reaction-sheet')
    if (sheetPresent) {
      sheetPresent.parentNode.removeChild(sheetPresent)
    }
  }

  hideOverflow () {
    const sheetPresent = document.getElementById('bytg-overflow-sheet')
    if (sheetPresent) {
      sheetPresent.parentNode.removeChild(sheetPresent)
    }
  }

  toggleAvatars () {
    if (PersistentSyncStorage.data.options.disableAvatars) {
      this.hideAvatars()
    } else {
      this.showAvatars()
    }
  }

  toggleMessages () {
    if (PersistentSyncStorage.data.options.hideMessages) {
      this.hideMessages()
    } else {
      this.showMessages()
    }
  }

  toggleReactions () {
    if (PersistentSyncStorage.data.options.hideReactions) {
      this.hideReactions()
    } else {
      this.showReactions()
    }
  }

  toggleOverflow () {
    if (PersistentSyncStorage.data.options.showOverflow) {
      this.showOverflow()
    } else {
      this.hideOverflow()
    }
  }
}

export default ChatWatcher
