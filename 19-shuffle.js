/**
 * 19 洗牌算法（Fisher–Yates）
 *
 * 规格：shuffle(arr) 原地打乱数组
 * - 每种排列出现的概率相同
 * - 不能丢元素也不能多元素
 * - 直接修改并返回传入的数组
 * - 空数组、只有一个元素的数组不报错
 * - 进阶：Math.random 只调用 n - 1 次
 *
 * 要点：
 * - 从最后一位往前：每次在还没确定的范围 [0, i] 里随机挑一个，换到第 i 位，第 i 位就定下来了
 * - j = Math.floor(Math.random() * (i + 1))：范围是 [0, i]，包含 i 本身（可以不换）
 * - 每种排列的概率都是 1/n!：第一步 n 种选择，第二步 n - 1 种……正好 n! 种走法，每种一样可能
 * - Math.random 只调用 n - 1 次，时间 O(n)
 * - 解构交换 [arr[i], arr[j]] = [arr[j], arr[i]] 这一行以 [ 开头，上一行不写分号会被连成一句
 *
 * 常见错误：
 * - sort(() => Math.random() - 0.5)：结果不均匀，打乱 [1, 2, 3] 时有的排列出现次数远多于 1/6
 * - j 的范围写成整个数组 [0, n)：一共 n^n 种走法，不能被 n! 整除，也不均匀
 * - 缺分号：下一行以 [ 开头，两行被连成 const j = Math.floor(...)[arr[i], arr[j]] = ...，
 *   j 还没初始化就被用到，报 ReferenceError: Cannot access 'j' before initialization（原文档的坑）
 *
 * 追问：
 * - 不想修改原数组：先复制一份再打乱，shuffle([...arr])
 * - 怎么验证是不是均匀：打乱 [1, 2, 3] 几万次，统计 6 种排列的次数，应该都接近总数的 1/6
 * - 从数组里随机抽 k 个不重复的元素：只做 Fisher–Yates 的前 k 步，取最后 k 个位置
 */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // 在 [0, i] 里随机选一个（包含 i）
    [arr[i], arr[j]] = [arr[j], arr[i]] // 换到第 i 位；上一行的分号不能省
  }
  return arr
}

module.exports = { shuffle }

// ---------------- 测试：node 19-shuffle.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  // 打乱 [1, 2, 3] 很多次，统计 6 种排列各出现几次
  const countPermutations = (shuffleFn, times) => {
    const counts = {}
    for (let k = 0; k < times; k++) {
      const key = shuffleFn([1, 2, 3]).join('')
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }
  const show = (counts) =>
    Object.keys(counts)
      .sort()
      .map((key) => `${key}: ${counts[key]}`)
      .join('，')

  const arr = [1, 2, 3, 4, 5, 6, 7, 8]
  const res = shuffle(arr)
  assert.ok(res === arr)
  assert.deepEqual([...res].sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8])
  console.log('✓ 原地修改并返回同一个数组，元素不丢不多')

  assert.deepEqual(shuffle([]), [])
  assert.deepEqual(shuffle([42]), [42])
  console.log('✓ 空数组和单元素数组')

  const firsts = new Set()
  for (let k = 0; k < 600; k++) firsts.add(shuffle([1, 2, 3, 4, 5])[0])
  assert.equal(firsts.size, 5)
  console.log('✓ 每个元素都可能出现在第一位')

  const N = 30000
  const counts = countPermutations(shuffle, N)
  assert.equal(Object.keys(counts).length, 6)
  assert.ok(Object.values(counts).every((c) => Math.abs(c - N / 6) < 600), show(counts))
  console.log(`✓ 每种排列的概率相同，都约 5000 次（${show(counts)}）`)

  const realRandom = Math.random
  let calls = 0
  Math.random = () => {
    calls += 1
    return realRandom()
  }
  try {
    shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  } finally {
    Math.random = realRandom
  }
  assert.equal(calls, 9)
  console.log('✓ 进阶：10 个元素只调用 Math.random 9 次')

  // 对照：sort + Math.random，打乱 [1, 2, 3] 的结果明显不均匀
  const sortShuffle = (a) => a.sort(() => Math.random() - 0.5)
  const sortCounts = countPermutations(sortShuffle, N)
  const values = Object.values(sortCounts)
  assert.ok(Math.max(...values) - Math.min(...values) > 2000)
  console.log(`✓ 对照：sort + Math.random 明显不均匀（${show(sortCounts)}）`)
}
