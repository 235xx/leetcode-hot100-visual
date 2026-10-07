/**
 * 10 继承（寄生组合式）
 *
 * 规格：
 * - inherit(Child, Parent)：让 Child.prototype 继承 Parent.prototype，并把 constructor 指回 Child，不能调用 Parent
 * - Dog(name, breed)：用寄生组合式继承 Animal，每个实例有自己的 name、tags、breed，又能用 Animal 原型上的 sayName
 * - 进阶：constructor 不可枚举；像 class extends 一样继承静态方法
 *
 * 要点：
 * - Parent.call(this, ...)：借用构造函数，每个实例都有自己的一份实例属性，引用类型不会共享
 * - Object.create(Parent.prototype)：新建一个原型指向 Parent.prototype 的空对象当 Child.prototype，不执行 Parent
 * - 替换 prototype 后 constructor 丢了，要指回 Child（用 defineProperty 设成不可枚举，和原生一致）
 * - 先 inherit，再往 Child.prototype 上加方法；顺序反了，方法会留在被替换掉的旧对象上
 * - class extends 本质上就是这一套，另外还做了 Object.setPrototypeOf(Child, Parent) 继承静态方法
 *
 * 四种写法对比：
 * - 原型链继承  Child.prototype = new Parent()：引用类型属性被所有实例共享，也没法给父构造传参
 * - 借用构造函数 只有 Parent.call(this)：拿不到父类原型上的方法
 * - 组合继承    两者都用：父构造被调用两次，Child.prototype 上多一份没用的属性
 * - 寄生组合    Parent.call(this) + Object.create(Parent.prototype)：没有明显缺点
 *
 * 追问：
 * - class extends 做了什么？原型继承 + setPrototypeOf 继承静态方法；子类构造里必须先 super() 才能用 this
 * - 为什么不能直接 Child.prototype = Parent.prototype？两个类共用一个原型对象，给子类加方法会污染父类
 * - Object.create 怎么手写？function create(proto) { function F() {} F.prototype = proto; return new F() }
 */

// 父类
function Animal(name) {
  this.name = name
  this.tags = []
}
Animal.prototype.sayName = function () {
  return 'I am ' + this.name
}

function inherit(Child, Parent) {
  // 原型继承：新对象的原型指向 Parent.prototype，不会执行 Parent
  Child.prototype = Object.create(Parent.prototype, {
    constructor: { value: Child, writable: true, configurable: true }, // 不可枚举，和原生一致
  })
  // 进阶：静态方法也继承（class extends 也会这样做）
  Object.setPrototypeOf(Child, Parent)
}

function Dog(name, breed) {
  Animal.call(this, name) // 借用构造函数：实例属性每个实例各一份
  this.breed = breed
}

inherit(Dog, Animal) // 先接链……
Dog.prototype.bark = function () { // ……再加方法
  return this.name + ': woof'
}

// 对照：ES6 写法
class Cat extends Animal {
  constructor(name, color) {
    super(name) // ≈ Animal.call(this, name)
    this.color = color
  }
}

module.exports = { Animal, Dog, inherit, Cat }

// ---------------- 测试：node 10-inherit.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

  const d = new Dog('Rex', 'husky')
  assert.deepEqual([d.name, d.breed], ['Rex', 'husky'])
  assert.ok(own(d, 'name'))
  console.log('✓ Dog 实例有自己的 name 和 breed')

  const d1 = new Dog('A', 'x')
  const d2 = new Dog('B', 'y')
  d1.tags.push('cute')
  assert.deepEqual(d2.tags, [])
  console.log('✓ 引用类型属性不会在实例之间共享')

  assert.equal(d.sayName(), 'I am Rex')
  assert.equal(d.bark(), 'Rex: woof')
  console.log('✓ 能用父类原型上的方法，也能用自己的方法')

  assert.ok(d instanceof Dog && d instanceof Animal)
  assert.equal(d.constructor, Dog)
  console.log('✓ instanceof 和 constructor 正确')

  assert.ok(!own(Dog.prototype, 'name') && !own(Dog.prototype, 'tags'))
  console.log('✓ Dog.prototype 上没有多余的 name / tags（父类构造没被多调用）')

  assert.equal(Object.getOwnPropertyDescriptor(Dog.prototype, 'constructor').enumerable, false)
  console.log('✓ 进阶：constructor 不可枚举')

  function P() {}
  P.make = () => 'made'
  function C() { P.call(this) }
  inherit(C, P)
  assert.equal(C.make(), 'made')
  console.log('✓ 进阶：静态方法也能继承')

  const c = new Cat('Tom', 'black')
  assert.equal(c.sayName(), 'I am Tom')
  assert.ok(c instanceof Animal)
  console.log('✓ 对照：class extends 得到同样的效果')

  // 对照：组合继承会让父构造多执行一次，原型上留下没用的属性
  function ComboDog(name) { Animal.call(this, name) }
  ComboDog.prototype = new Animal()
  ComboDog.prototype.constructor = ComboDog
  assert.ok(own(ComboDog.prototype, 'name') && own(ComboDog.prototype, 'tags'))
  console.log('✓ 对照：组合继承的 ComboDog.prototype 上多出了 name 和 tags')

  // 对照：原型链继承会共享引用类型属性
  function ChainDog() {}
  ChainDog.prototype = new Animal()
  const c1 = new ChainDog()
  const c2 = new ChainDog()
  c1.tags.push('cute')
  assert.deepEqual(c2.tags, ['cute'])
  console.log('✓ 对照：原型链继承里 c1.tags.push 之后，c2.tags 也变成了 [\'cute\']')
}
