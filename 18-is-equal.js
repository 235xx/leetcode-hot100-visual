/**
 * 18 对象深比较 isEqual
 *
 * 规格：isEqual(a, b) 深比较两个值是否"长得一样"
 * - 基本类型用 === 比较，但 NaN 和 NaN 相等
 * - 对象和数组递归比较每一个键，键的顺序无所谓
 * - 键的数量要相同，并且 b 自己也要有这个键：{ a: undefined } 和 { b: undefined } 不相等
 * - 数组和对象不相等：[] 和 {} 不相等
 * - null 不能当对象处理：isEqual(null, {}) 返回 false，不能报错
 * - 进阶：Date 按时间比较；遇到循环引用不陷入死循环
 *
 * 要点：
 * - 先处理能直接判断的：a === b || (Number.isNaN(a) && Number.isNaN(b))，
 *   同一个引用、相等的基本类型、两个 NaN 都直接返回 true
 * - 判断"两个都是对象"时要排除 null：typeof null === 'object'
 * - Array.isArray(a) !== Array.isArray(b) 时直接 false
 * - 先比键的数量，再逐个键：用 Object.hasOwn(b, key) 确认 b 也有这个键，再递归比较值
 * - 进阶：Date 没有自有键，按通用方式比较时任意两个 Date 都会"相等"，要单独用 getTime 比；
 *   循环引用用 WeakMap 记下正在比较的那一对，再遇到就直接当作相等
 *
 * 常见错误：
 * - 没排除 null：Object.keys(null) 直接报 TypeError（原文档的坑）
 * - 没区分数组和对象：[] 和 {} 键数都是 0，被判成相等
 * - 只比键数不确认键名：{ a: undefined } 和 { b: undefined } 被判成相等
 *
 * 追问：
 * - 能用 JSON.stringify 比较吗：不行。键顺序不同结果就不同；undefined 会被丢掉；
 *   NaN 变成 null；遇到循环引用直接报错
 * - React 的 shallowEqual：只比较第一层，键数相同并且每个键的值用 Object.is 相等，
 *   memo 和 PureComponent 用它判断要不要重新渲染
 * - lodash 的 isEqual 多做了什么：还比较了 Map、Set、正则、TypedArray、原型等，并处理循环引用
 */

function isEqual(a, b, seen = new WeakMap()) {
  // 同一个引用、相等的基本类型、两个 NaN
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true
  // 排除 null，并且两个都得是对象
  const bothObjects = a !== null && b !== null && typeof a === 'object' && typeof b === 'object'
  if (!bothObjects) return false
  // 进阶：Date 没有自有键，要按时间比
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false // 数组和对象不相等
  // 进阶：循环引用，这一对已经在比较中了，直接当作相等
  if (seen.get(a) === b) return true
  seen.set(a, b)
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Object.hasOwn(b, key) && isEqual(a[key], b[key], seen))
}

module.exports = { isEqual }

// ---------------- 测试：node 18-is-equal.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  assert.equal(isEqual(1, 1), true)
  assert.equal(isEqual(1, '1'), false)
  assert.equal(isEqual('a', 'a'), true)
  assert.equal(isEqual(undefined, undefined), true)
  console.log('✓ 基本类型')

  assert.equal(isEqual(NaN, NaN), true)
  assert.equal(isEqual({ x: NaN }, { x: NaN }), true)
  console.log('✓ NaN 和 NaN 相等')

  assert.equal(isEqual({ a: 1, b: { x: [1, 2] } }, { b: { x: [1, 2] }, a: 1 }), true)
  assert.equal(isEqual({ a: 100 }, { a: 200 }), false)
  assert.equal(isEqual([1, [2, 3]], [1, [2, 4]]), false)
  console.log('✓ 嵌套对象和数组，键顺序无所谓')

  assert.equal(isEqual(null, {}), false)
  assert.equal(isEqual({}, null), false)
  assert.equal(isEqual(null, null), true)
  console.log('✓ null 不报错')

  assert.equal(isEqual([], {}), false)
  assert.equal(isEqual(['a'], { 0: 'a' }), false)
  console.log('✓ 数组和对象不相等')

  assert.equal(isEqual({ a: 1 }, { a: 1, b: 2 }), false)
  assert.equal(isEqual({ a: undefined }, { b: undefined }), false)
  console.log('✓ 键数量不同、键名不同都不相等')

  assert.equal(isEqual(new Date(0), new Date(0)), true)
  assert.equal(isEqual(new Date(0), new Date(1)), false)
  console.log('✓ 进阶：Date 按时间比较')

  const a = { x: 1 }
  a.self = a
  const b = { x: 1 }
  b.self = b
  assert.equal(isEqual(a, b), true)
  const c = { x: 2 }
  c.self = c
  assert.equal(isEqual(a, c), false)
  console.log('✓ 进阶：循环引用不陷入死循环，值不同时照样比出来')

  // 对照：JSON.stringify 比较的三个问题
  assert.notEqual(JSON.stringify({ a: 1, b: 2 }), JSON.stringify({ b: 2, a: 1 }))
  assert.equal(JSON.stringify({ a: undefined }), JSON.stringify({}))
  assert.equal(JSON.stringify({ x: NaN }), JSON.stringify({ x: null }))
  console.log('✓ 对照：JSON.stringify 会把不同键顺序判成不等，把 { a: undefined } 和 {}、NaN 和 null 判成相等')
}
