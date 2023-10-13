import './stylus/setupPage.styl'

import PersistentSyncStorage from './helpers/PersistentSyncStorage'

// --- Definitions ---
const completeButton = document.querySelector('.complete-setup-button')
const successOverlay = document.querySelector('.success-overlay')
const successIcon = successOverlay.querySelector('.material-icons')
const successCloseMessageCountdown = successOverlay.querySelector('.countdown')

const setupComplete = () => {
  successOverlay.classList.add('show')

  setTimeout(() => {
    successIcon.classList.add('show')
  }, 100)

  let closeCountdown = 5 // seconds
  const closeTimeout = () => {
    successCloseMessageCountdown.innerHTML = '&nbsp;'
    successCloseMessageCountdown.append(closeCountdown === 2 ? '2?' : closeCountdown)
    setTimeout(() => {
      if (closeCountdown > 1) {
        closeCountdown -= 1
        closeTimeout()
      } else {
        chrome.tabs.getCurrent((tab) => {
          chrome.tabs.remove(tab.id)
        })
      }
    }, 1000)
  }

  successCloseMessageCountdown.append(closeCountdown)
  closeTimeout()
}

const iframe = document.getElementById('options')

const setDims = (event) => {
  iframe.height = '545'
  iframe.width = '395'
}

const iframeLoaded = (event) => {
  setDims(event)
  iframe.contentWindow.document.body.addEventListener('click', setDims)
}

// --- Main ---

const main = () => {
  iframe.addEventListener('load', iframeLoaded)

  completeButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ name: 'setupComplete' }, setupComplete)
  })
}

// --- Executed ---

main()

PersistentSyncStorage.on('ready', () => {
  if (!!PersistentSyncStorage.data.setupComplete === true) {
    console.warn('Setup is already complete')
  }
})
