class Emote {
  constructor ({ code, url, source, style, height, width }) {
    this.code = code
    this.url = url
    this.source = (source === 'Custom') ? '' : ` (${source})`
    this.style = style || false
    this.height = Math.min(height, 28)
    this.width = Math.round(width * this.height / height)
  }

  html (prefixed, calcWidth, calcHeight, transform) {
    if (prefixed && this.style) {
      return (`
      <span class="BYTG-Emote" custom-tooltip-text="${this.code}">
      <img class="bytg-img" src="${this.url}" alt="${this.code}" title="${this.code + this.source}" style="margin-left: -${calcWidth.toString()}px;${calcHeight ? ' margin-top: -' + calcHeight.toString() + 'px;' : ''}">
      </span>
      `).trim()
    } else {
      return (`
      <span class="BYTG-Emote" custom-tooltip-text="${this.code}">
      <img class="bytg-img" src="${this.url}" alt="${this.code}" title="${this.code + this.source}">
      </span>
      `).trim()
    }
  }
}

export default Emote
