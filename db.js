let arr2set = (arr) => new Set(arr)
let set2arr = (set) => Array.from(set)

let obj2map = (obj) => new Map(Object.entries(obj).map(([k,v]) => [parseInt(k), v]))
let map2obj = (map) => Object.fromEntries(map)

let save_set = (key, set) => {
  let val = JSON.stringify(set2arr(set))
  localStorage.setItem(key, val)
}
let load_set = (key) => {
  let str = localStorage.getItem(key)
  if (str == null)
    return new Set()

  let val = JSON.parse(str)
  return arr2set(val)
}

let save_map = (key, map) => {
  let val = JSON.stringify(map2obj(map))
  localStorage.setItem(key, val)
}
let load_map = (key) => {
  let str = localStorage.getItem(key)
  if (str == null)
    return new Map()
  
  let val = JSON.parse(str)
  return obj2map(val)
}

let save_str = (key, str) => {
  localStorage.setItem(key, str)
}
let load_str = (key) => {
  let str = localStorage.getItem(key)
  if (str == null)
    return ''
  return str
}

let save_list = (key, json) => {
  let val = JSON.stringify(json)
  localStorage.setItem(key, val)
}
let load_list = (key) => {
  let str = localStorage.getItem(key)
  if (str == null)
    return []

  let val = JSON.parse(str)
  return val
}
