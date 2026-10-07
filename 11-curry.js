/**
 * 11 函数柯里化
 *
 * 规格：curry(fn) 返回柯里化后的函数
 * - 参数凑够 fn.length 个就执行 fn 并返回结果，否则返回一个继续接收参数的函数
 * - 每次可以传一个或多个参数：f(1)(2)(3)、f(1, 2)(3)、f(1, 2, 3) 结果一样
 * - 部分应用得到的函数可以反复使用，互不影响
 * - 多传的参数也要传给 fn
 * - 进阶：无限累加 add(1)(2)(3)() === 6，空调用时求和
 *
 * 要点：
 * - fn.length 是 fn 声明的形参个数
 * - 判断用 args.length >= fn.length：一次多传参数也能执行（用 === 会永远不执行）
 * - 每次用 [...args, ...rest] 拼出新数组，而不是往同一个数组里 push：
 *   旧闭包里的数组不会被改，部分应用的函数（比如 add10）才能反复用
 * - 用具名函数表达式 curried 递归调用自己
 *
 * 追问：
 * - fn.length 不准怎么办？不计算默认参数之后的参数和剩余参数，(a, b = 1) => {} 的 length 是 1，
 *   可以让调用方显式传参数个数：curry(fn, arity = fn.length)
 * - add(1)(2)(3) 不加空括号也想得到 6？重写返回函数的 toString / valueOf，隐式转换时求和
 * - 柯里化和偏函数的区别：偏函数一次固定一部分参数（比如 bind 预置参数）；柯里化把多参函数变成一串调用
 */

function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args) // 参数够了：执行
    }
    return (...rest) => curried.apply(this, [...args, ...rest]) // 不够：拼出新数组，继续收
  }
}

// 进阶：无限累加
function add(...args) {
  return (...rest) =>
    rest.length === 0
      ? args.reduce((a, b) => a + b, 0) // 空调用：把收集到的参数加起来
      : add(...args, ...rest) // 有参数：带上新参数，再返回一个新函数
}

module.exports = { curry, add }

// ---------------- 测试：node 11-curry.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  const sum3 = curry((a, b, c) => a + b + c)
  assert.equal(sum3(1)(2)(3), 6)
  console.log('✓ 一次传一个参数')

  assert.equal(sum3(1, 2)(3), 6)
  assert.equal(sum3(1)(2, 3), 6)
  assert.equal(sum3(1, 2, 3), 6)
  console.log('✓ 一次传多个参数也行')

  const add10 = sum3(10)
  assert.equal(add10(1)(1), 12)
  assert.equal(add10(2)(2), 14)
  const add10and1 = add10(1)
  assert.deepEqual([add10and1(5), add10and1(6)], [16, 17])
  console.log('✓ 部分应用得到的函数可以反复使用，互不影响')

  const count = curry(function (a, b) { return arguments.length })
  assert.equal(count(1, 2, 3), 3)
  assert.equal(count(1)(2, 3), 3)
  console.log('✓ 多传的参数也会传给 fn')

  assert.equal(curry((x) => x * 2)(21), 42)
  console.log('✓ 只有一个参数的函数')

  assert.equal(add(1)(2)(3)(), 6)
  assert.equal(add(1, 2)(3, 4)(), 10)
  assert.equal(add(5)(), 5)
  console.log('✓ 进阶：无限累加 add(1)(2)(3)() === 6')

  // 对照：共用一个数组的错误写法，复用时会把上一次的参数带进来
  function badCurry(fn) {
    const all = []
    return function curried(...args) {
      all.push(...args)
      if (all.length >= fn.length) return fn(...all)
      return curried
    }
  }
  const badAdd10 = badCurry((a, b, c) => a + b + c)(10)
  assert.equal(badAdd10(1)(1), 12)
  assert.throws(() => badAdd10(2)(2), TypeError)
  console.log('✓ 对照：共享数组的写法第二次复用时报 TypeError（add10(...) is not a function）')
}
