/**
 * 17 异步加法
 *
 * 规格：只有一个回调风格的异步加法 asyncAdd(a, b, callback)，每次耗时 500ms（不能修改它）
 * - sumSerial(...nums)：串行求和，一次只算一个加法，返回 Promise
 * - sumParallel(...nums)：并行求和，两两一组同时算，一轮一轮合并，直到只剩一个数；要明显快于串行
 * - 没有参数时返回 0；只有一个参数时返回它本身
 * - 进阶：通用的 promisify(fn)，把 (...args, callback) 风格的函数转成返回 Promise 的函数
 *
 * 要点：
 * - 先包成 Promise：new Promise((resolve, reject) => asyncAdd(a, b, (err, sum) => err ? reject(err) : resolve(sum)))
 * - 串行：n 个数要 n - 1 次加法，每次都等上一次，耗时 (n - 1) × 单次耗时
 * - 并行：每一轮把数量减半，轮数是 ⌈log₂ n⌉：8 个数 3 轮，10 个数 4 轮
 * - 奇数个数时，落单的那个直接进下一轮，不用浪费一次 + 0
 *
 * 常见错误：
 * - 在回调里 return 结果：外面拿不到，回调的返回值没人接收
 * - 串行用 forEach + async：forEach 不会等 await，实际变成了同时发出
 * - 并行时想一次把所有数丢给 asyncAdd：它一次只能加两个数
 *
 * 追问：
 * - reduce 写串行：nums.reduce((p, n) => p.then((sum) => addAsync(sum, n)), Promise.resolve(0))
 * - 一次最多只能同时算 k 个：每一轮的加法交给第 3 题的 asyncPool，限制并发数为 k
 * - 相同的 a + b 会重复请求：可以加缓存，用 Map 以 `${a},${b}` 为键缓存结果
 */

const DELAY = 50 // 原题每次 500ms，这里改成 50ms，让测试快一点

// 题目给定的回调风格异步加法（不要修改）
function asyncAdd(a, b, callback) {
  setTimeout(() => callback(null, a + b), DELAY)
}

// 先把回调风格包成返回 Promise 的函数
const addAsync = (a, b) =>
  new Promise((resolve, reject) => {
    asyncAdd(a, b, (err, sum) => (err ? reject(err) : resolve(sum)))
  })

async function sumSerial(...nums) {
  if (nums.length === 0) return 0
  let total = nums[0]
  for (let i = 1; i < nums.length; i++) total = await addAsync(total, nums[i]) // 一次等一个
  return total
}

async function sumParallel(...nums) {
  if (nums.length <= 1) return nums[0] ?? 0
  const round = []
  for (let i = 0; i < nums.length; i += 2) {
    // 两两一组同时开始；落单的直接进下一轮
    round.push(i + 1 < nums.length ? addAsync(nums[i], nums[i + 1]) : nums[i])
  }
  return sumParallel(...(await Promise.all(round))) // 这一轮的结果再两两相加
}

// 进阶：通用 promisify，约定回调是最后一个参数，并且第一个参数是错误
function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, value) => (err ? reject(err) : resolve(value)))
    })
}

module.exports = { asyncAdd, sumSerial, sumParallel, promisify }

// ---------------- 测试：node 17-async-add.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  ;(async () => {
    const p = sumSerial(1, 2, 3, 4, 5)
    assert.ok(typeof p.then === 'function')
    assert.equal(await p, 15)
    assert.equal(await sumParallel(1, 2, 3, 4, 5, 8, 9, 10, 11, 12), 65)
    console.log('✓ 串行、并行结果正确，返回 Promise')

    assert.equal(await sumSerial(), 0)
    assert.equal(await sumSerial(7), 7)
    assert.equal(await sumParallel(), 0)
    assert.equal(await sumParallel(7), 7)
    console.log('✓ 没有参数返回 0，一个参数返回它本身')

    assert.equal(await sumParallel(1, 2, 3), 6)
    assert.equal(await sumParallel(1, 2, 3, 4, 5, 6, 7), 28)
    console.log('✓ 奇数个数也能并行求和')

    let t0 = Date.now()
    await sumSerial(1, 2, 3, 4, 5, 6, 7, 8)
    const serialMs = Date.now() - t0
    t0 = Date.now()
    await sumParallel(1, 2, 3, 4, 5, 6, 7, 8)
    const parallelMs = Date.now() - t0
    assert.ok(serialMs >= 340, `串行 ${serialMs}ms`)
    assert.ok(parallelMs >= 140 && parallelMs < 260, `并行 ${parallelMs}ms`)
    console.log(`✓ 8 个数：串行 7 次加法约 350ms（实测 ${serialMs}ms），并行 3 轮约 150ms（实测 ${parallelMs}ms）`)

    const add = promisify((a, b, cb) => setTimeout(() => cb(null, a + b), 5))
    assert.equal(await add(2, 3), 5)
    const fail = promisify((cb) => cb(new Error('boom')))
    await assert.rejects(fail(), { message: 'boom' })
    console.log('✓ 进阶：promisify 成功时 resolve，回调第一个参数是错误时 reject')

    // 对照：forEach + async 不会等 await，三次加法同时发出，都拿 total = 0 去加
    let total = 0
    ;[1, 2, 3].forEach(async (n) => {
      total = await addAsync(total, n)
    })
    assert.equal(total, 0) // forEach 立刻就返回了
    await sleep(DELAY * 2)
    assert.equal(total, 3) // 0+1、0+2、0+3，最后完成的那次把 total 覆盖成 3
    console.log('✓ 对照：forEach + async 求 1 + 2 + 3，得到的是 3 不是 6')
  })()
}
