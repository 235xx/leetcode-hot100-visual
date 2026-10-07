/**
 * 04 浅拷贝 / 深拷贝
 *
 * 浅拷贝：只复制第一层，嵌套对象仍共享引用。{ ...obj }、Object.assign({}, obj)、arr.slice()
 * 深拷贝：遇到对象就新建同类型的空容器，把每个属性递归拷进去
 *
 * 要点：
 * - 基本类型和函数直接返回（函数一般共享引用）
 * - 循环引用：用 WeakMap 记录"原对象 → 它的拷贝"
 *   顺序很重要：新建 copy 后要先 seen.set，再递归属性，顺序反了照样死循环
 * - 这里用 Map 也可以：seen 每次调用新建，函数返回后整张表都会被回收，两者没有区别
 *   WeakMap 的优势在 seen 跨调用长期存在时（比如全局缓存）：键是弱引用，不会阻止原对象被回收；
 *   同样的场景用 Map 会一直持有原对象，造成内存泄漏
 * - Reflect.ownKeys 能拿到 Symbol 键；for...in 会遍历原型链上的可枚举属性，要配合 hasOwnProperty
 * - Object.create(Object.getPrototypeOf(value)) 保留原型
 *
 * 追问：
 * - JSON.parse(JSON.stringify(obj)) 的缺陷：丢 undefined / 函数 / Symbol；Date 变字符串；
 *   RegExp / Map / Set 变 {}；NaN / Infinity 变 null；循环引用直接报错
 * - structuredClone(obj)：原生深拷贝，支持循环引用、Date、Map、Set，
 *   但不能拷贝函数和 DOM 节点（抛 DataCloneError），也不保留原型
 *
 * 原文档的坑：function 拼写错误导致整段跑不起来；没处理循环引用，obj.self = obj 会栈溢出。
 */


// 9.26浅拷贝
function shallowClone(obj){
  if (obj === null||obj !== 'object'){
    return obj
  }
  return Array.isArray(obj) ? [...obj] : {...obj}
}

function shallowClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  return Array.isArray(obj) ? [...obj] : { ...obj }
}

function deepClone(value, seen = new WeakMap()) {
  // 基本类型、函数：直接返回
  if (value === null || typeof value !== 'object') return value

  // 特殊对象
  if (value instanceof Date) return new Date(value)
  if (value instanceof RegExp) return new RegExp(value.source, value.flags)

  // 拷过了：直接复用，循环在这里被截断
  if (seen.has(value)) return seen.get(value)

  if (value instanceof Map) {
    const copy = new Map()
    seen.set(value, copy)
    value.forEach((v, k) => copy.set(deepClone(k, seen), deepClone(v, seen)))
    return copy
  }
  if (value instanceof Set) {
    const copy = new Set()
    seen.set(value, copy)
    value.forEach((v) => copy.add(deepClone(v, seen)))
    return copy
  }

  // 普通对象 / 数组：保留原型
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value))
  seen.set(value, copy) // 先登记，再递归
  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone(value[key], seen)
  }
  return copy
}

// 面试手写精简版（先写这个，再按追问补 Date / Map / Set）
function deepCloneBasic(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return seen.get(value)
  const copy = Array.isArray(value) ? [] : {}
  seen.set(value, copy)
  for (const key of Object.keys(value)) {
    copy[key] = deepCloneBasic(value[key], seen)
  }
  return copy
}
// 9.26
function deepCloneBasic(value,seen = new WeakMap()){
  if(value === null || typeof value !== 'object') return value
  if(seen.has(value)) return seen.get(value)
  const copy = Array.isArray(value) ? [] : {}
  seen.set(value,copy)
  for(const key in value){
    copy[key] = deepCloneBasic(value[key],seen)
  }
  return copy
}

module.exports = { shallowClone, deepClone, deepCloneBasic }

// ---------------- 测试：node 04-deep-clone.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  // 浅拷贝：第一层独立，嵌套共享
  const origin = { a: 1, nested: { b: 2 } }
  const shallow = shallowClone(origin)
  shallow.a = 100
  shallow.nested.b = 200
  assert.equal(origin.a, 1)
  assert.equal(origin.nested.b, 200)
  console.log('✓ shallowClone：第一层独立，嵌套对象仍共享')

  // 深拷贝：各种类型 + 循环引用
  const sym = Symbol('s')
  class Person {
    hi() {
      return 'hi'
    }
  }
  const src = {
    n: 1,
    arr: [1, { x: 2 }],
    date: new Date(0),
    re: /a+/gi,
    map: new Map([['k', { v: 1 }]]),
    set: new Set([1, 2]),
    person: new Person(),
    [sym]: 'symbol-value',
    fn() {
      return 1
    },
  }
  src.self = src

  const out = deepClone(src)
  assert.notEqual(out, src)
  assert.equal(out.self, out)
  console.log('✓ deepClone：循环引用 out.self === out')

  assert.deepEqual(out.arr, [1, { x: 2 }])
  assert.ok(Array.isArray(out.arr))
  assert.notEqual(out.arr[1], src.arr[1])
  console.log('✓ deepClone：嵌套对象是新的')

  assert.equal(out.date.getTime(), 0)
  assert.notEqual(out.date, src.date)
  assert.equal(out.re.flags, 'gi')
  assert.notEqual(out.map.get('k'), src.map.get('k'))
  assert.deepEqual([...out.set], [1, 2])
  console.log('✓ deepClone：Date / RegExp / Map / Set')

  assert.equal(out[sym], 'symbol-value')
  assert.equal(out.person.hi(), 'hi')
  assert.ok(out.person instanceof Person)
  assert.equal(out.fn, src.fn)
  console.log('✓ deepClone：Symbol 键、保留原型、函数共享引用')

  const basic = deepCloneBasic(src)
  assert.equal(basic.self, basic)
  console.log('✓ deepCloneBasic：精简版也能处理循环引用')

  // 对照：JSON 方案的缺陷
  assert.throws(() => JSON.parse(JSON.stringify(src)), TypeError)
  const viaJson = JSON.parse(JSON.stringify({ u: undefined, d: new Date(0), m: new Map([[1, 2]]), nan: NaN }))
  assert.deepEqual(viaJson, { d: '1970-01-01T00:00:00.000Z', m: {}, nan: null })
  console.log('✓ 对照：JSON 方案遇到循环引用报错，并丢失 undefined / Date / Map / NaN')
}
