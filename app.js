/**
 * 榜单页逻辑：读同目录下的 rank.json，渲染成可筛选、可搜索的列表。
 *
 * 全部用 DOM API 创建节点，不用 innerHTML —— 书名是第三方页面上抓来的字符串，
 * 里面出现 < 或 & 完全可能，拼字符串迟早出事。
 */
;(function () {
  var state = { books: [], filter: 'all', keyword: '' }

  var $list = document.getElementById('list')
  var $chips = document.getElementById('chips')
  var $meta = document.getElementById('meta')
  var $empty = document.getElementById('empty')
  var $q = document.getElementById('q')

  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function toast(msg) {
    var t = el('div', null, msg)
    t.style.cssText =
      'position:fixed;left:50%;bottom:36px;transform:translateX(-50%);background:rgba(0,0,0,.82);' +
      'color:#fff;font-size:13px;padding:8px 16px;border-radius:10px;z-index:99;pointer-events:none'
    document.body.appendChild(t)
    setTimeout(function () {
      t.remove()
    }, 1400)
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast('已复制：' + text)
        },
        function () {
          toast('复制失败')
        }
      )
    } else {
      toast('长按书名手动复制')
    }
  }

  // ---------- 渲染 ----------

  function siteOf(book) {
    // 数据里已经带了 sites（站点名数组），旧数据没有就退回从 boards 里切
    if (Array.isArray(book.sites)) return book.sites
    return (book.boards || []).map(function (b) {
      return String(b).split('·')[0]
    })
  }

  function matches(book) {
    if (state.filter !== 'all') {
      var sites = siteOf(book)
      if (sites.indexOf(state.filter) === -1) return false
    }
    if (!state.keyword) return true
    var k = state.keyword.toLowerCase()
    return (
      book.title.toLowerCase().indexOf(k) !== -1 ||
      (book.author || '').toLowerCase().indexOf(k) !== -1 ||
      (book.category || '').toLowerCase().indexOf(k) !== -1
    )
  }

  function renderChips() {
    var sites = {}
    state.books.forEach(function (b) {
      siteOf(b).forEach(function (s) {
        sites[s] = (sites[s] || 0) + 1
      })
    })
    var names = Object.keys(sites).sort(function (a, b) {
      return sites[b] - sites[a]
    })

    $chips.textContent = ''
    var all = el('button', 'chip on', '全部 ' + state.books.length)
    all.dataset.site = 'all'
    $chips.appendChild(all)

    names.forEach(function (name) {
      var c = el('button', 'chip', name + ' ' + sites[name])
      c.dataset.site = name
      $chips.appendChild(c)
    })
  }

  function renderList() {
    var rows = state.books.filter(matches)
    $list.textContent = ''
    $empty.hidden = rows.length > 0

    rows.forEach(function (book) {
      var li = el('li', 'item')
      li.dataset.id = book.id

      var no = el('span', 'no' + (book.hot <= 3 ? ' top3' : ''), String(book.hot))
      var body = el('div', 'body')

      var title = el('p', 'title', book.title)
      var meta = el('p', 'meta-line')

      if (book.author) {
        meta.appendChild(el('span', null, book.author))
      }
      if (book.category) {
        if (meta.childNodes.length) meta.appendChild(el('span', 'dot', '·'))
        meta.appendChild(el('span', null, book.category))
      }
      if (book.status) {
        if (meta.childNodes.length) meta.appendChild(el('span', 'dot', '·'))
        meta.appendChild(el('span', null, book.status))
      }
      if (meta.childNodes.length) meta.appendChild(el('span', 'dot', '·'))

      var badge = el('span', 'badge' + (book.siteCount >= 2 ? ' hot' : ''), book.siteCount + ' 站 · ' + book.boards.length + ' 榜')
      meta.appendChild(badge)

      body.appendChild(title)
      body.appendChild(meta)
      li.appendChild(no)
      li.appendChild(body)
      $list.appendChild(li)
    })
  }

  function renderDetail(li) {
    var book = state.books.filter(function (b) {
      return b.id === li.dataset.id
    })[0]
    if (!book) return

    var old = li.querySelector('.detail')
    if (old) {
      old.remove()
      return
    }

    var box = el('div', 'detail')
    var p = el('p', null, '上榜：' + book.boards.join('、'))
    box.appendChild(p)

    var acts = el('div', 'acts')

    var copyBtn = el('button', 'btn primary', '复制书名')
    copyBtn.onclick = function (e) {
      e.stopPropagation()
      copy(book.title)
    }
    acts.appendChild(copyBtn)

    if (book.url) {
      var go = el('a', 'btn', '打开源站')
      go.href = book.url
      go.target = '_blank'
      go.rel = 'noreferrer noopener'
      go.onclick = function (e) {
        e.stopPropagation()
      }
      acts.appendChild(go)
    }

    box.appendChild(acts)
    li.querySelector('.body').appendChild(box)
  }

  // ---------- 事件 ----------

  $chips.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip')
    if (!btn) return
    state.filter = btn.dataset.site
    Array.prototype.forEach.call($chips.children, function (c) {
      c.classList.toggle('on', c === btn)
    })
    renderList()
  })

  $q.addEventListener('input', function () {
    state.keyword = $q.value.trim()
    renderList()
  })

  $list.addEventListener('click', function (e) {
    var li = e.target.closest('.item')
    if (li) renderDetail(li)
  })

  // ---------- 启动 ----------

  function fmtTime(iso) {
    var d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    var p = function (n) {
      return n < 10 ? '0' + n : '' + n
    }
    return (
      d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    )
  }

  for (var i = 0; i < 6; i++) {
    var sk = el('li', 'skeleton')
    $list.appendChild(sk)
  }

  fetch('./rank.json?t=' + Date.now())
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then(function (data) {
      state.books = Array.isArray(data.books) ? data.books : []
      $meta.textContent =
        state.books.length + ' 本 · ' + data.boards.length + ' 个榜单 · 更新于 ' + (fmtTime(data.generatedAt) || '未知')
      renderChips()
      renderList()
    })
    .catch(function (e) {
      $list.textContent = ''
      $empty.hidden = false
      $empty.textContent = '榜单加载失败：' + e.message
      $meta.textContent = '数据未就绪'
    })
})()
