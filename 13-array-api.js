/**
 * 13 手写 map / filter / reduce
 *
 * 规格：在 Array.prototype 上实现 myMap、myFilter、myReduce，行为和原生一致
 * - 回调参数是 (item, index, array)；myMap、myFilter 支持第二个参数 thisArg
 * - 不修改原数组；myMap 返回一个新数组
 * - myReduce：传了初始值就从第 0 项开始；没传就用第 0 项当初始值，从第 1 项开始；
 *   空数组又没传初始值时抛 TypeError
 * - 进阶：传 undefined 作初始值也算"传了初始值"；和原生一样跳过稀疏数组的空位
 *
 * 要点：
 * - 必须用普通 function：箭头函数没有自己的 this，拿不到调用方法的那个数组
 * - callback.call(thisArg, item, i, arr) 支持 thisArg
 * - reduce 用 arguments.length 区分"没传初始值"和"传了 undefined"
 * - i in this 判断下标上是否真的有元素，用来跳过稀疏数组的空位
 * - map 用 new Array(this.length) 先开好空位，结果放在 result[i]，下标和原数组对应
 *
 * 常见错误：
 * - 直接覆盖原生 Array.prototype.map：会影响页面上所有代码，面试时要起名 myMap
 * - reduce 用 initialValue === undefined 判断有没有传：传 undefined 时会出错
 * - 空数组又没初始值时返回 undefined：原生会抛 TypeError
 *
 * 追问：
 * - 用 reduce 实现 map：arr.reduce((acc, x, i, a) => { acc.push(fn(x, i, a)); return acc }, [])
 * - forEach 和 map 的区别：forEach 没有返回值，map 返回新数组；两者都不能 break，
 *   要中断用 for...of 或 some / every
 * - 为什么不建议修改原生原型：可能和以后的标准方法冲突，比如 MooTools 定义过
 *   Array.prototype.flatten，标准方法只好改名叫 flat
 */

/* eslint-disable no-extend-native */
Array.prototype.myMap = function (callback, thisArg) {
  const result = new Array(this.length)
  for (let i = 0; i < this.length; i++) {
    if (i in this) result[i] = callback.call(thisArg, this[i], i, this) // i in this：跳过空位
  }
  return result
}

Array.prototype.myFilter = function (callback, thisArg) {
  const result = []
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) result.push(this[i])
  }
  return result
}

Array.prototype.myReduce = function (callback, initialValue) {
  let i = 0
  let acc
  if (arguments.length >= 2) {
    acc = initialValue // 传了初始值（哪怕是 undefined）
  } else {
    while (i < this.length && !(i in this)) i++ // 跳过开头的空位
    if (i >= this.length) throw new TypeError('Reduce of empty array with no initial value')
    acc = this[i] // 没传：第一项当初始值
    i++
  }
  for (; i < this.length; i++) {
    if (i in this) acc = callback(acc, this[i], i, this)
  }
  return acc
}

// ---------------- 测试：node 13-array-api.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  const arr = [1, 2, 3]
  const seen = []
  const doubled = arr.myMap((x, i, a) => {
    seen.push([x, i, a === arr])
    return x * 2
  })
  assert.deepEqual(doubled, [2, 4, 6])
  assert.deepEqual(seen, [[1, 0, true], [2, 1, true], [3, 2, true]])
  assert.ok(doubled !== arr)
  console.log('✓ myMap：返回新数组，回调拿到 (item, index, array)')

  assert.deepEqual([1, 2].myMap(function () { return this.k }, { k: 9 }), [9, 9])
  console.log('✓ myMap：支持 thisArg')

  assert.deepEqual([1, 2, 3, 4].myFilter((x) => x % 2), [1, 3])
  assert.deepEqual([1, 2, 3].myFilter(function (x) { return x > this.min }, { min: 1 }), [2, 3])
  console.log('✓ myFilter：只保留回调返回真值的元素，支持 thisArg')

  const withInit = []
  assert.equal([1, 2, 3].myReduce((acc, x, i) => { withInit.push(i); return acc + x }, 10), 16)
  assert.deepEqual(withInit, [0, 1, 2])
  console.log('✓ myReduce：传了初始值，从下标 0 开始（回调调用 3 次）')

  const noInit = []
  assert.equal([1, 2, 3].myReduce((acc, x, i) => { noInit.push(i); return acc + x }), 6)
  assert.deepEqual(noInit, [1, 2])
  console.log('✓ myReduce：没传初始值，第一项当 acc，从下标 1 开始（回调调用 2 次）')

  assert.throws(() => [].myReduce((a, b) => a + b), TypeError)
  console.log('✓ myReduce：空数组又没有初始值时抛 TypeError')

  arr.myMap((x) => x * 2)
  arr.myFilter((x) => x > 1)
  arr.myReduce((a, b) => a + b)
  assert.deepEqual(arr, [1, 2, 3])
  console.log('✓ 不修改原数组')

  assert.equal([].myReduce((a, b) => a + b, undefined), undefined)
  assert.deepEqual([1].myReduce((acc, x) => [acc, x], undefined), [undefined, 1])
  console.log('✓ 进阶：传 undefined 作初始值也算传了')

  const sparse = [1, , 3] // eslint-disable-line no-sparse-arrays
  let calls = 0
  const mapped = sparse.myMap((x) => { calls += 1; return x * 2 })
  assert.equal(calls, 2)
  assert.ok(mapped.length === 3 && !(1 in mapped))
  assert.deepEqual(sparse.myFilter(() => true), [1, 3])
  console.log('✓ 进阶：跳过稀疏数组的空位')

  // 对照：用 === undefined 判断初始值，空数组时不会抛错，而是悄悄返回 undefined
  const badReduce = function (cb, init) {
    let acc = init === undefined ? this[0] : init
    for (let i = init === undefined ? 1 : 0; i < this.length; i++) acc = cb(acc, this[i], i, this)
    return acc
  }
  assert.equal(badReduce.call([], (a, b) => a + b), undefined)
  console.log('✓ 对照：用 init === undefined 判断时，[].reduce(fn) 不抛错，悄悄返回 undefined')
}
