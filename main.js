///////////
// UTIL //
///////////

let lower = (s) => s.toLowerCase()

let range = (lo, hi) => {
  if (hi == null) {
    hi = lo
    lo = 0
  }

  let arr = []
  for (var i = lo; i < hi; i++)
    arr.push(i)
  return arr
}

let delay = ms => new Promise(res => setTimeout(res, ms))

function parse_csv(text, delimiter = ",") {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

let $ = (id) => document.getElementById(id)

let Q = (q) => document.querySelector(q)

let goto = (el) => {
  el.scrollIntoView({behavior: 'smooth'})
}

////////////
// GLOBAL //
////////////

const PART = 30
const STATE_0 = {
  page_num: 1,
  query: load_str('query'),
  code: load_str('code'),
  xform: (item) => item,
}

var $state = null

////////////
// HN-API //
////////////

let fetch_item = async (id) => {
  let url = `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  let resp = await fetch(url, {
    'accept': 'application/json',    
    'content-type': 'application/json',
  })
  return resp.json()
}

let fetch_tree = async (id, rank, cache) => {
  let item = cache.has(id) ? cache.get(id) : await fetch_item(id)
  cache.set(id, item)
  // log(rank, id)
  
  item.rank = rank
  if (!('kids' in item))
    return item
  else {
    item.kids = await Promise.all(item.kids.map(async (kid) => {
      let subtree = typeof kid === 'number' ? await fetch_tree(kid, rank+1, cache)
                                            : kid
      return subtree
    })) 
    return item
  }
}

/////////
// CSV //
/////////



////////////
// CACHE //
////////////

const CACHE = {
  // durable
  top: load_list('top'),
  story: load_map('story'),
  comment: load_map('comment'),

  // ephemeral
  comtree: new Map(),
}

/////////////
// PRESENT //
/////////////

let since = (t) => {
  let now = Date.now() / 1000
  let seconds = Math.floor(now - t)
  let minutes = Math.floor(seconds / 60)
  let hours = Math.floor(seconds / (60 * 60))
  let days = Math.floor(seconds / (60 * 60 * 24))
  let months = Math.floor(seconds / (60 * 60 * 24 * 31))
  let years = Math.floor(seconds / (60 * 60 * 24 * 365))

  var unit = '?'
  var dt = 0
  if (seconds < 60) { unit = 'second'; dt = seconds }
  else if (minutes < 60) { unit = 'minute'; dt = minutes }
  else if (hours < 24) { unit = 'hour'; dt = hours }
  else if (days < 31) { unit = 'day'; dt = days }
  else if (months < 12) { unit = 'month'; dt = months }
  else { unit = 'year'; dt = years }
  if (dt > 1)
    unit += 's'
  
  return `${dt} ${unit} ago`
}

let get_top_rank = (id) => CACHE.top.indexOf(id) + 1

let parse_item_list = (txt) => {
  return parse_csv(txt, '\t')
    // .map(([id, title, url, score, by, time, descendants, ai]) => [parseInt(id), title, url, parseInt(score), by, parseInt(time), parseInt(descendants), parseInt(ai)])
    .map(([id, title, url, score, by, time, descendants, ai]) => ({
      id: parseInt(id),
      title,
      url,
      by,
      score: parseInt(score),
      time: parseInt(time),
      descendants: parseInt(descendants),
      ai: parseInt(ai),
    }))
}

let parse_comtree = (txt) => {
  return parse_csv(txt, '\t')
    .map(([id, text, by, time, lvl]) => ({
      id: parseInt(id),
      text,
      by,
      time: parseInt(time),
      lvl: lvl,
    }))
    // .map(([id, lvl]) => ({
    //   id: parseInt(id),
    //   lvl: parseInt(lvl),
    // }))
}

let match = (str, q) => {
  return lower(str).includes(lower(q))
}

let item_match = (q, item) => {
  let {title,by,url} = item
  return (title && match(title, q)) ||
         (by && match(by, q)) ||
         (url && match(url, q))
}

let highlight = (str, sub) => {
  // log('hl',str,sub)
  let re = new RegExp(sub, 'i')
  return str.replace(re, s => `<em>${s}</em>`)
}
// filter by common ai terms in title
// let tokenize = (str) => lower(str).split(' ')
let tokenize = (str) => {
    let lower = str.toLowerCase()
    let delimit = ` .,:-–+"'()[]/`
    let tokens = lower
      .split(/[ .,:\-+"'\[\]\(\)\/]/)
      .filter(c => !delimit.includes(c))
    return tokens
  }

let view_item = ({id, title, url, score, by, time, descendants, ai},idx) => {
  // let rank = get_top_rank(id)
  let rank = idx+1
  let is_ai = ai == '1'
  let noprotoc = url
    .replace('https://','')
    .replace('http://','')
    .replace('www.','')
  let site = noprotoc.split('/')[0]
  let ago = since(time)
  let comments_url = `https://news.ycombinator.com/item?id=${id}`
  let user_url = `https://news.ycombinator.com/user?id=${by}`
  let hn_from_url = `https://news.ycombinator.com/from?site=${site}`
  let discuss = descendants == 0 ? 'discuss' : `${descendants} comments`

  // hlsearch
  let q = $state.query.length > 0 ? $state.query : '<NO_MATCH>'
  let hl = {
    title: highlight(title,q),
    by: highlight(by,q),
    site: highlight(site,q),
    // site: match(noprotoc,q) ? highlight(noprotoc,q) : site
  }

  let div = $(id) ?? document.createElement('div')
  div.id = id
  div.classList = is_ai ? "story ai"
                        : "story"
  div.style.setProperty('--rank', rank)
  div.innerHTML = `<div class="row">
                    <span class="ord">${rank}.</span>
                    <a href="${url}">${hl.title}</a>
                    <div class="url">
                      (<a href="${hn_from_url}">${hl.site}</a>)
                    </div>
                  </div>
                  <div class="subrow">
                    <span class="score">${score}</span> points by
                    <a href="${user_url}">${hl.by}</a>
                    <a href="${comments_url}">${ago}</a> |
                    <a href="">hide</a> |
                    <a class="discuss" href="javascript:void(0)">${discuss}</a>
                  </div>`
  return div
}

let fetch_page = async (n) => {
  let url = `https://h.qork.io/page_min/${n}.csv`
  let resp = await fetch(url, {
    headers: {
      'accept': '*/*',    
      'content-type': 'text/plain; charset=utf-8',
    }
  })
  let txt = await resp.text()
  let items = parse_item_list(txt)
  return items
}

let fetch_comtree = async (id) => {
  let url = `https://h.qork.io/comtree/${id}.csv`
  let resp = await fetch(url, {
    headers: {
      'accept': '*/*',    
      'content-type': 'text/plain; charset=utf-8',
    }
  })
  if (!resp.ok)
    return null

  let txt = await resp.text()
  let items = parse_comtree(txt)
  return items
}

let view_page = async (n, xform) => {
  // get items
  // let top = await fetch_page(n)

  // cache top
  // CACHE.top = items.map(item => item.id)
  // save_list('top', CACHE.top)

  // cache story items
  // items.forEach(item => {
  //   CACHE.story.set(item.id, item)
  // })
  // save_map('story', CACHE.story)

  // log(items)
  // var items1 = items

  let topids = CACHE.top
  let topitems = topids.map(id => CACHE.story.get(id))
  var items = topitems
  
  // xform
  try {
    items = xform(topitems)
    $('runerror').innerHTML = ''
  }
  catch (e) {
    $('runerror').innerHTML = e
  }

  let views = items
  .filter(item => item_match($state.query, item))
  .map((item,idx) => view_item(item,idx))

  let container = $('list')
  container.innerHTML = ''
  views.forEach(view => container.appendChild(view))

  return

  // let rows = items1
  //   .filter(item => item_match($state.query, item))
  //   .map(item => view_item(item))
  //   // .join('')
  
  // let container = $('row-container') ?? document.createElement('div')
  // container.id = 'row-container'

  // let container = $('list')
  // container.innerHTML = ''
  // rows.forEach(row => container.appendChild(row))
}

let link = (txt) => {
  return `<a class="${txt}" href="javascript:void(0)">${txt}</a>`
}

let comment = (item, parent, rank) => {
  // log(item)
  let ago = since(item.time)
  
  let has_prev = true//parent.kids.indexOf(item) > 0
  let has_next = true//parent.kids.indexOf(item) < parent.kids.length-1
  let links = [
    rank > 1 ? link('root') : null,
    rank > 0 ? link('parent') : null,
    has_prev ? link('prev') : null,
    has_next ? link('next') : null,
  ]
  .filter(l => l != null)
  .join(' | ')
  
  let kids = 'kids' in item ? item.kids.map(kid => comment(kid, item, rank+1)).join('')
                            : ''
  return `<div id="${item.id}" class="comment" style="margin-left: ${item.lvl*30}px;">
            <div class="subrow">
              <a href="https://news.ycombinator.com/user?id=${item.by}">${item.by}</a>
              <a href="https://news.ycombinator.com/item?id=${item.id}">${ago}</a> |
              ${links}
              ${link('[-]')}
            </div>
            <div class="body">
              <p>${item.text}</p>
              <a class="reply" href="https://news.ycombinator.com/reply?id=${item.id}">reply</a>
              ${kids}
            </div>
          </div>`
}

let view_story = async (id) => {
  let {title, url, score, by, time, descendants, kids, ai} = CACHE.story.get(id)
  let rank = get_top_rank(id)
  let noprotoc = url
    .replace('https://','')
    .replace('http://','')
    .replace('www.','')
  let site = noprotoc.split('/')[0]
  let ago = since(time)
  let comments_url = `https://news.ycombinator.com/item?id=${id}`
  let user_url = `https://news.ycombinator.com/user?id=${by}`
  let hn_from_url = `https://news.ycombinator.com/from?site=${site}`
  let discuss = descendants == 0 ? 'discuss' : `${descendants} comments`

  // hlsearch
  let q = $state.query.length > 0 ? $state.query : '<NO_MATCH>'
  let hl = {
    title: highlight(title,q),
    by: highlight(by,q),
    site: highlight(site,q),
    // site: match(noprotoc,q) ? highlight(noprotoc,q) : site
  }

  // comments
  let comtree = CACHE.comtree.has(id) ? CACHE.comtree.get(id)
                                      : await fetch_comtree(id)
  CACHE.comtree.set(id,comtree)
  let comments = comtree ? comtree.map(com => comment(com, null, 0)).join('')
                         : `<p>0</p><p>1</p><p>2</p>`
  // let comments = comtree ? comtree.map(com => `<div style="margin-left:${com.lvl*30}px">${com.id}</div>`).join('')
  //                        : `<p>0</p><p>1</p><p>2</p>`

  let div = $(`s${id}`) ?? document.createElement('div')
  div.id = id
  div.classList = ai ? "item ai"
                     : "item"
  div.style.setProperty('--rank', rank)
  div.innerHTML = `<div class="row">
                    <a href="${url}">${hl.title}</a>
                    <div class="url">
                      (<a href="${hn_from_url}">${hl.site}</a>)
                    </div>
                  </div>
                  <div class="subrow">
                    <span class="score">${score}</span> points by
                    <a href="${user_url}">${hl.by}</a>
                    <a href="${comments_url}">${ago}</a> |
                    <a href="">hide</a> |
                    <a class="discuss" href="javascript:void(0)">${discuss}</a>
                  </div>
                  ${comments}`
  div.onpointerover = () => {
    log('pointer over',id)
  }
  // let story = CACHE.story.get(id)
  // let view = view_item(story)
  let container = $('tree')
  container.innerHTML = ''
  container.appendChild(div)
  return



  // let topids = CACHE.top
  // let topitems = topids.map(id => CACHE.story.get(id))
  // let views = topitems.map(item => view_item(item))

  // let container = $('list')
  // container.innerHTML = ''
  // views.forEach(view => container.appendChild(view))






  // let page_index = n-1
  // let url = `http://localhost:8081/page/${n}.json`
  // let resp = await fetch(url, {
  //   'accept': 'application/json',    
  //   'content-type': 'application/json',
  // })
  // let items = await resp.json()
  // let item = items.find(it => it.id == id)
  // if (item == null)
  //   return

  // let site = item.url
  //     .replace('https://','')
  //     .replace('http://','')
  //     .replace('www.','')
  //     .split('/')
  //     [0]
  // let ago = since(item.time)
  // let comments_url = `https://news.ycombinator.com/item?id=${item.id}`
  // let user_url = `https://news.ycombinator.com/user?id=${item.by}`
  // let from_site_url = `https://news.ycombinator.com/from?site=${site}`

  // let discuss = item.descendants == 0 ? 'discuss' : `${item.descendants} comments`
  // let text = 'text' in item ? `<div class="subrow">${item.text}</div>` : ''

  // let story_info = `<div class="story">
  //               <div class="row">
  //                 <a href="${item.url}">${item.title}</a>
  //                 <span class="url">(<a href="${from_site_url}">${site}</a>)</span>
  //               </div>
  //               <div class="subrow">
  //                 ${item.score} points by
  //                 <a href="${user_url}">${item.by}</a>
  //                 <a href="${comments_url}">${ago}</a> |
  //                 <a href="">hide</a> |
  //                 <a class="discuss" href="javascript:void(0)">${discuss}</a>
  //               </div>
  //               ${text}
  //               <div id="comments_root"></div>
  //             </div>`
  // document.getElementById('root').innerHTML = story_info

  // // let story_id = id
  // let comment_cache = load_map(id)
  // let tree = await fetch_tree(id, 0, comment_cache)
  // save_map(id, comment_cache)
  
  // // present
  // let comments_root = $('comments_root')
  // let toplevel = tree.kids.map(kid => comment(kid, tree, 0)).join('')
  // comments_root.innerHTML = toplevel

  // let el = document.createElement('div')
  // el.classList = 'comment'
  // el.id = c.id
  // el.innerHTML = inner
  // return el

  // .forEach(async (id) => {
  //   let c = comment_cache.has(id) ? comment_cache.get(id)
  //                                 : await fetch_item(id)
  //   comment_cache.set(id, c)
  //   save_map(story_id, comment_cache)

  //   let com = comment(c)
  //   comment_container.appendChild(com)
  // })
}

let body = () => {
  return `
  <div id="head">
    <!--𝞖-->
    <!--<span id="h">ℌ</span>-->
    <!--🎃-->
    <!--<input id="live" type="checkbox">live</input>-->
    <!--<select>
      <option>top</option>
      <option>new</option>
    </select>-->
  </div>
  <div id="root">
    <div class="ed">
      <input id="query" type="text"></input>  
      <textarea id="code" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>
      <div id="error"></div>
      <div id="runerror"></div>
    </div>
    <div id="list"></div>
    <div id="tree"></div>
  </div>`
}

let xformd = async () => {
  view_page($state.page_num, $state.xform)
  // let res = await page($state.page_num, $state.xform)
  // $('list').appendChild(res)
  // $('list').innerHTML = res
}

let onquery = (ev) => {
  let q = ev.target.value
  $state.query = q
  save_str('query', q)

  // update
  xformd()
}

let oneval = (ev) => {
  let code = ev.target.value
  $state.code = code
  save_str('code', code)

  // update
  try {
    let res = eval(code)
    $state.xform = res
    $('error').innerHTML = ''
    xformd()
  }
  catch (e) {
    $('error').innerHTML = e
  }
}

let present = async () => {
  if (!$state)
    $state = STATE_0
  
  document.body.innerHTML = body()

  //////////////
  // querying //
  //////////////

  // query string
  let query_field = $('query')
  query_field.oninput = onquery

  // // eval xform code
  let code_field = $('code')
  code_field.oninput = oneval
  code_field.onkeydown = (ev) => {
    // if (ev.key == "Tab") {
    //   ev.preventDefault()
    // }
  }

  //////////
  // view //
  //////////

  // top view
  xformd()

  // story view
  // view_story(CACHE.top[0])
  // log(CACHE.top[0])


  ////////////////
  // navigation //
  ////////////////
  // let { page_num, item_id } = $state
  // if ('item_id' in $state) {
  //   story(page_num, item_id)
  // }
  // else {
  //   xformd()
  // }
}

let rerank = async () => {
  CACHE.top.forEach(async (id) => {
    view_item(CACHE.story.get(id))
  })
}

//////////////
// INTERACT //
//////////////

let onmove = (ev) => {
  // log(ev)
  let page_div = $('list')
  // log(page_div.getBoundingClientRect())
}
document.onpointermove = onmove

let onhover = (ev) => {
  let el = ev.target
  // log(el)
  let classes = [...el.classList]
  if (classes.includes('story')) {
    let id = parseInt(el.id)
    view_story(id)
  }
  // if (el.classList == 'story') {
  //   $('tree').innerHTML = el
  // }
  // if (el.tagName == 'A') {
  //   $('tree').innerHTML = el.href
  // }
}
document.onpointerover = onhover

let onkeydown = (ev) => {
  let key = ev.key
  let query = $('query')
  // log(key)
  switch(key) {
    case '/':
      query.select()
      ev.preventDefault()
      break

    case 'Escape':
      query.value = ''
      query.blur()
      onquery({target: query})
  }
}
document.onkeydown = onkeydown

let onclick = (evt) => {
  let el = evt.target

  // story links
  if (el.classList == 'discuss') {
    let story = el.parentNode.parentNode
    let id = parseInt(story.id)
    $state.item_id = id
    log($state)
    history.pushState($state, 'story', `/item?id=${id}`)
    present()

    log('discuss!', id)
  }

  // comment links
  if (el.parentNode && el.parentNode.parentNode) {
    let item = el.parentNode.parentNode
    if (el.classList == 'root') {
      while (item.parentNode.id != 'comments_root')
        item = item.parentNode
      goto(item)
    }
    else if (el.classList == 'parent')
      goto(item.parentNode)
    else if (el.classList == 'prev')
      goto(item.previousSibling)
    else if (el.classList == 'next')
      goto(item.nextSibling)
    else if (el.classList == '[-]') {
      let body = item.children[1] 
      body.hidden = !body.hidden
    }
  }
}
document.onclick = onclick

let onpop = (evt) => {
  $state = evt.state
  present()
}
window.onpopstate = onpop

//////////
// MAIN //
//////////

// localStorage.clear()
let init = async () => {
  present()
  $('query').value = $state.query
  $('code').innerHTML = $state.code

  // mock rerank
  // await delay(1000)
  // let i0 = 0
  // let i1 = 1
  // let fst = CACHE.top[i0]
  // let snd = CACHE.top[i1]
  // CACHE.top[i0] = snd
  // CACHE.top[i1] = fst
  // // CACHE.top = CACHE.top.slice(0,10)
  // CACHE.top.forEach(async (id, idx) => {
  //   await delay(idx)
  //   view_item(CACHE.story.get(id))
  // })
}
init()

//////////
// ONCE //
//////////

window.onload = async () => {
  let items = await fetch_page(1)

  // cache top
  CACHE.top = items.map(item => item.id)
  save_list('top', CACHE.top)

  // cache story items
  items.forEach(item => CACHE.story.set(item.id, item))
  save_map('story', CACHE.story)

  // let fire = window.firebase
  // let app = fire.initializeApp({
  //   databaseURL: 'https://hacker-news.firebaseio.com'
  // })
  // let db = fire.getDatabase(app)

  // get story
  // let id = 50268380
  // let snap = await fire.get(fire.ref(db, `v0/item/${id}`))
  // log(snap.val())
  // log('db.get',db)
  // let ref = fire.ref(db, `v0/item/${id}`)
  // log(ref.get)
  // ref.on('value', async (snap) => {
  //   log('on val', snap.val())
  // })
  // fire.get(fire.ref(db, `v0/item/${id}`), async (snap) => {
  //   let item = snap.val()
  //   log(item)
  // })

  // watch story
  // let id = 50268380
  // fire.onValue(fire.ref(db, `v0/item/${id}`), async (snap) => {
  //   let item = snap.val()
  //   view_item(item)
    
  //   // log(id, item)
  //   // log('el',$(id))
  //   // let score_span = $(id).children[1].children[0]
  //   // score_span.innerHTML = item.score
  //   // score_span.classList.toggle('up')
  //   // let title_a = $(id).children[0].children[1]
  //   // title_a.innerHTML = item.title
  //   // title_a.classList.toggle('up')
  // })

  // watch top
  // fire.onValue(fire.ref(db, `v0/topstories`), async (snap) => {
  //   let top = snap.val()
  //   log('onValue top',top)

  //   // cache
  //   CACHE.top = top
  //   save_list('top', top)
  //   rerank()
  //   // xformd()


  //   // watch top 10
  //   // top.slice(0,10).forEach(id => {
  //   //   log('watch',id)
  //   //   fire.onValue(fire.ref(db, `v0/item/${id}`), async (item_snap) => {
  //   //     log('got',id)
  //   //     let item = item_snap.val()
  //   //     log(item)
  //   //     view_item(item)
  //   //   })
  //   // })

  //   // todo reorder by rank
  // })

  // watch new
  // fire.onValue(fire.ref(db, `v0/newstories`), async (snap) => {
  //   let val = snap.val()
  //   log(val)
  // })

  // watch updates
  // fire.onValue(fire.ref(db, `v0/updates`), async (snap) => {
  //   let val = snap.val()
  //   log(val)
  // })
}