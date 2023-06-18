import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'
import Icon from 'src/helpers/Icon'

import Setup from './Setup'

import CONFIG from 'src/config'

import { fixLeaks, disableEmojiComplete } from './scripts.js'

class Main {
  constructor () {
    this.init = this.init.bind(this)

    PersistentSyncStorage.on('ready', () => {
      this.setupOptions()
      Setup.ensure().then(this.init)
    })
  }

  init () {
    Icon.set('gray')
    Icon.setBadgeTitle('BetterNaifuYTG (off)')
    this.handleOptionsPopup()
    this.insertScripts()
    this.updateIcon()
  }

  setupOptions () {
    // Ensure options store is setup
    if (!PersistentSyncStorage.has('options')) {
      PersistentSyncStorage.set({ options: CONFIG.defaultOptions })
    }
  }

  handleOptionsPopup () {
    // Options popup handling from button message
    const onPopupClose = (windowId) => {
      if (windowId === PersistentSyncStorage.data.options.optionsPopupId) {
        const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
          optionsPopupId: null
        })
        PersistentSyncStorage.set({ options: updatedOptions })
      }
    }

    const makeOptionsPopup = () => {
      chrome.windows.getCurrent((window) => {
        const leftVal = Math.round((window.width - 394) * 0.99 + window.left)
        const topVal = Math.round((window.height - 539) * 0.2 + window.top)
        chrome.windows.create({
          url: 'html/options.html',
          type: 'popup',
          height: 539,
          width: 394,
          left: leftVal,
          top: topVal
        }, (window) => {
          const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
            optionsPopupId: window.id
          })
          PersistentSyncStorage.set({ options: updatedOptions })
        })
      })
    }

    chrome.windows.onRemoved.addListener(onPopupClose)

    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.name === 'optionsPopup') {
        if (PersistentSyncStorage.data.options.optionsPopupId == null) {
          makeOptionsPopup()
        } else {
          chrome.windows.get(PersistentSyncStorage.data.options.optionsPopupId, {}, (window) => {
            if (!chrome.runtime.lastError && window) {
              chrome.windows.update(window.id, { focused: true }, () => {})
            } else { // I am not entirely sure it makes it here if needed
              makeOptionsPopup()
            }
          })
        }
      }
    })
  }

  insertScripts () {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        if (message.name === 'disableEmojiComplete') {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, allFrames: false },
            func: disableEmojiComplete,
            world: 'MAIN'
          })
          sendResponse(PersistentSyncStorage.data.options.disableAutoEmoji)
        } else if (message.name === 'fixMemoryLeaks') {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, allFrames: false },
            func: fixLeaks,
            world: 'MAIN'
          })
          sendResponse(PersistentSyncStorage.data.options.fixMemoryLeaks)
        }
      } catch (err) {
        console.error(`Failed to execute script: ${err}`)
      }
    })
  }

  updateIcon () {
    chrome.runtime.onMessage.addListener((message, sender, sendReponse) => {
      try {
        if (message.name === 'icon') {
          if (message.tab) {
            Icon.set(message.color, sender.tab.id)
            if (message.text)Icon.setBadgeText(message.text, sender.tab.id)
            if (message.textColor)Icon.setBadgeTextColor(message.textColor, sender.tab.id)
            if (message.background)Icon.setBadgeBackgroundColor(message.background, sender.tab.id)
            if (message.title)Icon.setBadgeTitle(message.title, sender.tab.id)
          } else {
            Icon.set(message.color)
            if (message.text)Icon.setBadgeText(message.text)
            if (message.background)Icon.setBadgeBackgroundColor(message.background)
            if (message.title)Icon.setBadgeTitle(message.title)
          }
        }
      } catch (err) { console.error(`Failed to update icon: ${err}`) }
    })
  }
}

const main = new Main()
