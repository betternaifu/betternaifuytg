import OpenActiveTab from './OpenActiveTab'

class Icon {
  constructor () {
    this._colors = ['red', 'gray']
    this._sizes = ['16', '48', '128']
    this._path = './assets/icons/'

    this.paths = {}
    this.onClickUrls = {
      red: chrome.runtime.getURL('html/options.html'),
      gray: chrome.runtime.getURL('html/options.html')
    }

    this._createPaths()
    this._bindOnClick()
  }

  _filename (color, size) {
    return `BetterYTG_${color}_${size}.png`
  }

  _createPaths () {
    this._colors.forEach(color => {
      this.paths[color] = {}
      this._sizes.forEach(size => {
        this.paths[color][size] = this._path + this._filename(color, size)
      })
    })
  }

  _bindOnClick () {
    chrome.browserAction.onClicked.addListener(() => {
      const url = this.onClickUrls[this.currentColor]
      OpenActiveTab(url)
    })
  }

  set (color, tab) {
    this.currentColor = color
    if (Number.isInteger(tab)) {
      chrome.browserAction.setIcon({ path: this.paths[color], tabId: tab })
    } else {
      chrome.browserAction.setIcon({ path: this.paths[color] })
    }
  }

  setBadgeText (badgeText, tab) {
    if (Number.isInteger(tab)) {
      chrome.browserAction.setBadgeText({ text: badgeText, tabId: tab })
    } else {
      chrome.browserAction.setBadgeText({ text: badgeText })
    }
  }

  setBadgeTextColor (textColor, tab) {
    if (Number.isInteger(tab)) {
      chrome.browserAction.setBadgeTextColor({ color: textColor, tabId: tab })
    } else {
      chrome.browserAction.setBadgeTextColor({ color: textColor })
    }
  }

  setBadgeBackgroundColor (backgroundColor, tab) {
    if (Number.isInteger(tab)) {
      chrome.browserAction.setBadgeBackgroundColor({ color: backgroundColor, tabId: tab })
    } else {
      chrome.browserAction.setBadgeBackgroundColor({ color: backgroundColor })
    }
  }

  setBadgeTitle (text, tab) {
    if (Number.isInteger(tab)) {
      chrome.browserAction.setTitle({ title: text, tabId: tab })
    } else {
      chrome.browserAction.setTitle({ title: text })
    }
  }
}

export default new Icon()
