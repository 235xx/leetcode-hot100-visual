/**
 * 07 手写 new
 *
 * new Ctor(...args) 做了四件事：
 * 1. 创建一个空对象，原型指向 Ctor.prototype
 * 2. 以这个对象为 this 执行构造函数
 * 3. 构造函数返回了对象（包括函数），new 的结果就是这个返回值
 * 4. 否则（返回基本类型或没有 return），结果是第 1 步创建的对象
 *
 * 要点：
 * - Object.create(Ctor.prototype) 一步完成前两件事：创建对象 + 设置原型
 * - 判断返回值要排除 null：typeof null === 'object'，但 new 遇到 return null 仍返回新对象
 * - 函数也算对象：构造函数 return 一个函数时，new 的结果就是这个函数
 * - 箭头函数、对象方法简写、async 函数都没有 prototype，不能被 new
 *
 * 追问：
 * - 构造函数 return 一个基本类型会怎样？被忽略，仍返回新对象
 * - new.target：在函数内部判断自己是不是被 new 调用的
 * - 为什么这个 myNew 不能用于 class？class 的构造函数只能用 new 调用，
 *   Ctor.apply 会抛 TypeError（真要支持，只能用 Reflect.construct，那就不算手写了）
 *
 * 原文档的坑：
 * - 参数不合法时 return 了一个字符串，应该 throw TypeError
 * - 用 Object.prototype.toString 判断函数，箭头函数能通过检查，
 *   但它没有 prototype，会在 Object.create 那一步报错
 */

// 模拟 new Ctor(...args)
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype)
  const result = Ctor.apply(obj,args)
  const isObjectLike = result !== null && (typeof result === 'object' || typeof result === 'function')
  return isObjectLike ? result : obj
}