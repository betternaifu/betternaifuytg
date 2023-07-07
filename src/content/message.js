import PersistentSyncStorage from 'src/helpers/PersistentSyncStorage'

class Message {
  constructor (messageNode, messageType, source, emotes, authorAvatar) {
    this.emotes = emotes
    this.node = messageNode
    this.messageType = messageType
    this.id = this.node.id // this.id should not be used to reference the node, dom id changes due to optimistic updates
    this.hasEmotes = null
    this.observer = null
    this.parsedText = '' // This should be fine since you can't edit/change messages
    this.mention = null

    this.keyword = null
    this.lockkeyword = false
    this.hmkeyword = null
    this.lockhmkeyword = false
    this.hideThisMessage = false
    this.searchText = ''

    this.source = source || 'chat' // not used atm, chat/banner/docker/ticker/participants

    // this.colorId = null;

    // this.backgroundLuminance = null;

    this.authorAvatar = authorAvatar

    const checkForEmotes = (res) => {
      if (this.emotes?.dictionary.size || this.emotes?.doneLoading()) {
        res()
      } else {
        setTimeout(checkForEmotes.bind(this, res), 100)
      }
    }
    const waitForEmotes = new Promise(checkForEmotes)

    const checkExistingColor = (res, rej) => {
      if (this.node.className.includes('BYTG-chat-color-')) {
        this.node.className = this.node.className.replaceAll(/BYTG-chat-color-.\W*/g, '')
        setTimeout(checkExistingColor.bind(this, res, rej), 10)
      } else {
        res()
      }
    }
    const waitForColor = new Promise(checkExistingColor)

    waitForEmotes.then(() => {
      if (this.node) { // this.messageType !== "gift" && this.messageType !== "redeem" && this.messageType !== "participant"){
        this.parseText()

        if (PersistentSyncStorage.data.options.hideMessageKeywords) {
          this.generateHMKeyword()
          try {
            this.hideKeywords()
          } catch (err) { console.warn(`Couldn't hide keywords for message source ${this.source} type ${this.messageType} id ${this.id}: ${err}`) }
        }

        if (this.hideThisMessage) {
          this.node.style.display = 'none'
          this.destroy()
          return
        }

        if (PersistentSyncStorage.data.options.highlightKeywords) {
          this.generateKeyword()
          try {
            this.highlightKeywords()
          } catch (err) { console.warn(`Couldn't highlight keywords for message source ${this.source} type ${this.messageType} id ${this.id}: ${err}`) }
        }

        if (this.hasEmotes) {
          this.node.setAttribute('bytg-id', this.id)
          this.insertMentions()
          this.setHtml()
        }
      }
    })

    if (this.messageType === 'message' || this.messageType === 'redeem' || this.messageType === 'participant') {
      if (PersistentSyncStorage.data.options.moveBadges) {
        this.moveBadges()
      }

      waitForColor.then(() => {
        if (PersistentSyncStorage.data.options.enableChatColors) {
          if (this.node.getAttribute('author-type') !== 'owner' && !this.node.querySelector('#author-name.owner')) this.setAuthorColor()
        }
      })
    }

    this.addBadgeTitles()
  }

  get textNode () {
    const node = this.node.querySelector('#message')
    return {
      node,
      htmltext: node.innerHTML
    }
  }

