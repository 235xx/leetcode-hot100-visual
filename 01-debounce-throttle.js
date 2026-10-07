/**
 * 01 防抖 debounce / 节流 throttle
 *
 * 防抖：停止触发满 delay 毫秒后才执行一次。场景：搜索联想、resize 结束后重新布局、表单校验
 * 节流：每 delay 毫秒最多执行一次。场景：滚动加载、拖拽、mousemove
 *
 * 要点：
 * - 返回普通 function（不是箭头函数），才能用 fn.apply(this, args) 透传调用者的 this 和参数
 * - 防抖的本质：每次触发都 clearTimeout，再重新 setTimeout
 * - 立即执行版用 timer === null 判断"新一轮开始"，定时器到期时把 timer 置空
 * - 节流时间戳版：第一次立即执行，停止触发后的最后一次会丢
 *   节流定时器版：第一次要等 delay，停止触发后还会补一次
 *   合并版：两头都照顾
 *
 * 原文档的坑：立即执行版把复位标志放在定时器回调里，而"立即执行"那次没设定时器，
 * 一轮只触发一次时标志永远不复位，下一轮就不再立即执行了。
 */

const { clear } = require('node:console')

// 基础防抖
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    clearTimeout(timer) // 又触发了：取消上一个定时器
    timer = setTimeout(() => {
      fn.apply(this, args) // 箭头函数没有自己的 this，这里的 this 就是调用者
    }, delay)
  }
}


// 节流 · 时间戳版：第一次立即执行，最后一次可能丢
function throttle(fn, delay) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) { // 冷却结束了吗
      last = now
      fn.apply(this, args)
    }
  }
}

module.exports = { debounce, debounceAdvanced, throttle, throttleTimer, throttleBoth }

// ---------------- 测试：node 01-debounce-throttle.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  ;(async () => {
    // 连续触发 3 次，只在停下 50ms 后执行最后一次
    const calls = []
    const d = debounce((x) => calls.push(x), 50)
    d(1); await sleep(10); d(2); await sleep(10); d(3)
    await sleep(80)
    assert.deepEqual(calls, [3])
    console.log('✓ debounce：连续触发只执行最后一次')

    // this 透传
    const obj = { name: 'Tom', seen: [] }
    obj.run = debounce(function () { this.seen.push(this.name) }, 20)
    obj.run()
    await sleep(40)
    assert.deepEqual(obj.seen, ['Tom'])
    console.log('✓ debounce：this 指向调用者')

    // 立即执行：一轮只在开头执行一次；停够之后的新一轮又能立即执行
    const c2 = []
    const di = debounceAdvanced((x) => c2.push(x), 50, true)
    di(1); await sleep(10); di(2); await sleep(10); di(3)
    await sleep(80)
    assert.deepEqual(c2, [1])
    di(4)
    assert.deepEqual(c2, [1, 4])
    console.log('✓ debounceAdvanced：立即执行版每轮开头执行')

    // 取消
    const c3 = []
    const dc = debounceAdvanced((x) => c3.push(x), 30)
    dc(1)
    dc.cancel()
    await sleep(50)
    assert.deepEqual(c3, [])
    console.log('✓ debounceAdvanced：cancel 取消待执行的调用')

    // 时间戳版：第一次立即执行，冷却期内的调用被丢弃
    const t1 = []
    const th = throttle((x) => t1.push(x), 50)
    th(1); await sleep(10); th(2); await sleep(10); th(3)
    await sleep(60)
    th(4)
    assert.deepEqual(t1, [1, 4])
    console.log('✓ throttle 时间戳版：首次立即执行，冷却中丢弃')

    // 定时器版：第一次要等，停止后用最新参数补一次
    const t2 = []
    const tt = throttleTimer((x) => t2.push(x), 50)
    tt(1); await sleep(10); tt(2); await sleep(10); tt(3)
    assert.deepEqual(t2, [])
    await sleep(60)
    assert.deepEqual(t2, [3])
    console.log('✓ throttleTimer 定时器版：延迟执行，用最新参数')

    // 合并版：首尾都执行
    const t3 = []
    const tb = throttleBoth((x) => t3.push(x), 50)
    tb(1); await sleep(10); tb(2); await sleep(10); tb(3)
    await sleep(80)
    assert.deepEqual(t3, [1, 3])
    console.log('✓ throttleBoth 合并版：首次立即 + 末次补执行')
  })()
}

// 9.26
// function debounce(fn,delay){
//   let timer = null
//   return function(...args){
//     clearTimeout(timer)
//     timer = setTimeout(()=>{
//       fn.apply(this,args)
//     },delay)
//   }
// }

// function throttle(fn,delay){
//   let last = 0
//   return function(...args){
//     const now = Date.now()
//     if(now - last >= delay){
//       last = now
//       fn.apply(this,args)
//     }
//   }
// }

// 9.26
function debounce(fn,delay){
  let timer = null
  return function(...args){
    clearTimeout(timer)
    timer = setTimeout(()=>{
      fn.apply(this,args)
    },delay)
  }
}

function throttle(fn,interval){
  let last = 0
  return function(...args){
    let now = Date.now()
    if(now - last < interval){
      last = now
      fn.apply(this,args)
    }
  }
}