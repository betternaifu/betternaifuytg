const isFirefox = !chrome.app

class Notifications {
  create (notificationId = null, options) {
    // notificationId is optional
    if (typeof notificationId === 'object') {
      options = notificationId
      notificationId = null
    }

    if (!isFirefox) {
      return new Promise((res, rej) => {
        // resolve args = notificationId:string
        chrome.notifications.create(notificationId, options, res)
      })
    } else {
      return browser.notifications.create(notificationId, options)
    }
  }

  update (notificationId, options) {
    if (!isFirefox) {
      return new Promise((res, rej) => {
        // resolve args = wasUpdated:boolean
        chrome.notifications.update(notificationId, options, res)
      })
    } else {
      return browser.notifications.update(notificationId, options)
    }
  }

  clear (notificationId) {
    if (!isFirefox) {
      return new Promise((res, rej) => {
        // resolve args = wasCleared:boolean
        chrome.notifications.clear(notificationId, res)
      })
    } else {
      return browser.notifications.clear(notificationId)
    }
  }

  getAll () {
    if (!isFirefox) {
      return new Promise((res, rej) => {
        // resolve args = notifications:object
        chrome.notifications.getAll(res)
      })
    } else {
      return browser.notifications.getAll()
    }
  }

  getPermissionLevel () {
    if (!isFirefox) {
      return new Promise((res, rej) => {
        // resolve args = level:PermissionLevel (https://developer.chrome.com/apps/notifications#type-PermissionLevel)
        chrome.notifications.getPermissionLevel(res)
      })
    } else {
      return new Promise((res, rej) => {
        res = 'denied'
      })
    }
  }

  listen (event, notificationId = null, callback) {
    // event = 'onClosed' | 'onClicked' | 'onButtonClicked' | 'onPermissionLevelChanged' | 'onShowSettings'
    // notificationId is optional
    if (typeof notificationId === 'function') {
      callback = notificationId
      notificationId = null
    }

    if (event === 'onPermissionLevelChanged' || event === 'onShowSettings') {
      return this._nonNotificationIdListen(event, callback)
    }

    /**
     * https://developer.chrome.com/apps/notifications#events
     *
     * Resolve args (by event):
     * onClosed = notificationId:string, byUser:boolean
     * onClicked = notificationId:string
     * onButtonClicked = notificationId:string, buttonIndex:integer
     *
     * onPermissionLevelChanged = level:PermissionLevel (https://developer.chrome.com/apps/notifications#type-PermissionLevel)
     * onShowSettings = (none)
     */

    // This callback relates only to those events that have notificationId arg
    const ListenerCallback = (() => {
      if (notificationId !== null) {
        return (passedNotificationId, ...args) => {
          if (notificationId === passedNotificationId) {
            callback(passedNotificationId, ...args)
          }
        }
      } else {
        return callback
      }
    })()

    chrome.notifications[event].addListener(ListenerCallback)
  }

  _nonNotificationIdListen (event, callback) {
    chrome.notifications[event].addListener(callback)
  }
}

export default Notifications
