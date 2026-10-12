/**
 * 20 Ajax 封装
 *
 * 规格：用 XMLHttpRequest 封装 request({ method = 'GET', url, data, headers, timeout })，返回 Promise
 * - 用 open(method, url, true) 发异步请求，最后调用 send
 * - 状态码 200–299 时 resolve 响应文本 responseText
 * - 其他状态码 reject 一个 Error，message 里带上状态码
 * - 网络错误（onerror）时 reject
 * - 有 data 时发送 JSON.stringify(data)，并设置 Content-Type: application/json
 * - 进阶：支持 headers 自定义请求头；支持 timeout，超时 reject
 *
 * 要点：
 * - 步骤：new XMLHttpRequest → open → 设置请求头 → 绑定回调 → send，外面用 Promise 包一层
 * - readyState：0 还没调用 open，1 已 open，2 收到响应头，3 正在接收响应体，4 完成
 * - 判断成功用 status >= 200 && status < 300，不要只判断 200
 * - setRequestHeader 必须在 open 之后、send 之前调用
 * - onerror 处理网络错误（此时 status 是 0）；ontimeout 处理超时
 *
 * 常见错误：
 * - 在回调里 throw 错误：外面的 try/catch 和 .catch 都接不到，Promise 一直挂着，应该 reject（原文档的坑）
 * - 发送对象时没有 JSON.stringify：请求体变成 "[object Object]"
 * - 在 open 之前调用 setRequestHeader：直接报错
 *
 * 追问：
 * - fetch 和 XHR 的区别：fetch 基于 Promise；404、500 不会 reject（只有网络错误才会），要自己看 response.ok；
 *   默认不带跨域 cookie；没有上传进度事件（XHR 有 upload.onprogress）
 * - 怎么取消请求：XHR 用 xhr.abort()；fetch 用 AbortController
 * - 怎么做失败重试：失败后再调一次 request 并记录次数，可以配合指数退避，每次等待时间翻倍
 *
 * 注意：Node 里没有 XMLHttpRequest，下面的测试用一个模拟的 FakeXHR 代替，不会真的发请求。
 */

function request({ method = 'GET', url, data, headers = {}, timeout = 0 }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true) // 第三个参数 true：异步
    // 请求头要在 open 之后、send 之前设置
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
    if (data !== undefined) xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.timeout = timeout // 0 表示不限时
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return // 4 = 请求完成
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText)
      else if (xhr.status !== 0) reject(new Error(`Request failed with status ${xhr.status}`))
      // status 为 0：网络错误或超时，交给下面的 onerror / ontimeout
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.ontimeout = () => reject(new Error(`Timeout after ${timeout}ms`))
    xhr.send(data === undefined ? null : JSON.stringify(data))
  })
}

module.exports = { request }

