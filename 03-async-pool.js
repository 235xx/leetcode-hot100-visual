/**
 * 03 异步并发数限制
 *
 * 两种出法：
 * 1. 函数版：asyncPool(limit, items, iteratee)，最多同时 limit 个，返回按输入顺序排列的结果
 * 2. 调度器类：scheduler.add(task) 返回 promise，最多同时 2 个
 *    经典题：任务耗时 1000 / 500 / 300 / 400ms，max = 2，输出 2 3 1 4
 *
 * 前提：传进来的必须是"返回 promise 的函数"，不能是 promise。promise 一创建就在跑了，限不住。
 *
 * 要点：
 * - worker 池：开 limit 个 worker，每个 worker 循环"领任务 → await 完成 → 再领"
 * - const i = next++ 不会被两个 worker 同时领到：JS 单线程，while 判断到 next++ 之间没有 await，
 *   "检查"和"领取"在同一段同步代码里，worker 之间只在 await 处交替
 * - 结果按下标存，完成顺序是 2 3 1 4，results 仍是 [1000, 500, 300, 400]
 * - 不要分批 Promise.all：慢任务会拖住整批（经典题分批 1400ms，并发池 1200ms）
 * - 失败策略要和面试官确认：默认版失败后其他 worker 仍会继续领任务
 *
 * 原文档的坑：检查 i === array.length 在同步代码里，i++ 却放在 .then 回调里（微任务），
 * 检查和领取被拆开，靠微任务排队顺序碰巧正确；稍一改动就可能让 i 跳过 length，陷入无限循环。
 */

// 解法一：worker 池（推荐）
async function asyncPool(limit, items, iteratee) {
  const results = new Array(items.length)
  let next = 0 // 共享游标：下一个待领取的下标

  async function worker() {
    while (next < items.length) {
      const i = next++ // 同步领取，不会撞车(关键)
      results[i] = await iteratee(items[i], i) // 等它完成再领下一个
    }
  }

  const count = Math.min(limit, items.length)
  const workers = Array.from({ length: count }, worker) // 同时启动 count 个 worker
  await Promise.all(workers) // 所有 worker 收工 = 全部完成
  return results
}

async function asyncPool(limit,items,iteratee){
  const results = new Array(items.length)
  let next = 0

  async function worker(){
    while(next < items.length){
      const i = next++
      results[i] = await iteratee(items[i],i)
    }
  }

  const count = Math.min(limit,items.length)
  const workers = Array.from({length:count},worker)
  await Promise.all(workers)
  return results
}


module.exports = { asyncPool, asyncPoolFailFast, asyncPoolRace, Scheduler }

// ---------------- 测试：node 03-async-pool.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // 记录同时在跑的任务数峰值
  function makeJob() {
    const stats = { active: 0, peak: 0 }
    const job = async (ms) => {
      stats.active += 1
      stats.peak = Math.max(stats.peak, stats.active)
      await sleep(ms)
      stats.active -= 1
      return ms
    }
    return { job, stats }
  }

  ;(async () => {
    for (const [name, pool] of [['asyncPool', asyncPool], ['asyncPoolRace', asyncPoolRace]]) {
      const { job, stats } = makeJob()
      const t0 = Date.now()
      const res = await pool(2, [100, 50, 30, 40], job) // 经典题缩小 10 倍
      const elapsed = Date.now() - t0
      assert.deepEqual(res, [100, 50, 30, 40])
      assert.equal(stats.peak, 2)
      assert.ok(elapsed >= 115 && elapsed < 160, `elapsed ${elapsed}`)
      assert.deepEqual(await pool(3, [], job), [])
      console.log(`✓ ${name}：结果按下标、峰值并发 = 2、耗时约 120ms（实测 ${elapsed}ms）`)
    }

    // 分批对比：慢任务拖住整批
    {
      const { job } = makeJob()
      const items = [100, 50, 30, 40]
      const t0 = Date.now()
      for (let k = 0; k < items.length; k += 2) await Promise.all(items.slice(k, k + 2).map(job))
      console.log(`  （对比：分批 Promise.all 耗时 ${Date.now() - t0}ms，约 140ms）`)
    }

    // 失败策略
    {
      const started = []
      const job = async (ms, i) => {
        started.push(i)
        await sleep(ms)
        if (i === 1) throw new Error('task 1 failed')
        return ms
      }
      await assert.rejects(asyncPool(2, [100, 20, 30, 30, 30], job), /task 1 failed/)
      await sleep(200)
      assert.deepEqual(started, [0, 1, 2, 3, 4])
      console.log('✓ asyncPool：任务 1 失败后整体 reject，但其他 worker 仍把 5 个任务都启动了')

      started.length = 0
      await assert.rejects(asyncPoolFailFast(2, [100, 20, 30, 30, 30], job))
      await sleep(200)
      assert.deepEqual(started, [0, 1])
      console.log('✓ asyncPoolFailFast：失败后不再领新任务，只启动了 2 个')
    }

    // 调度器经典题：输出 2 3 1 4
    {
      const order = []
      const scheduler = new Scheduler(2)
      const addTask = (ms, name) => scheduler.add(() => sleep(ms)).then(() => order.push(name))
      await Promise.all([addTask(100, '1'), addTask(50, '2'), addTask(30, '3'), addTask(40, '4')])
      assert.deepEqual(order, ['2', '3', '1', '4'])
      console.log('✓ Scheduler：输出顺序 2 3 1 4')
    }

    // 调度器：任务同步抛错不影响后续任务
    {
      const scheduler = new Scheduler(1)
      const r1 = scheduler.add(() => {
        throw new Error('sync boom')
      })
      const r2 = scheduler.add(() => sleep(10).then(() => 'still runs'))
      await assert.rejects(r1, /sync boom/)
      assert.equal(await r2, 'still runs')
      console.log('✓ Scheduler：任务同步抛错后，后面的任务照常执行')
    }

    // 反例：传 promise 而不是函数，限制无效
    {
      const { stats } = makeJob()
      const running = [50, 50, 50, 50].map(async (ms) => {
        stats.active += 1
        stats.peak = Math.max(stats.peak, stats.active)
        await sleep(ms)
        stats.active -= 1
      })
      await asyncPool(2, running, (p) => p)
      assert.equal(stats.peak, 4)
      console.log('✓ 反例：直接传 promise，峰值并发是 4，限制不起作用')
    }
  })()
}




// worker池9.26
async function asyncPool(limit, items, fn) {
  const results = new Array(items.length)
  let next = 0

  async function worker(){
    while(next<items.length){
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  const count = Math.min(limit, items.length)
  const workers = Array.from({ length: count}, worker)
  await Promise.all(workers)
  return results
}