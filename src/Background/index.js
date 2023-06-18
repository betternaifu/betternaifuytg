import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'
import Icon from 'src/helpers/Icon'

import Setup from './Setup'

import CONFIG from 'src/config'

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
        const topVal = Math.round((window.height - 533) * 0.2 + window.top)
        chrome.windows.create({
          url: 'html/options.html',
          type: 'popup',
          height: 533,
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
    const disableAutoEmoji = 'var script=document.createElement(\'script\');script.text="var renderer=document.querySelector(\'iframe#chatframe\')?.contentDocument.querySelector(\'yt-live-chat-text-input-field-renderer#input.yt-live-chat-message-input-renderer\')??document.querySelector(\'yt-live-chat-text-input-field-renderer#input.yt-live-chat-message-input-renderer\');renderer.completeEmojis=()=>{};renderer.completeEmojis_=()=>{};renderer.completeEmojisInRange=()=>{};";script.type=\'text/javascript\';var node=document.querySelector(\'yt-live-chat-text-input-field-renderer\')??document.querySelector(\'iframe#chatframe\').contentDocument.querySelector(\'yt-live-chat-text-input-field-renderer\');node.appendChild(script);'
    const fixMemLeaks = String.raw`var script=document.createElement('script');script.text="function fixSchedulerLeak(){const scheduler=window.ytglobal?.schedulerInstanceInstance_;if(!scheduler){console.warn('fixSchedulerLeak: schedulerInstanceInstance_ is missing');return false;};const code=''+scheduler.constructor;const splitCode=code.split('.useRaf')[0].split('this.');const targetCode=splitCode[splitCode.length-1];const p1=targetCode.match(/^(\\w+)\\s*=\\s*/);const p2=code.match(/\\([\'\"]visibilitychange[\'\"],\\s*this\\.(\\w+)\\)/);if(!p1||!p2){console.warn('fixSchedulerLeak: unknown code');return false;};const useRafProp=p1[1];const visChgProp=p2[1];if(scheduler[useRafProp]){/*console.info('fixSchedulerLeak: no work needed');*/return false;};scheduler[useRafProp]=true;document.addEventListener('visibilitychange',scheduler[visChgProp]);console.info('fixSchedulerLeak: leak fixed');return true;};function enableElementPool(){const ytcfg=window.ytcfg;if(!ytcfg){console.warn('enableElementPool: ytcfg is missing');return false;};if(ytcfg.get('ELEMENT_POOL_DEFAULT_CAP')){/*console.info('enableElementPool: no work needed');*/return false;};ytcfg.set('ELEMENT_POOL_DEFAULT_CAP',75);console.info('enableElementPool: element pool enabled');return true;};var fixedScheduler=fixSchedulerLeak();var enabledPool=enableElementPool();";script.type='text/javascript';var node=document.querySelector('yt-live-chat-item-list-renderer')||document.querySelector('iframe#chatframe').contentDocument.querySelector('yt-live-chat-item-list-renderer');node.appendChild(script);`

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.name === 'disableEmojiComplete') {
        chrome.tabs.executeScript(
          sender.tab.id,
          { allFrames: false, code: disableAutoEmoji },
          (result) => {}
        )
        sendResponse(PersistentSyncStorage.data.options.disableAutoEmoji)
      } else if (message.name === 'fixMemoryLeaks') {
        chrome.tabs.executeScript(
          sender.tab.id,
          { allFrames: false, code: fixMemLeaks },
          (result) => {}
        )
        sendResponse(PersistentSyncStorage.data.options.fixMemoryLeaks)
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