// ---------------- 测试：node 20-ajax.js ----------------
if (require.main === module) {
  const assert = require('node:assert/strict')

  // 模拟的 XMLHttpRequest：send 之后 10ms 调用 behavior(xhr)，由它决定怎么响应
  // xhr.respond(200, 'ok') 成功；xhr.respond(404) 失败；xhr.respond(0) 网络错误；不调用就一直挂着
  async function withFakeXHR(behavior, run) {
    const calls = []
    class FakeXHR {
      constructor() {
        Object.assign(this, { readyState: 0, status: 0, responseText: '', timeout: 0, requestHeaders: {}, sent: false, done: false })
        calls.push(this)
      }
      open(method, url, async = true) {
        Object.assign(this, { method: String(method).toUpperCase(), url, async, readyState: 1 })
        this.onreadystatechange?.()
      }
      setRequestHeader(key, value) {
        if (this.readyState !== 1) throw new Error("Failed to execute 'setRequestHeader': the object's state must be OPENED.")
        this.requestHeaders[String(key).toLowerCase()] = value
      }
      send(body = null) {
        if (this.readyState !== 1) throw new Error("Failed to execute 'send': the object's state must be OPENED.")
        Object.assign(this, { sent: true, body })
        if (this.timeout > 0) this.timer = setTimeout(() => this.finish('ontimeout'), this.timeout)
        setTimeout(() => behavior(this), 10)
      }
      respond(status, body = '') {
        if (this.done) return
        Object.assign(this, { status, responseText: body })
        this.finish(status === 0 ? 'onerror' : 'onload')
      }
      finish(handler) {
        this.done = true
        clearTimeout(this.timer)
        this.readyState = 4
        this.onreadystatechange?.()
        this[handler]?.()
      }
    }
    const saved = globalThis.XMLHttpRequest
    globalThis.XMLHttpRequest = FakeXHR
    try {
      return await run(calls)
    } finally {
      globalThis.XMLHttpRequest = saved
    }
  }

  ;(async () => {
    await withFakeXHR((xhr) => xhr.respond(200, 'hello'), async (calls) => {
      const p = request({ url: '/api/user' })
      assert.ok(typeof p.then === 'function')
      assert.equal(await p, 'hello')
      assert.equal(calls.length, 1)
      assert.deepEqual([calls[0].method, calls[0].url, calls[0].async], ['GET', '/api/user', true])
      assert.ok(calls[0].sent)
    })
    console.log("✓ 默认 GET，open(method, url, true) 后 send，200 时 resolve 响应文本")

    await withFakeXHR((xhr) => xhr.respond(204, ''), async () => {
      assert.equal(await request({ url: '/a' }), '')
    })
    console.log('✓ 2xx 都算成功（204 也 resolve）')

    await withFakeXHR((xhr) => xhr.respond(404, 'not found'), async () => {
      await assert.rejects(request({ url: '/missing' }), /404/)
    })
    console.log('✓ 状态码不是 2xx 时 reject，错误信息带状态码')

    await withFakeXHR((xhr) => xhr.respond(0), async () => {
      await assert.rejects(request({ url: '/a' }), /Network error/)
    })
    console.log('✓ 网络错误（onerror）时 reject')

    await withFakeXHR((xhr) => xhr.respond(200, '{}'), async (calls) => {
      await request({ method: 'post', url: '/a', data: { x: 1 } })
      assert.equal(calls[0].method, 'POST')
      assert.equal(calls[0].body, '{"x":1}')
      assert.equal(calls[0].requestHeaders['content-type'], 'application/json')
    })
    console.log('✓ 有 data 时发送 JSON，并设置 Content-Type')

    await withFakeXHR((xhr) => xhr.respond(200, 'ok'), async (calls) => {
      await request({ url: '/a', headers: { Authorization: 'Bearer t' } })
      assert.equal(calls[0].requestHeaders.authorization, 'Bearer t')
    })
    console.log('✓ 进阶：支持自定义 headers')

    await withFakeXHR(() => {}, async () => {
      const t0 = Date.now()
      await assert.rejects(request({ url: '/slow', timeout: 50 }), /Timeout/)
      assert.ok(Date.now() - t0 < 200)
    })
    console.log('✓ 进阶：超时时 reject')

    // 对照：原文档的写法，在回调里 throw。Promise 一直挂着，错误变成未捕获异常
    const throwingRequest = (url) =>
      new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url, true)
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return
          if (xhr.status === 200) resolve(xhr.responseText)
          else throw new Error(`status ${xhr.status}`)
        }
        xhr.send()
      })
    await withFakeXHR((xhr) => xhr.respond(404), async () => {
      const uncaught = new Promise((resolve) => process.once('uncaughtException', resolve))
      let settled = false
      throwingRequest('/missing').then(
        () => (settled = true),
        () => (settled = true),
      )
      const err = await uncaught
      assert.equal(err.message, 'status 404')
      assert.equal(settled, false)
    })
    console.log('✓ 对照：在回调里 throw，.catch 接不到，Promise 一直是 pending，错误变成 Uncaught')
  })()
}
