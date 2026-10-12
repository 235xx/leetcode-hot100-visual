/**
 * 16 URL 参数解析
 *
 * 规格：parseQuery(url) 把 URL 里 ? 后面的查询参数解析成对象
 * - 'https://a.com/p?x=1&y=2' → { x: '1', y: '2' }，值都是字符串
 * - 值要解码：%E4%BD%A0 → 你；表单编码里 + 表示空格
 * - 同名参数转成数组：x=1&x=2 → { x: ['1', '2'] }
 * - 没有 = 的参数，值为 true：?debug → { debug: true }
 * - 值里可能还有 =：t=a=b → { t: 'a=b' }，按第一个 = 拆
 * - # 后面的部分不算；没有查询参数时返回 {}
 * - 进阶：键也要解码；忽略空的 &&
 *
 * 要点：
 * - 顺序：先 split('#')[0] 再取 ? 后面，否则 hash 里的 ? 会被当成查询参数（/#/page?id=1）
 * - 用 indexOf('=') 找第一个等号，值里可能还有等号
 * - decodeURIComponent 解码；+ 代表空格，要先 replace(/\+/g, ' ') 再解码，
 *   顺序反了，%2B 解出来的 + 也会被换成空格
 * - 用 Object.hasOwn(result, key) 判断是否重复，再用 [].concat(old, value) 合并成数组
 *
 * 常见错误：
 * - split('=') 后只取 [0]、[1]：值里有等号时被截断
 * - 忘了解码：中文和空格会变成 %E4%BD%A0、%20
 * - 用 if (result[key]) 判断是否已存在：值是空字符串时会误判，?a=&a=1 只剩下 '1'
 *
 * 追问：
 * - 原生 API：new URL(url).searchParams，get 取第一个，getAll 取全部；
 *   Object.fromEntries(searchParams) 对同名参数只保留最后一个
 * - hash 路由里的参数（/#/page?id=1）：看需求，要单独从 location.hash 里解析
 * - 反过来把对象转成查询字符串：每个键和值都用 encodeURIComponent 编码，
 *   数组展开成多个同名参数，用 & 连接
 */

const decode = (s) => decodeURIComponent(s.replace(/\+/g, ' ')) // + 表示空格，先换再解码

function parseQuery(url) {
  const query = url.split('#')[0].split('?')[1] ?? '' // 先去掉 # 后面，再取 ? 后面
  const result = {}
  for (const pair of query.split('&')) {
    if (!pair) continue // 忽略空的 &&
    const eq = pair.indexOf('=') // 按第一个 = 拆，值里可能还有 =
    const key = decode(eq === -1 ? pair : pair.slice(0, eq))
    const value = eq === -1 ? true : decode(pair.slice(eq + 1))
    if (Object.hasOwn(result, key)) result[key] = [].concat(result[key], value) // 同名参数转数组
    else result[key] = value
  }
  return result
}

module.exports = { parseQuery }

// ---------------- 测试：node 16-parse-query.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  assert.deepEqual(parseQuery('https://a.com/p?x=1&y=2'), { x: '1', y: '2' })
  console.log('✓ 基本解析，值都是字符串')

  assert.deepEqual(parseQuery('https://a.com/?name=%E4%BD%A0%E5%A5%BD&q=a+b&s=c%20d'), { name: '你好', q: 'a b', s: 'c d' })
  assert.deepEqual(parseQuery('https://a.com/?expr=1%2B1'), { expr: '1+1' })
  console.log('✓ 解码：中文、%20、+ 变空格，%2B 还是 +')

  assert.deepEqual(parseQuery('https://a.com/?x=1&x=2&x=3'), { x: ['1', '2', '3'] })
  assert.deepEqual(parseQuery('https://a.com/?a=&a=1'), { a: ['', '1'] })
  console.log('✓ 同名参数转成数组（值是空字符串也算已存在）')

  assert.deepEqual(parseQuery('https://a.com/?debug&x=1'), { debug: true, x: '1' })
  console.log('✓ 没有 = 的参数值为 true')

  assert.deepEqual(parseQuery('https://a.com/?t=a=b'), { t: 'a=b' })
  console.log('✓ 值里有 = 时按第一个拆')

  assert.deepEqual(parseQuery('https://a.com/?a=1#b=2'), { a: '1' })
  assert.deepEqual(parseQuery('https://a.com/#/page?id=1'), {})
  console.log('✓ 忽略 # 后面的部分（? 出现在 # 后面时不算）')

  assert.deepEqual(parseQuery('https://a.com/path'), {})
  assert.deepEqual(parseQuery('https://a.com/path?'), {})
  console.log('✓ 没有查询参数时返回 {}')

  assert.deepEqual(parseQuery('https://a.com/?name%20x=1&&y=2'), { 'name x': '1', y: '2' })
  console.log('✓ 进阶：键也解码，忽略空的 &&')

  const url = 'https://a.com/p?name=%E4%BD%A0&x=1&x=2&debug&t=a=b#top'
  assert.deepEqual(parseQuery(url), { name: '你', x: ['1', '2'], debug: true, t: 'a=b' })
  console.log('✓ 动画里那条 URL 的结果一致')

  // 对照：原生 URLSearchParams
  const params = new URL(url).searchParams
  assert.deepEqual(params.getAll('x'), ['1', '2'])
  assert.equal(params.get('debug'), '') // 没有 = 时是空字符串，不是 true
  assert.deepEqual(Object.fromEntries(params).x, '2')
  console.log("✓ 对照：searchParams.getAll('x') 能拿全部，Object.fromEntries 只留最后一个 '2'")
}
