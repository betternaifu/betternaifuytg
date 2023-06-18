import './stylus/options.styl'

import { debounce } from 'lodash'

import PersistentSyncStorage from './helpers/PersistentSyncStorage'

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

// Executed code
const OptionInputs = document.querySelectorAll('.option-input')

PersistentSyncStorage.on('ready', () => {
  OptionInputs.forEach((input) => {
    const inputOnChange = optionOnChange(input)
    input.addEventListener('change', inputOnChange)

    input.removeAttribute('disabled')
  })
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
