import PersistentSyncStorage from '../helpers/PersistentSyncStorage'
import Icon from '../helpers/Icon'

import CONFIG from '../config'

const ensure = () => {
  return new Promise((res, rej) => {
    // Resolves if setup is complete
    if (PersistentSyncStorage.data.setupComplete) {
      // Ensure new options (on extension update) are added to options object
      PersistentSyncStorage.set({
        options: Object.assign({}, CONFIG.defaultOptions, PersistentSyncStorage.data.options)
      })
      return res()
    }

    // Otherwise inits setup
    const onSetupComplete = (message, sender, sendResponse) => {
      if (message.name === 'setupComplete') {
        chrome.runtime.onMessage.removeListener(onSetupComplete)
        PersistentSyncStorage.set({ setupComplete: true })
        sendResponse() // to avoid `Unchecked runtime.lastError: The message port closed before a response was received.`
        res()
      }
    }

    Icon.set('gray')
    Icon.setBadgeTitle('BetterNaifuYTG (off)')
    chrome.tabs.create({ url: './html/setup.html' })
    chrome.runtime.onMessage.addListener(onSetupComplete)
  })
}

export default {
  ensure
}
