/**
 * 12 数组扁平化 flat（+ 对象扁平化）
 *
 * 规格：flat(arr, depth = 1) 的行为和 Array.prototype.flat 一致
 * - 把嵌套数组按 depth 展开；默认展开一层，depth 为 Infinity 时全部展开，为 0 时不展开
 * - 返回新数组，不能修改原数组
 * - 不是数组的元素（null、undefined、对象等）原样保留
 * - 进阶：flattenObject(obj) 把嵌套对象展开成一层，键用路径表示，数组下标写成 [i]：
 *   { a: { b: 1 }, c: [1, { d: 2 }] } → { 'a.b': 1, 'c[0]': 1, 'c[1].d': 2 }，空对象和空数组原样保留
 *
 * 要点：
 * - 遍历数组：遇到数组并且 depth > 0 就递归展开（depth - 1），否则原样放进结果
 * - Infinity - 1 还是 Infinity，所以"全部展开"不用特殊处理
 * - 每一层都往自己的新数组里放，递归返回后用 result.push(...sub) 展开一层再放进来
 * - 迭代写法：用栈，pop 出来是数组就展开压回去，最后 reverse；适合嵌套特别深、递归可能栈溢出的情况
 * - 对象扁平化：递归时带着路径前缀往下走，遇到基本类型或空容器就是叶子
 *
 * 追问：
 * - reduce 写法：arr.reduce((acc, x) => acc.concat(Array.isArray(x) && depth > 0 ? flat(x, depth - 1) : [x]), [])
 *   注意 x 要包一层 [x]，否则 concat 会自动把数组展开一层
 * - 手写版和原生的区别：原生 flat 会跳过稀疏数组的空位，for...of 写法会把空位当成 undefined
 * - arr.toString().split(',') 为什么不行：只适用于纯数字，而且数字会变成字符串
 */

function flat(arr, depth = 1) {
  const result = []
  for (const item of arr) {
    // 还能展开：递归，depth 减 1；不能展开：原样放进去
    if (Array.isArray(item) && depth > 0) result.push(...flat(item, depth - 1))
    else result.push(item)
  }
  return result
}

// 迭代写法：只支持全部展开
function flatDeep(arr) {
  const stack = [...arr]
  const result = []
  while (stack.length > 0) {
    const item = stack.pop()
    if (Array.isArray(item)) stack.push(...item) // 是数组：拆开压回栈里
    else result.push(item)
  }
  return result.reverse() // 从尾部 pop 出来的，顺序是反的
}

// 进阶：对象扁平化
function flattenObject(obj) {
  const result = {}
  const walk = (value, path) => {
    const isContainer = value !== null && typeof value === 'object'
    if (!isContainer || Object.keys(value).length === 0) {
      if (path) result[path] = value // 叶子：基本类型、空对象、空数组
      return
    }
    for (const [key, child] of Object.entries(value)) {
      let next = key
      if (Array.isArray(value)) next = `${path}[${key}]` // 数组下标写成 [i]
      else if (path) next = `${path}.${key}`
      walk(child, next)
    }
  }
  walk(obj, '')
  return result
}

module.exports = { flat, flatDeep, flattenObject }

// ---------------- 测试：node 12-flat.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const input = [1, [2, [3, [4]]], 5]

  assert.deepEqual(flat(input), [1, 2, [3, [4]], 5])
  console.log('✓ 默认展开一层')

  assert.deepEqual(flat(input, 2), [1, 2, 3, [4], 5])
  console.log('✓ 按 depth 展开')

  assert.deepEqual(flat(input, Infinity), [1, 2, 3, 4, 5])
  console.log('✓ depth 为 Infinity 时全部展开')

  for (const d of [0, 1, 2, Infinity]) assert.deepEqual(flat(input, d), input.flat(d))
  console.log('✓ depth = 0 / 1 / 2 / Infinity 都和原生 arr.flat 一致')

  const arr = [1, [2]]
  const res = flat(arr, 0)
  assert.deepEqual(res, [1, [2]])
  assert.ok(res !== arr)
  console.log('✓ depth 为 0 时不展开，但返回新数组')

  const original = [1, [2, [3]]]
  flat(original, Infinity)
  assert.deepEqual(original, [1, [2, [3]]])
  console.log('✓ 不修改原数组')

  assert.deepEqual(flat([null, [undefined, { a: 1 }], 'str']), [null, undefined, { a: 1 }, 'str'])
  console.log('✓ null、undefined、对象原样保留')

  assert.deepEqual(flatDeep(input), [1, 2, 3, 4, 5])
  console.log('✓ 迭代写法 flatDeep 全部展开')

  assert.deepEqual(flattenObject({ a: { b: { c: 1 } }, d: 2 }), { 'a.b.c': 1, d: 2 })
  assert.deepEqual(flattenObject({ c: [1, { d: 2 }], e: {}, f: [], g: null }), { 'c[0]': 1, 'c[1].d': 2, e: {}, f: [], g: null })
  console.log('✓ 进阶：对象扁平化（数组下标 [i]，空对象和空数组保留）')

  // 对照：toString 写法会把数字变成字符串，还会吃掉 null、对象
  const naive = (a) => a.toString().split(',')
  assert.deepEqual(naive([1, [2, [3]]]), ['1', '2', '3'])
  console.log("✓ 对照：toString().split(',') 得到的是字符串 ['1', '2', '3']，不是数字")
}
