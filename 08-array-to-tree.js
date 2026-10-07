/**
 * 08 数组转树
 *
 * 规格：把 { id, pid } 平铺数组转成树，每个节点带 children；pid 等于 rootPid 的是根节点
 *
 * 要点：
 * - 哈希表两遍遍历，O(n)：
 *   第一遍把每个节点 { ...item, children: [] } 按 id 放进 Map；
 *   第二遍把每个节点塞进它父节点的 children
 * - { ...item } 新建节点，不修改入参
 * - 两遍遍历不依赖数组顺序：子节点出现在父节点前面也没关系
 * - 找不到父节点的"孤儿"怎么处理要问清楚：这里直接丢弃，也可以当成根节点
 * - 叶子节点带不带空的 children: [] 也要看题目要求
 *
 * 追问：
 * - 只遍历一遍：遇到还没出现的父节点，先放一个占位对象，等它出现时再把字段补上
 * - 递归写法：每一层都扫一遍全表，O(n²)，数据量大时明显变慢（见测试里的耗时对比）
 * - 反过来树转数组：DFS 或 BFS
 * - 按 id 找从根到该节点的路径：DFS + 回溯
 *
 * 原文档的坑：递归版直接往原数组元素上挂 children，修改了入参；而且是 O(n²)。
 */

// 推荐：Map 两遍遍历，O(n)
function arrayToTree(list, rootPid = 0) {
  const map = new Map()
  for(const item of list) map.set(item.id,{...item,children:[]})
  
  const roots = []
  for(const item of list){
    const node = map.get(item.id)
    if(item.pid === rootPid) roots.push(node)
    else map.get(item.pid)?.children.push(node)
  }
  return roots
}
