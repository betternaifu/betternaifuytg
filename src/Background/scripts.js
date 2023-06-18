/**
 * Modified JavaScript version of "https://github.com/LiveTL/HyperChat/blob/master/src/ts/ytc-fix-memleaks.ts" which is a...
 * Modified TypeScript version of "Workaround For Youtube Chat Memory Leaks" by
 * laversheet (https://twitter.com/laversheet).
 *
 * Original userscript: https://greasyfork.org/en/scripts/422206-workaround-for-youtube-chat-memory-leaks/code
 * @license BSD-3-Clause https://opensource.org/licenses/BSD-3-Clause
 */

// Original regex for p1 doesn't work for newer versions with "scheduler_use_raf_by_default" experimental flag (e.g. https://www.youtube.com/s/desktop/ad3ffe7b/jsbin/scheduler.vflset/scheduler.js)
// Used to work for older versions (e.g. https://www.youtube.com/s/desktop/a386e432/jsbin/scheduler.vflset/scheduler.js https://www.youtube.com/s/desktop/189c9def/jsbin/scheduler.vflset/scheduler.js)
// const p1 = code.match(/this\.(\w+)\s*=\s*!!\w+\.useRaf/);

/* Was originally at the start of fixSchedulerLeak */
// if (!window.requestAnimationFrame) {
//   console.warn('fixSchedulerLeak: window.requestAnimationFrame() is required, but missing');
//   return false;
// }

/*
* Currently (2022-06-13), youtube live chat has a bug that never execute some scheduled tasks (https://bugzilla.mozilla.org/show_bug.cgi?id=1678563).
* Those tasks are scheduled for each time a new message is added to the chat and hold the memory until being executed.
* This script will let the scheduler to execute those tasks so the memory held by those tasks could be freed.
*/

export function fixLeaks () {
  'use strict'

  function fixSchedulerLeak () {
    const scheduler = window.ytglobal?.schedulerInstanceInstance_
    if (!scheduler) {
      console.warn('fixSchedulerLeak: schedulerInstanceInstance_ is missing')
      return false
    }

    const code = '' + scheduler.constructor

    const splitCode = code.split('.useRaf')[0].split('this.')
    const targetCode = splitCode[splitCode.length - 1]
    const p1 = targetCode.match(/^(\w+)\s*=\s*/)
    const p2 = code.match(/\(['"]visibilitychange['"],\s*this\.(\w+)\)/)
    if (!p1 || !p2) {
      console.warn('fixSchedulerLeak: unknown code')
      return false
    }
    const useRafProp = p1[1]
    const visChgProp = p2[1]
    if (scheduler[useRafProp]) {
      // console.info('fixSchedulerLeak: no work needed');
      return false
    }
    scheduler[useRafProp] = true
    document.addEventListener('visibilitychange', scheduler[visChgProp])
    console.info('fixSchedulerLeak: leak fixed')
    return true
  }

  /* Enable the element pool to save memory consumption. */
  function enableElementPool () {
    const ytcfg = window.ytcfg
    if (!ytcfg) {
      console.warn('enableElementPool: ytcfg is missing')
      return false
    }
    if (ytcfg.get('ELEMENT_POOL_DEFAULT_CAP')) {
      // console.info('enableElementPool: no work needed');
      return false
    }
    ytcfg.set('ELEMENT_POOL_DEFAULT_CAP', 75)
    console.info('enableElementPool: element pool enabled')
    return true
  }

  const fixedScheduler = fixSchedulerLeak()
  const enabledPool = enableElementPool()
  return fixedScheduler && enabledPool
}

/* * * Function for overriding Youtube emoji complete in the default live chat input (doesn't apply to superchat inputs atm?) * * */
export function disableEmojiComplete () {
  const renderer = document.querySelector('iframe#chatframe')?.contentDocument.querySelector('yt-live-chat-text-input-field-renderer#input.yt-live-chat-message-input-renderer') ?? document.querySelector('yt-live-chat-text-input-field-renderer#input.yt-live-chat-message-input-renderer')
  renderer.completeEmojis = () => {}
  renderer.completeEmojis_ = () => {}
  renderer.completeEmojisInRange = () => {}
}
