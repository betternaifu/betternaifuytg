// import specific options for firefox styl here
import './stylus/options.styl'

// import dateFormat from 'date-fns/format'; //package.json dependency "date-fns": "^1.30.1"
import { debounce } from 'lodash'

import PersistentSyncStorage from './helpers/PersistentSyncStorage'

// The reason we started a separate options.js for firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1292701

// Function Definitions

const hideDebounce = debounce(ele => {
  ele.classList.remove('show')
}, 1000)

const setSavingStatus = (status) => {
  const SaveStatusEle = document.getElementById('save-status')

  switch (status) {
    case 'saving':
      SaveStatusEle.innerHTML = 'Saving ...'
      break
    case 'saved':
      SaveStatusEle.innerHTML = 'Saved'
      hideDebounce(SaveStatusEle)
      break
    default:
      SaveStatusEle.innerHTML = '&nbsp;'
  }

  SaveStatusEle.classList.add('show')
}

const optionOnChange = (input) => {
  const isCheckbox = input.type === 'checkbox'
  const inputValueKey = isCheckbox ? 'checked' : 'value'

  if (PersistentSyncStorage.data.options.hasOwnProperty(input.id)) {
    input[inputValueKey] = PersistentSyncStorage.data.options[input.id]
  }

  // const eventType = 'change';

  const onChange = (() => {
    const saveOption = () => {
      setSavingStatus('saving')
      const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
        [input.id]: input[inputValueKey]
      })
      PersistentSyncStorage.set({ options: updatedOptions })
        .then(() => {
          setSavingStatus('saved')
        })
    }

    return saveOption
  })()

  return onChange
}

const colorChange = (input) => {
  if (PersistentSyncStorage.data.options.hasOwnProperty(input.id)) {
    input.value = PersistentSyncStorage.data.options[input.id]
  }

  const onChange = (() => {
    const saveOption = () => {
      if (input.checkValidity() && input.value !== '') {
        setSavingStatus('saving')
        const updatedOptions = Object.assign({}, PersistentSyncStorage.data.options, {
          [input.id]: input.value
        })
        PersistentSyncStorage.set({ options: updatedOptions })
          .then(() => {
            setSavingStatus('saved')
          })
      }
    }
    return saveOption
  })()

  return onChange
}

// https://stackoverflow.com/a/5624139
function hexToRgb (hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  hex = hex.toLowerCase()
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b
  })

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
} // rgb then determines font color according to https://stackoverflow.com/a/3943023

// Executed code
const OptionInputs = document.querySelectorAll('.option-input')
const colorpicker = document.getElementById('highlightColor')
const colortext = document.getElementById('colorText')

PersistentSyncStorage.on('ready', () => {
  OptionInputs.forEach((input) => {
    const inputOnChange = input.id === 'highlightColor' ? colorChange(input) : optionOnChange(input)
    input.addEventListener('change', inputOnChange)

    input.removeAttribute('disabled')
  })

  colorpicker.addEventListener('change', (event) => {
    if (colorpicker.checkValidity() && event.target.value !== '') {
      colortext.innerText = 'Highlight color*:'
      colortext.style.backgroundColor = event.target.value
      const { r, g, b } = hexToRgb(colorpicker.value)
      if (r * 0.299 + g * 0.587 + b * 0.114 > 186) { colortext.style.color = '#000000' } else { colortext.style.color = '#ffffff' }
    } else {
      colortext.innerText = 'Invalid hex code*:'
      colortext.style.backgroundColor = ''
      colortext.style.color = 'red'
      setTimeout(() => {
        colortext.innerText = 'Highlight color*:'
        colorpicker.value = PersistentSyncStorage.data.options.highlightColor
        colortext.style.backgroundColor = colorpicker.value
        const { r, g, b } = hexToRgb(colorpicker.value)
        if (r * 0.299 + g * 0.587 + b * 0.114 > 186) { colortext.style.color = '#000000' } else { colortext.style.color = '#ffffff' }
      }, 750)
    }
  })

  if (!colorpicker.checkValidity()) {
    colortext.innerText = 'Invalid hex code*:'
    colortext.style.backgroundColor = ''
    colortext.style.color = 'red'
    setTimeout(() => {
      colortext.innerText = 'Highlight color*:'
      colorpicker.value = PersistentSyncStorage.data.options.highlightColor
      colortext.style.backgroundColor = colorpicker.value
      const { r, g, b } = hexToRgb(colorpicker.value)
      if (r * 0.299 + g * 0.587 + b * 0.114 > 186) { colortext.style.color = '#000000' } else { colortext.style.color = '#ffffff' }
    }, 250)
  } else {
    colortext.innerText = 'Highlight color*:'
    colortext.style.backgroundColor = colorpicker.value
    const { r, g, b } = hexToRgb(colorpicker.value)
    if (r * 0.299 + g * 0.587 + b * 0.114 > 186) { colortext.style.color = '#000000' } else { colortext.style.color = '#ffffff' }
    /* var arr = [r,g,b];
    arr.map((c)=>{var v=c/255.0;if(v<=0.04045){v=v/12.92;}else{v=((v+0.055)/1.055)**2.4;}});
    var L=0.2126*arr[0]+0.7152*arr[1]+0.0722*arr[2];
    if(L>0.179){colortext.style.color='#000000';}else{colortext.style.color='#ffffff';} */
  }
})

const toClick = document.querySelectorAll('div.options-description[id]')
const optionIds = ['emote-options', 'site-options', 'chat-options']
const onClick = (event) => {
  event.target.innerText = event.target.innerText === '[click to expand section]' ? '[click to collapse section]' : '[click to expand section]'
  const targetDisplay = event.target.innerText === '[click to expand section]' ? 'none' : 'block'
  optionIds.forEach((sectionId) => {
    document.querySelector(`div.options-table#${sectionId}`).style.display = sectionId === event.target.id ? targetDisplay : 'none'
  })
  toClick.forEach((optionsDescription) => {
    if (optionsDescription.id !== event.target.id)optionsDescription.innerText = '[click to expand section]'
  })
}
window.addEventListener('load', (event) => { toClick.forEach((section) => { section.addEventListener('click', onClick) }) })
