// context 为 null / undefined 时 this 指向 globalThis；原始值要包装成对象
Function.prototype.myCall = function (context, ...args) {
  const ctx = context == null ? globalThis : Object(context)
  const key = Symbol('fn')
  ctx[key] = this
  try{
    return ctx[key](...args)
  }finally{
    delete ctx[key]
  }
}

Function.prototype.myApply = function (context, args) {
  const ctx = context == null ? globalThis : Object(context)
  const key = Symbol('fn')
  
  ctx[key] = this
  try{
    return ctx[key](...args ?? [])
  }finally{
    delete ctx[key]
  }
}

// 返回新函数：支持预置参数；被 new 调用时忽略绑定的 this
Function.prototype.myBind = function (context, ...preset) {
  return (...rest) => this.myCall(context, ...preset, ...rest)
}
