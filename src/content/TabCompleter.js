import TrieSearch from 'trie-search'

class TabCompleter {
  constructor (inputNode) {
    this.node = inputNode

    this.options = null

    this.trie = null

    this.index = null
    this.words = null
    this.word = null
    this.saved = null
    this.possible = null
    this.position = null
    this.wordPos = null

    this.tooltip = null

    this.observer = null
  }

  init (arr) {
    return new Promise((res, rej) => {
      const defaults = {
        select: true,
        preventTabbing: true
      }
      this.options = Object.assign({}, defaults)
      this.trie = new TrieSearch('name')
      this.trie.addAll(arr)
      this.index = 0
      this.saved = false
      this.node.addEventListener('keydown', e => {
        if (e.keyCode === 9) { // tab key
          if (this.options.preventTabbing) e.preventDefault()
          if (!this.saved) {
            this.position = this.getCursorPosition()
            let tmpval = ''
            for (let node = this.node.firstChild; node; node = node.nextSibling) {
              if (node.nodeType === 3) {
                tmpval += node.textContent
              } else {
                tmpval += ' '
              }
            }
            this.node.normalize()
            this.words = tmpval.split(/\s/g)
            let lcount = 0
            for (let i = 0; i < this.words.length; i++) {
              const w = this.words[i]
              lcount += w.length + 1
              if (lcount > this.position) {
                this.word = this.words[i]
                this.wordPos = i
                break
              }
            }
            this.saved = true
            this.possible = this.trie.search(this.word)
          } else {
            if (e.shiftKey) { // shift held down
              this.index--
            } else {
              this.index++
            }
            document.getSelection().deleteFromDocument()
            this.position = this.getCursorPosition()
          }
          if (this.possible && this.possible.length > 0) {
            if (this.index >= this.possible.length) {
              this.index -= this.possible.length
            } else if (this.index < 0) {
              this.index += this.possible.length
            }
            e.preventDefault()
            const dupe = this.words.slice()
            if (typeof (this.options.getFormat) === 'function') {
              dupe[this.wordPos] = this.options.getFormat(this.possible[this.index].name, this.wordPos)
            } else {
              dupe[this.wordPos] = this.possible[this.index].name
            }
            if (typeof (this.options.onComplete) === 'function') {
              this.options.onComplete(this.word, this.possible, this.possible[this.index].name)
            }
            const newPos = dupe.slice(0, this.wordPos + 1).join(' ').length
            const editPos = newPos - dupe[this.wordPos].length
            const edit = this.getNodeOffset(editPos)
            const newTextContent = edit.resNode.textContent.substring(0, edit.resOffset) + dupe[this.wordPos] + edit.resNode.textContent.substring(edit.resOffset + this.word.length)
            edit.resNode.textContent = newTextContent
            this.node.dispatchEvent(new InputEvent('input', {})) // registers text
            if (this.options.select) {
              this.selectRange(editPos + this.word.length, newPos)
            } else {
              this.selectRange(newPos)
            }
            this.showTooltip(this.possible[this.index].name, this.possible[this.index].url) // For tooltip
          }
          if (this.options.preventTabbing) {
            e.preventDefault()
          }
        } else if (e.keyCode === 38 || e.keyCode === 40) { // up or down, respectively
          let change = -1
          if (e.keyCode === 38) change += 2
          if (this.saved) {
            e.preventDefault()
            this.index += change
            document.getSelection().deleteFromDocument()
            this.position = this.getCursorPosition()
            if (this.possible && this.possible.length > 0) {
              if (this.index >= this.possible.length) {
                this.index -= this.possible.length
              } else if (this.index < 0) {
                this.index += this.possible.length
              }
              const dupe = this.words.slice()
              if (typeof (this.options.getFormat) === 'function') {
                dupe[this.wordPos] = this.options.getFormat(this.possible[this.index].name, this.wordPos)
              } else {
                dupe[this.wordPos] = this.possible[this.index].name
              }
              if (typeof (this.options.onComplete) === 'function') {
                this.options.onComplete(this.word, this.possible, this.possible[this.index].name)
              }
              const newPos = dupe.slice(0, this.wordPos + 1).join(' ').length
              const editPos = newPos - dupe[this.wordPos].length
              const edit = this.getNodeOffset(editPos)
              const newTextContent = edit.resNode.textContent.substring(0, edit.resOffset) + dupe[this.wordPos] + edit.resNode.textContent.substring(edit.resOffset + this.word.length)
              edit.resNode.textContent = newTextContent
              this.node.dispatchEvent(new InputEvent('input', {})) // registers text
              if (this.options.select) {
                this.selectRange(editPos + this.word.length, newPos)
              } else {
                this.selectRange(newPos)
              }
              this.showTooltip(this.possible[this.index].name, this.possible[this.index].url) // For tooltip
            }
          }
        } else if (e.keyCode !== 16) { // NOT shift key on its own
          this.hideTooltip()
          if (e.keyCode === 13 && this.saved) { // enter key
            e.preventDefault()
            const selectionLength = document.getSelection().toString().length
            if (selectionLength > 0) {
              this.position += selectionLength
            } else {
              const pos = this.getNodeOffset(this.position)
              let toNextWord = 0
              for (const word of pos.resNode.textContent.split(' ')) {
                toNextWord += word.length + 1
                if (toNextWord > pos.resOffset) {
                  toNextWord -= 1
                  break
                }
              }
              this.position += toNextWord - pos.resOffset
            }
            let charCount = parseInt(document.getElementById('count').textContent.split('/')[0])
            for (let node = this.node.firstChild; node; node = node.nextSibling) {
              if (node.nodeType !== 3) {
                charCount -= 1
              }
            }
            if (this.position === charCount) {
              const edit = this.getNodeOffset(this.position)
              edit.resNode.textContent += '\u00A0' // &nbsp;
              this.node.dispatchEvent(new InputEvent('input', {})) // registers text
            } else {
              const curr = this.getNodeOffset(this.position)
              if (curr.resOffset === curr.resNode.textContent.length && curr.resNode.nextSibling) {
                if (curr.resNode.nextSibling.nodeType !== 3) this.position -= 1
              }
            }
            this.position += 1
            this.selectRange(this.position)
          }
          this.saved = false
          this.index = 0
        }
      })
      this.node.addEventListener('click', e => {
        this.saved = false
        this.index = 0
        this.position = this.getCursorPosition()
        this.hideTooltip()
      })
      this.node.addEventListener('keyup', e => {
        if (e.keyCode !== 9 && e.keyCode !== 16 && e.keyCode !== 38 && e.keyCode !== 40) {
          this.hideTooltip()
        }
      })
      this.node.addEventListener('focusout', () => {
        this.hideTooltip()
      })
      this.makeTooltip()
    })
  }