  parseTag (tag, name) {
    if (tag.includes('class="yt-img bytg-img"')) {
      return tag
    } else {
      const innerTag = tag.substring(0, tag.length - 1).replace(/(?<=class=")[^"]+(?=")/g, 'yt-img bytg-img').replace(/id="[^"]+"/g, '').replace(/shared-tooltip-text="[^"]+"/g, '') + ` title="${name + ' (YT)'}">`
      const newTag = `<span class="BYTG-Emote" custom-tooltip-text="${name}">` + innerTag + '</span>'
      return newTag
    }
  }

  parseText () {
    if (this.messageType === 'participant' || this.messageType === 'sticker') {
      return
    } else if (this.messageType === 'redeem') {
      this.searchText = this.node.querySelector('#message').textContent; return
    } else if (this.messageType === 'gift') {
      this.searchText = this.node.querySelector('#primary-text').textContent; return
    };

    if (this.textNode.htmltext.includes('<span class="mention')) this.mention = this.textNode.htmltext.match(/(?<=<span class="mention[^>]+>@{0,1}).+(?=<\/span>)/i)[0].toLowerCase()
    const tobeparsed = this.mention ? this.textNode.htmltext.trim().replaceAll(/<span class="mention[^>]+>|<\/span>/g, '') : this.textNode.htmltext.trim()
    const tags = Array.from(tobeparsed.matchAll(/<[^>]+>/g))
    const lines = tobeparsed.split(/<[^>]+>/g)

    let prefixed = false
    let prevHeight = null
    let prevWidth = null
    let groupCount = 0
    let groupWidth = 0
    const SPACEWIDTH = 3.2
    let prevShift = 0
    let grouped = false

    for (let i = 0, length = lines.length; i < length; i++) {
      const rawWords = lines[i].split(/[\n ]/g)
      for (let j = 0, len = rawWords.length; j < len; j++) {
        const word = this.parseIllegalCharacters(rawWords[j])
        const rawword = word.replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&')

        this.searchText += rawword

        const emote = this.emotes.get(rawword)

        if (typeof emote === 'undefined' || this.emotes.screen(rawword)) {
          this.parsedText += word
          if (word.trim() !== '') {
            prefixed = false
            prevHeight = null
            prevWidth = null
            groupCount = 0
            groupWidth = 0
            prevShift = 0
            grouped = false
          }
        } else {
          this.hasEmotes = true
          if (prefixed) {
            if (emote.style) {
              if (emote.style.group) {
                const effWidth = groupCount * SPACEWIDTH + groupWidth
                const calcWidth = Math.round(effWidth < emote.width ? effWidth : (effWidth + emote.width) / 2 + SPACEWIDTH + emote.style.left)
                this.parsedText += emote.html(prefixed, calcWidth)
                groupWidth += Math.max(0, emote.width - calcWidth)
                prevShift += Math.max(0, emote.width - calcWidth)
                groupCount += 1
                grouped = true
              } else {
                const calcWidth = Math.round((prevWidth + emote.width) / 2 + SPACEWIDTH + emote.style.left + prevShift)
                const calcHeight = emote.style.up ? Math.floor(prevHeight / 2 + emote.style.up) : 0
                this.parsedText += emote.html(prefixed, calcWidth, calcHeight)
                groupWidth += Math.max(0, emote.width - calcWidth)
                prevShift += Math.max(0, emote.width - calcWidth)
                groupCount += 1
              }
            } else {
              this.parsedText += emote.html(prefixed)
              prevHeight = emote.height
              prevWidth = emote.width
              groupCount += 1
              groupWidth += emote.width
              prevShift = 0
              if (grouped) {
                groupCount = 1
                groupWidth = emote.width
                grouped = false
              }
            }
          } else {
            this.parsedText += emote.html(prefixed)
            prevHeight = emote.height
            prevWidth = emote.width
            groupCount = 1
            groupWidth = emote.width
            prevShift = 0
            grouped = false
          }
          prefixed = true
        }

        if (j < rawWords.length - 1) {
          this.parsedText += ' '
          this.searchText += ' '
        }
      }

      if (i < tags.length) {
        const tag = tags[i][0]
        if (tag.includes('emoji')) {
          let name = tag.match(/(?<=shared-tooltip-text=")[^\s"]+/g)
          if (name !== null) {
            name = name[0]
          } else {
            name = tag.match(/(?<=alt=")[^\s"]+/g)[0]
          }
          if (name === null) {
            console.log(`No valid alt or shared-tooltip-text attribute for native emoji class. Custom tooltip, keyword highlighting, blacklist features won't be applied for this emote.\nMessage ${this.id}: ` + tag)
            this.parsedText += tag
            prefixed = true
            prevHeight = 24
            prevWidth = 24
            groupCount += 1
            groupWidth += 24
            prevShift = 0
          } else {
            this.searchText += name + ' '
            if (this.emotes.screen(name)) {
              this.parsedText += name + ' '
              this.hasEmotes = true
              prefixed = false
              prevHeight = null
              prevWidth = null
              groupCount = 0
              groupWidth = 0
              prevShift = 0
            } else {
              if (PersistentSyncStorage.data.options.replaceTooltips) {
                this.parsedText += this.parseTag(tag, name)
                this.hasEmotes = true
              } else {
                this.parsedText += tag
              }
              prefixed = true
              prevHeight = 24
              prevWidth = 24
              groupCount += 1
              groupCount += 24
              prevShift = 0
            }
          }
        } else {
          this.parsedText += tag
        }
      }
    }
  }

  insertMentions () {
    if (this.mention) {
      let newText = ''
      const re = new RegExp(`@{0,1}${this.mention}`, 'ig')
      const tags = Array.from(this.parsedText.matchAll(/<[^>]+>/g))
      const text = this.parsedText.split(/<[^>]+>/g)
      for (let i = 0; i < text.length; i++) {
        newText += text[i].replaceAll(re, '<span class="mention style-scope yt-live-chat-text-message-renderer">$&</span>')
        newText += i === text.length - 1 ? '' : tags[i]
      }
      this.parsedText = newText
    }
  }

  generateKeyword () {
    try {
      if (PersistentSyncStorage.data.options.caseInsensitive) {
        this.keyword = new RegExp(PersistentSyncStorage.data.options.highlightKeywords, 'i')
      } else {
        this.keyword = new RegExp(PersistentSyncStorage.data.options.highlightKeywords)
      }
    } catch (e) {
      this.lockkeyword = true
      const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
        highlightKeywords: ''
      })
      PersistentSyncStorage.set({ options: updatedOptions })
      this.keyword = null
      if (e instanceof SyntaxError) {
        console.warn('Invalid keyword regex!\n' + e)
      } else {
        throw e
      }
    }
  }

  generateHMKeyword () {
    try {
      if (PersistentSyncStorage.data.options.caseInsensitiveHMK) {
        this.hmkeyword = new RegExp(PersistentSyncStorage.data.options.hideMessageKeywords, 'i')
      } else {
        this.hmkeyword = new RegExp(PersistentSyncStorage.data.options.hideMessageKeywords)
      }
    } catch (e) {
      this.lockhmkeyword = true
      const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
        hideMessageKeywords: ''
      })
      PersistentSyncStorage.set({ options: updatedOptions })
      this.hmkeyword = null
      if (e instanceof SyntaxError) {
        console.warn('Invalid keyword regex!\n' + e)
      } else {
        throw e
      }
    }
  }

  hexToRGB (hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.toLowerCase()
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b
    })

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    let rgb = null
    if (result) {
      rgb = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    }
    return rgb
  }

  hideKeywords () {
    if (this.hmkeyword && !this.lockhmkeyword) {
      if (PersistentSyncStorage.data.options.hideUsernames) {
        const username = this.node.querySelector('#author-name')
        if (username.textContent.match(this.hmkeyword)) this.hideThisMessage = true
        return
      }
      if (this.searchText.match(this.hmkeyword)) this.hideThisMessage = true
    }
  }

  highlightKeywords () {
    if (this.keyword && !this.lockkeyword) {
      const username = this.node.querySelector('#author-name')
      let matched = false
      if (this.searchText.match(this.keyword)) {
        matched = true

        if (this.messageType === 'message') {
          this.node.style = `background-color: ${PersistentSyncStorage.data.options.highlightColor}; box-shadow: 0 0 1px 1px var(--yt-live-chat-primary-text-color);`

          const hex = PersistentSyncStorage.data.options.highlightColor
          let rgb = null
          rgb = this.hexToRGB(hex)
          if (rgb !== null) {
            // this.backgroundLuminance = rgb.r*0.299+rgb.g*0.587+rgb.b*0.114;
            if (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114 > 186) {
              this.textNode.node.style = 'color: black !important;'
              this.node.querySelector('#timestamp').style.color = 'black'
            } else {
              this.textNode.node.style = 'color: white !important;'
              this.node.querySelector('#timestamp').style.color = 'white'
            }
          }
        } else {
          switch (this.messageType) {
            case 'gift':
              this.node.querySelector('#header.ytd-sponsorships-live-chat-header-renderer').style = `box-shadow: 0 0 2px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
            case 'superchat':
              this.node.querySelector('#card').style = `box-shadow: 0 0 2px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              this.node.querySelector('#content').style = `box-shadow: inset 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
            case 'resub':
              this.node.querySelector('#card').style = `box-shadow: 0 0 5px 5px ${PersistentSyncStorage.data.options.highlightColor};`
              this.node.querySelector('#content').style = `box-shadow: inset 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
            case 'redeem':
              this.node.querySelector('#content').style = `box-shadow: 0 0 2px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
          }
        }
      }
      if (username.textContent.match(this.keyword)) {
        if (this.messageType === 'message') {
          let style = ''
          if (!username.parentElement.hasAttribute('is-highlighted')) {
            style += 'background-color: var(--yt-live-chat-background-color); padding: 2px 4px;'
          }
          if (!matched) {
            if (username.parentElement.hasAttribute('is-highlighted')) {
              style += 'box-shadow: 0 0 2px 1px var(--yt-live-chat-primary-text-color);'
            } else {
              style += `box-shadow: 0 0 2px 1px ${PersistentSyncStorage.data.options.highlightColor};`
            }
          } else {
            if (!username.parentElement.hasAttribute('is-highlighted')) {
              style += 'box-shadow: inset 0 0 2px 2px var(--yt-live-chat-primary-text-color);'// ${PersistentSyncStorage.data.options["highlightColor"]}, `
              // style += this.backgroundLuminance > 186 ? '0 0 1px 1px black;' : '0 0 1px 1px white;'//this.backgroundLuminance > 186 ? 'box-shadow: 0 0 1px 1px black' : 'box-shadow: 0 0 1px 1px white';
            } else {
              style += 'box-shadow: 0 0 2px 1px var(--yt-live-chat-background-color);'
            }
          }
          username.style = style
        } else {
          switch (this.messageType) {
            case 'gift':
              username.style = `box-shadow: 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};` // or just use white
              break
            case 'superchat':
              this.node.querySelector('#header').style = `box-shadow: inset 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
            case 'resub':
              this.node.querySelector('#header').style = `box-shadow: inset 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
            case 'redeem':
              if (username.parentElement.hasAttribute('is-highlighted')) {
                username.style = 'box-shadow: 0 0 2px 1px var(--yt-live-chat-primary-text-color);'
              } else {
                username.style = `box-shadow: 0 0 2px 1px ${PersistentSyncStorage.data.options.highlightColor};`
              }
              break
            case 'participant':
              if (username.parentElement.hasAttribute('is-highlighted')) {
                username.style = 'box-shadow: 0 0 5px 2px var(--yt-live-chat-primary-text-color);'
              } else {
                username.style = `box-shadow: 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              }
              break
            case 'sticker':
              username.style = `box-shadow: 0 0 5px 2px ${PersistentSyncStorage.data.options.highlightColor};`
              break
          }
        }
      } else if (matched && !username.parentElement.hasAttribute('is-highlighted') && this.messageType === 'message') {
        username.style = 'background-color: var(--yt-live-chat-background-color); padding: 2px 4px;'
      }
    }
  }

  watch (limit) {
    this.resets = 0
    this.observer = new MutationObserver((mutations) => {
      let emoteRemoved = false

      mutations.forEach((mutation) => {
        if (typeof mutation.removedNodes === 'undefined') return
        if (mutation.removedNodes.length <= 0) return // This must be after undefined check

        for (let i = 0, length = mutation.removedNodes.length; i < length; i++) {
          const removedNode = mutation.removedNodes[i]
          if (typeof removedNode.className === 'string' && // check if className exists, is 'SVGAnimatedString' when window resized and removed
            ~removedNode.className.indexOf('BYTG-Emote') !== 0) {
            emoteRemoved = true
          }
        }
      })

      if (emoteRemoved && document.body.contains(this.node)) {
        if (this.textNode.node.innerHTML !== this.parsedText) {
          this.resets += 1
          this.textNode.node.innerHTML = this.parsedText
        }
        if (this.resets >= limit) this.destroy()
      }
    })

    this.observer.observe(this.node, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    })

    setTimeout(this.destroy, 2500)
  }

  setHtml () {
    this.textNode.node.innerHTML = this.parsedText
    if (this.node.querySelector('#img').src === this.authorAvatar) { // workaround for reset html for own sent messages
      this.watch(2)
    }
  }

  moveBadges () {
    const checkForAuthor = (res, rej) => {
      const authorElt = this.node.querySelector('yt-live-chat-author-chip')
      if (authorElt !== null) {
        res()
      } else {
        setTimeout(checkForAuthor.bind(this, res, rej), 10)
      }
    }
    const waitForAuthor = new Promise(checkForAuthor)
    waitForAuthor.then(() => {
      const author = this.node.querySelector('yt-live-chat-author-chip')
      const badges = author.querySelector('#chat-badges')
      const username = author.querySelector('#author-name')
      badges.style.marginRight = '2px'
      author.insertBefore(badges, username)
    })
  }

  addBadgeTitles () {
    const badges = this.node.querySelectorAll('yt-live-chat-author-badge-renderer')
    badges.forEach((badge) => {
      badge.setAttribute('title', badge.getAttribute('aria-label'))
    })
  }

  setAuthorColor () {
    const checkForImage = (res, rej) => {
      const imgElt = this.node.querySelector('#img')
      if (imgElt !== null && imgElt.src[0] === 'h') {
        res()
      } else {
        setTimeout(checkForImage.bind(this, res, rej), 10)
      }
    }
    const waitForImage = new Promise(checkForImage)
    waitForImage.then(() => {
      let imageSrc = this.node.querySelector('#img').src
      const parsedURLId = imageSrc.match(/(?<=[/])[a-zA-Z0-9-_]*(?==)/)[0]
      const colorId = parsedURLId[Math.floor(parsedURLId.length / 2)]
      if (colorId) {
        // this.colorId = colorId;
        this.node.classList.add(`BYTG-chat-color-${colorId}`)
      } else {
        console.warn(`Couldn't get colorID from ${parsedURLId[parsedURLId.length / 2]} url`)
      }
    })
  }

  parseIllegalCharacters (word) {
    // ﻿ === 'ZERO WIDTH NO-BREAK SPACE'
    return word.replace('﻿', '').trim()
  }

  destroy () {
    if (this.observer !== null) {
      this.observer?.disconnect()
      this.observer = null
    }
  }
}

export default Message
