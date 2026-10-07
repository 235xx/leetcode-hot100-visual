/**
 * 09 instanceof
 *
 * 规格：myInstanceof(left, Right) 的结果和 left instanceof Right 一致
 * - 沿着 left 的原型链往上找，找到 Right.prototype 就返回 true，走到链的尽头（null）返回 false
 * - left 是原始值（数字、字符串、null、undefined 等）时返回 false
 * - 函数也是对象：myInstanceof(() => {}, Function) 是 true
 * - 进阶：Right 不是函数时抛 TypeError，和原生一致
 *
 * 要点：
 * - 用 Object.getPrototypeOf 往上走，比 __proto__ 规范；
 *   Object.create(null) 造出来的对象上根本没有 __proto__，用它往上走会报错
 * - 先排除原始值：Object.getPrototypeOf(1) 会先把 1 装箱，返回 Number.prototype，导致误判成 true；
 *   Object.getPrototypeOf(null) 则直接报错
 * - typeof null === 'object'，所以 null 要单独判断；函数的 typeof 是 'function'，要放行
 * - 比较的是 proto === Right.prototype，不是和 Right 本身比
 *
 * 追问：
 * - typeof 和 instanceof 的区别：typeof 判断基本类型；instanceof 判断原型链关系，对原始值永远是 false
 * - 判断数组用 Array.isArray：instanceof Array 在不同 iframe 之间会失效（每个 iframe 有自己的 Array）
 * - 想改变 instanceof 的结果：在类上定义静态方法 Symbol.hasInstance
 *
 * 原文档的坑：函数名直接写成保留字 instanceof（语法错误）；true 拼成了 ture；没有排除原始值。
 */

function myInstanceof(left, Right) {
  if (typeof Right !== 'function') throw new TypeError("Right-hand side of 'instanceof' is not callable")
  // 原始值没有原型链；函数也是对象，要放行
  if (left === null || (typeof left !== 'object' && typeof left !== 'function')) return false
  let proto = Object.getPrototypeOf(left)
  while (proto !== null) {
    if (proto === Right.prototype) return true
    proto = Object.getPrototypeOf(proto) // 往上走一层
  }
  return false // 走到原型链尽头还没找到
}

module.exports = { myInstanceof }

// ---------------- 测试：node 09-instanceof.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  function Person() {}
  assert.equal(myInstanceof(new Person(), Person), true)
  console.log('✓ 实例和它的构造函数：true')

  class A {}
  class B extends A {}
  assert.equal(myInstanceof(new B(), A), true)
  assert.equal(myInstanceof(new B(), Object), true)
  console.log('✓ 沿着原型链能找到父类：true')

  assert.equal(myInstanceof(new A(), B), false)
  assert.equal(myInstanceof({}, Array), false)
  console.log('✓ 原型链上没有时：false')

  assert.equal(myInstanceof(1, Number), false)
  assert.equal(myInstanceof('s', String), false)
  assert.equal(myInstanceof(null, Object), false)
  assert.equal(myInstanceof(undefined, Object), false)
  console.log('✓ 原始值返回 false（和原生 1 instanceof Number 一致）')

  assert.equal(myInstanceof(() => {}, Function), true)
  assert.equal(myInstanceof(function () {}, Object), true)
  console.log('✓ 函数也是对象')

  assert.equal(myInstanceof(Object.create(null), Object), false)
  console.log('✓ 没有原型的对象：false，并且不报错')

  assert.throws(() => myInstanceof({}, {}), TypeError)
  console.log('✓ 进阶：右边不是函数时抛 TypeError')

  // 对照：不排除原始值时会误判
  const naive = (left, Right) => {
    let proto = Object.getPrototypeOf(left)
    while (proto !== null) {
      if (proto === Right.prototype) return true
      proto = Object.getPrototypeOf(proto)
    }
    return false
  }
  assert.equal(naive(1, Number), true)
  console.log('✓ 对照：不先排除原始值，naive(1, Number) 会误判成 true')
}
