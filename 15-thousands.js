/**
 * 15 千分位格式化
 *
 * 规格：formatThousands(num) 返回字符串
 * - 整数部分从右往左每三位加一个逗号：1234567 → '1,234,567'
 * - 不足四位不加：123 → '123'；开头不能出现逗号：123456 → '123,456'
 * - 小数部分原样保留：1234567.891 → '1,234,567.891'
 * - 负数：-1234567 → '-1,234,567'
 * - 进阶：参数也可能是字符串，要保留小数末尾的 0：'1234567.10' → '1,234,567.10'
 *
 * 要点：
 * - 先 String(num).split('.')，只对整数部分加逗号，小数部分最后原样拼回去
 * - 正则 /\B(?=(\d{3})+$)/g：\B 是"不是单词边界的位置"，保证不会在开头插逗号；
 *   (?=(\d{3})+$) 要求这个位置后面到结尾的数字个数是 3 的倍数
 * - 负号和数字之间是单词边界，\B 不匹配，所以负数不用特殊处理
 * - 循环写法：从个位往前数，每数满三位、并且前面还有数字，就加一个逗号
 *
 * 常见错误：
 * - 整个数字一起套正则：'.' 不是数字，整数部分的位置往后看都碰不到结尾，一个逗号都加不上；
 *   小数部分反而会被加：1234.5678 变成 '1234.5,678'
 * - 分隔符写成了点号（原文档的笔误）
 * - toLocaleString 默认把小数四舍五入到 3 位：(1234.56789).toLocaleString('en-US') 是 '1,234.568'
 *
 * 追问：
 * - 原生方法：num.toLocaleString('en-US')，或者
 *   new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 }).format(num)；注意默认的小数位数限制
 * - (?=...) 是先行断言：只检查后面的内容是否满足条件，不消耗字符，所以逗号是插在"位置"上的
 * - 数字特别大：超过 1e21 时 String(num) 会变成科学计数法，要让调用方直接传字符串
 */

function formatThousands(num) {
  const [intPart, decPart] = String(num).split('.') // 只处理整数部分
  // \B：不是单词边界（不会在开头插）；(?=(\d{3})+$)：这个位置后面到结尾的数字个数是 3 的倍数
  const grouped = intPart.replace(/\B(?=(\d{3})+$)/g, ',')
  return decPart === undefined ? grouped : `${grouped}.${decPart}`
}

// 不用正则：从个位往前数，每满三位且前面还有数字就加逗号
function formatThousandsLoop(num) {
  const [intPart, decPart] = String(num).split('.')
  let out = ''
  let count = 0
  for (let i = intPart.length - 1; i >= 0; i--) {
    out = intPart[i] + out
    count++
    const hasMoreDigits = i > 0 && intPart[i - 1] !== '-' // 前面是负号就不算
    if (count % 3 === 0 && hasMoreDigits) out = `,${out}`
  }
  return decPart === undefined ? out : `${out}.${decPart}`
}

module.exports = { formatThousands, formatThousandsLoop }

// ---------------- 测试：node 15-thousands.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  assert.equal(formatThousands(1234567), '1,234,567')
  assert.equal(formatThousands(1000), '1,000')
  console.log('✓ 每三位一个逗号')

  assert.equal(formatThousands(123), '123')
  assert.equal(formatThousands(0), '0')
  console.log('✓ 不足四位不加逗号')

  assert.equal(formatThousands(123456), '123,456')
  assert.equal(formatThousands(123456789), '123,456,789')
  console.log('✓ 位数是 3 的倍数时开头没有逗号')

  assert.equal(formatThousands(1234567.891), '1,234,567.891')
  assert.equal(formatThousands(1234.5678), '1,234.5678')
  console.log('✓ 小数部分原样保留，不加逗号')

  assert.equal(formatThousands(-1234567), '-1,234,567')
  assert.equal(formatThousands(-123), '-123')
  console.log('✓ 负数')

  assert.equal(formatThousands('1234567.10'), '1,234,567.10')
  console.log('✓ 进阶：字符串参数保留小数末尾的 0')

  const inputs = [0, 7, 123, 1000, 123456, 1234567, 1234.5678, -123, -123456, -1234567.891, '1234567.10']
  for (const x of inputs) assert.equal(formatThousandsLoop(x), formatThousands(x), `输入 ${x}`)
  console.log('✓ 循环写法和正则写法结果一致（包括负数和三位一组的边界）')

  // 对照：整个数字一起套正则，整数部分没加上，小数部分反而加了
  assert.equal(String(1234.5678).replace(/\B(?=(\d{3})+$)/g, ','), '1234.5,678')
  console.log("✓ 对照：整个数字一起套正则，1234.5678 变成 '1234.5,678'")

  // 对照：toLocaleString 默认最多保留 3 位小数
  assert.equal((1234.56789).toLocaleString('en-US'), '1,234.568')
  console.log("✓ 对照：(1234.56789).toLocaleString('en-US') 是 '1,234.568'，小数被四舍五入了")
}