  getCursorPosition () {
    let index = 0
    const selection = document.getSelection()
    let anchorDist = 0
    const imgAnchor = this.node === selection.anchorNode
    const anchorOffset = selection.anchorOffset
    for (let node = this.node.firstChild; node; node = node.nextSibling) {
      anchorDist += 1
      const isSelectedNode = node === selection.focusNode
      if (imgAnchor && anchorDist > anchorOffset) {
        break
      }
      if (node.nodeType === 3) {
        if (isSelectedNode) {
          index += selection.focusOffset
          break
        } else {
          index += node.textContent.length
        }
      } else {
        if (imgAnchor && anchorDist > anchorOffset) {
          break
        }
        index += 1
      }
    }
    return index
  }

  getNodeOffset (index) {
    let counter = 0
    let resNode = null
    let resOffset = null
    for (let node = this.node.firstChild; node; node = node.nextSibling) {
      if (counter === index) {
        resNode = node
        resOffset = 0
        break
      }
      if (node.nodeType === 3) {
        if (counter + node.textContent.length >= index) {
          resNode = node
          resOffset = index - counter
          break
        } else {
          counter += node.textContent.length
        }
      } else {
        counter += 1
      }
    }
    if (resNode === null || resOffset === null) {
      console.warn(`Index ${index} is out of bounds!`)
    }
    return { resNode, resOffset }
  }

  selectRange (start, end) {
    if (!end) end = start
    if (this.node.setSelectionRange) {
      this.node.focus()
      this.node.setSelectionRange(start, end)
    } else {
      const range = document.createRange()
      range.collapse(true)
      const rangestart = this.getNodeOffset(start)
      if (end !== start) {
        const endrange = this.getNodeOffset(end)
        range.setEnd(endrange.resNode, endrange.resOffset)
      } else {
        range.setEnd(rangestart.resNode, rangestart.resOffset)
      }
      range.setStart(rangestart.resNode, rangestart.resOffset)
      document.getSelection().removeAllRanges()
      document.getSelection().addRange(range)
    }
  }

  makeTooltip () {
    const checkForTooltip = (res, rej) => {
      let existing = false
      this.tooltip = document.getElementById('tabcomplete-tooltip-container')
      if (!this.tooltip) {
        this.tooltip = document.createElement('div')
      } else {
        existing = true
      }
      if (this.tooltip !== null && this.tooltip !== undefined) {
        this.tooltip.id = 'tabcomplete-tooltip-container'
        this.tooltip.className = 'hiding'
        if (!existing) document.body.append(this.tooltip)
        res()
      } else {
        setTimeout(checkForTooltip.bind(this, res, rej), 250)
      }
    }
    return new Promise(checkForTooltip)
  }

  hideTooltip () {
    this.tooltip.classList.add('hiding')
  }

  showTooltip (name, url) {
    if (document.getSelection().toString().length >= 0) { // Can remove the equal case if you don't want completed names to get tooltip
      this.tooltip.classList.remove('hiding')
    }
    const rect = document.getSelection().getRangeAt(0).getBoundingClientRect()
    this.tooltip.style.position = 'fixed'
    this.tooltip.style.top = (rect.top - 40) + 'px'
    this.tooltip.style.left = (rect.left + 0.5 * rect.width) + 'px'
    this.tooltip.innerHTML = `<div class="tabcomplete-image-container"><img class="tabcomplete-image" src="${url}" alt="${name}"></div>`
  }
}

export default TabCompleter
