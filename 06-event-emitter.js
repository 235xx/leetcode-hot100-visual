class EventEmitter {
  constructor() {
    this.events = new Map()
  }

  on(name, fn) {
    if(!this.events.has(name)) this.events.set(name,[])
    this.events.get(name).push(fn)
    return this
  }

  off(name, fn) {
    const list = this.events.get(name)
    if(!list) return this
    if(fn === undefined){
      this.events.delete(name)
      return this
    }
    const index = list.findIndex((Fn)=>Fn === fn || Fn.raw === fn)
    if(index!== -1) list.splice(index,1)
    return this
  }

  once(name, fn) {
    const wrapper = (...args)=>{
      this.off(name,wrapper)
      fn.apply(this,args)
    }
    wrapper.raw = fn
    return this.on(name,wrapper)
  }

  emit(name, ...args) {
    const list = this.events.get(name)
    if(!list || list.length === 0) return false
    for(const fn of [...list]) fn.apply(this,args)
    return true
  }
}
