/**
 * 14 大数加法
 *
 * 规格：addStrings(a, b)
 * - a、b 是只包含数字的非负整数字符串，可能很长，超出 Number 能精确表示的范围
 * - 返回它们的和，也是字符串
 * - 不能用 BigInt
 * - 进阶：去掉结果里多余的前导 0：'007' + '3' 返回 '10'，'000' + '0' 返回 '0'
 *
 * 要点：
 * - 模拟竖式加法：两个指针从个位往前走，每一位算 x + y + carry，
 *   当前位写 sum % 10，进位是 Math.floor(sum / 10)
 * - 循环条件带上 carry：999 + 1 算完三位后还有进位 1，要再走一轮写出最高位
 * - 短的那个数先走完，就当作 0
 * - 结果是从个位往前收集的，最后 reverse 再 join
 * - 为什么要用字符串：超过 Number.MAX_SAFE_INTEGER（2^53 - 1）的整数，转成 number 的那一刻就丢精度了，
 *   9007199254740993 会变成 9007199254740992；按位相加每次只处理 0 到 9 的小数字，永远不会丢
 *
 * 常见错误：
 * - 先 Number(a) + Number(b)：大数直接丢精度
 * - 循环条件没带 carry：999 + 1 得到 000
 * - 字符直接相加：'1' + '2' 是 '12'，要先转成数字
 * - 进位变量写成 curry（柯里化），应该是 carry（原文档的笔误）
 *
 * 追问：
 * - 原生做法：(BigInt(a) + BigInt(b)).toString()
 * - 大数相乘（LeetCode 43）：开一个长度 m + n 的数组，第 i 位乘第 j 位的结果累加到下标 i + j + 1，
 *   最后统一处理进位
 * - 带小数：按小数点拆成整数和小数两部分，小数部分右边补 0 对齐，从最后一位开始一起加，
 *   进位会从小数部分传到整数部分
 */

function addStrings(a, b) {
  let i = a.length - 1
  let j = b.length - 1
  let carry = 0 // 进位
  const digits = []
  while (i >= 0 || j >= 0 || carry > 0) {
    const x = i >= 0 ? Number(a[i]) : 0 // 短的那个走完了就当 0
    const y = j >= 0 ? Number(b[j]) : 0
    const sum = x + y + carry
    digits.push(sum % 10) // 当前位
    carry = Math.floor(sum / 10)
    i--
    j--
  }
  // 进阶：去掉前导 0，至少保留一位
  while (digits.length > 1 && digits[digits.length - 1] === 0) digits.pop()
  return digits.reverse().join('')
}

module.exports = { addStrings }

// ---------------- 测试：node 14-big-add.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  assert.equal(addStrings('1', '2'), '3')
  assert.equal(addStrings('123', '456'), '579')
  console.log('✓ 简单相加，结果是字符串')

  assert.equal(addStrings('987', '65'), '1052')
  assert.equal(addStrings('99', '1'), '100')
  assert.equal(addStrings('999', '999'), '1998')
  console.log('✓ 有进位（每一位都进位、进位到新的最高位）')

  assert.equal(addStrings('12345', '7'), '12352')
  assert.equal(addStrings('7', '12345'), '12352')
  console.log('✓ 两个数长度不同')

  assert.equal(addStrings('0', '0'), '0')
  console.log('✓ 0 + 0')

  assert.equal(addStrings('9007199254740993', '1'), '9007199254740994')
  console.log('✓ 超过 Number 安全范围也算得对')

  const x = '123456789012345678901234567890'
  const y = '987654321098765432109876543210'
  assert.equal(addStrings(x, y), (BigInt(x) + BigInt(y)).toString())
  console.log('✓ 30 位的大数，结果和 BigInt 一致')

  assert.equal(addStrings('007', '3'), '10')
  assert.equal(addStrings('000', '0'), '0')
  console.log('✓ 进阶：去掉多余的前导 0')

  // 对照：直接转成 Number 相加，大数会丢精度
  assert.equal(String(Number('9007199254740993')), '9007199254740992')
  assert.equal(String(Number('9007199254740993') + Number('1')), '9007199254740992')
  console.log("✓ 对照：Number('9007199254740993') 是 9007199254740992，再加 1 还是 ...992，算错了")
}
