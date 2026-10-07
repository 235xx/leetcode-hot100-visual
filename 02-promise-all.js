/**
 * 02 Promise.all（以及 allSettled / race / any）
 *
 * 规格：
 * 1. 返回新 Promise
 * 2. 入参是可迭代对象（数组、Set、字符串、generator 都行）；不可迭代时返回 rejected promise
 * 3. 元素可以是普通值 / promise / thenable
 * 4. 全部成功 → 结果数组，顺序与输入一致
 * 5. 任意一个失败 → 立即失败，reason 是第一个失败的
 * 6. 空输入 → resolve([])
 *
 * 要点：
 * - results[i] 按下标存（保证顺序），done 独立计数（判断完成）。两件事分开
 * - 不能用 results.length 判断完成：results[3] 先赋值，length 就已经是 4 了
 * - Promise.resolve(item) 统一包装，普通值没有 .then
 * - [...iterable] 放在 executor 里：不可迭代时抛错会被自动转成 reject
 *   不用 Array.from：它还接受类数组，Array.from(123) 得到 []，而原生 Promise.all(123) 会 reject
 * - 不需要"已结束"标志：Promise 状态一旦落定，再调 resolve / reject 都会被忽略
 *
 * | 方法       | 何时成功           | 何时失败                    |
 * | all        | 全部成功           | 第一个失败                  |
 * | allSettled | 全部结束（总是成功）| 从不                        |
 * | race       | 第一个结束的是成功 | 第一个结束的是失败          |
 * | any        | 第一个成功         | 全部失败（AggregateError）  |
 */

function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable] // 不可迭代会在这里抛错 → 自动变成 reject
    const results = new Array(items.length)
    let done = 0

    if (items.length === 0) return resolve(results) // 否则永远 pending

    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {
        results[i] = value // 按下标放，顺序和输入一致
        done += 1
        if (done === items.length) resolve(results)
      }, reject) // 任意一个失败就整体失败
    })
  })
}

function myPromiseAll(iterable){
  return new Promise((resolve,reject)=>{
    const items = [...iterable]
    const results = []
    let done = 0

    if(items.length === 0) return resolve(results)
    
    items.forEach((item,i)=>{
      Promise.resolve(item).then(value=>{
        results[i] = value
        done += 1
        if(done === items.length) return resolve(results)
      }).catch(reject)
    })
  })
}

// allSettled：把每一项都变成"一定成功"的 promise，再交给 all
function promiseAllSettled(iterable) {
  return promiseAll(
    [...iterable].map((item) =>
      Promise.resolve(item).then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason }),
      ),
    ),
  )
}

// race：谁先落定就跟谁，不需要计数
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) Promise.resolve(item).then(resolve, reject)
  })
}

// any：all 的镜像，对失败计数
function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable]
    const errors = new Array(items.length)
    let rejected = 0

    if (items.length === 0) return reject(new AggregateError([], 'All promises were rejected'))

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (reason) => {
        errors[i] = reason
        rejected += 1
        if (rejected === items.length) reject(new AggregateError(errors, 'All promises were rejected'))
      })
    })
  })
}

module.exports = { promiseAll, promiseAllSettled, promiseRace, promiseAny }

// ---------------- 测试：node 02-promise-all.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const delay = (value, ms, fail = false) =>
    new Promise((resolve, reject) => setTimeout(() => (fail ? reject(value) : resolve(value)), ms))

  ;(async () => {
    // 完成顺序是 b → c → a，结果顺序仍是 a b c
    assert.deepEqual(await promiseAll([delay('a', 30), 'b', delay('c', 10)]), ['a', 'b', 'c'])
    console.log('✓ promiseAll：结果顺序与输入一致，普通值也能处理')

    assert.deepEqual(await promiseAll([]), [])
    console.log('✓ promiseAll：空数组直接 resolve([])')

    assert.deepEqual(await promiseAll(new Set([1, 2])), [1, 2])
    assert.deepEqual(await promiseAll('ab'), ['a', 'b'])
    console.log('✓ promiseAll：接受 Set、字符串等可迭代对象')

    await assert.rejects(promiseAll(123), TypeError)
    console.log('✓ promiseAll：不可迭代时返回 rejected promise（不是同步抛错）')

    await assert.rejects(promiseAll([delay(1, 30), delay('boom', 10, true)]), (e) => e === 'boom')
    console.log('✓ promiseAll：一个失败立即失败')

    assert.deepEqual(await promiseAllSettled([1, Promise.reject('x')]), [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: 'x' },
    ])
    console.log('✓ promiseAllSettled：成功失败都记录')

    assert.equal(await promiseRace([delay('slow', 30), delay('fast', 10)]), 'fast')
    await assert.rejects(promiseRace([delay('slow', 30), delay('err', 10, true)]), (e) => e === 'err')
    console.log('✓ promiseRace：跟随第一个落定的')

    assert.equal(await promiseAny([delay('e', 5, true), delay('ok', 20)]), 'ok')
    await assert.rejects(promiseAny([Promise.reject(1), Promise.reject(2)]), AggregateError)
    console.log('✓ promiseAny：第一个成功的；全失败抛 AggregateError')
  })()
}

// 9.26
function promiseAll(iterable){
  return new Promise((resolve,reject)=>{
    const items = [...iterable]
    const results = new Array(items.length)
    let resolved = 0

    if(items.length === 0) return resolve([])
      items.forEach((item,i)=>{
        Promise.resolve(item).then((value)=>{
          results[i] = value
          resolved += 1
          if (resolved === items.length) resolve(results)
        }).catch(reject)
      })
  })
}