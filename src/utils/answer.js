import DOMPurify from 'dompurify'

const SECTION_KEYS = { 核心答案: 'core', 深入解析: 'analysis', 常见追问: 'followups', 代码示例: 'code' }

// Only HTML produced by the backend Markdown renderer reaches the HTML sink.
export function sanitizeAnswerHtml(html) {
  return DOMPurify.sanitize(typeof html === 'string' ? html : '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'id'],
  })
}

function parseAnswer(html) {
  return new DOMParser().parseFromString(sanitizeAnswerHtml(html), 'text/html').body
}

export function splitAnswerHtml(html) {
  const parts = { core: '', analysis: '', followups: '', code: '' }
  const root = parseAnswer(html)
  // Wrappers use CSS overflow rather than measuring or rewriting mounted markup.
  root.querySelectorAll('table').forEach(table => {
    const wrapper = document.createElement('div')
    wrapper.className = 'answer-table-wrap'
    wrapper.setAttribute('tabindex', '0')
    wrapper.setAttribute('role', 'region')
    wrapper.setAttribute('aria-label', '答案表格，可横向滚动')
    table.replaceWith(wrapper)
    wrapper.appendChild(table)
  })
  root.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.setAttribute('rel', 'noopener noreferrer')
  })
  let bucket = 'core'
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      const key = SECTION_KEYS[node.textContent.trim()]
      if (key) {
        bucket = key
        continue
      }
    }
    if (node.nodeType === 1) parts[bucket] += node.outerHTML
    else if (node.nodeType === 3 && node.textContent.trim()) {
      const paragraph = document.createElement('p')
      paragraph.textContent = node.textContent
      parts[bucket] += paragraph.outerHTML
    }
  }
  return parts
}

export function htmlToCodeText(html) {
  const root = parseAnswer(html)
  // Prefer whole pre blocks; never include explanatory headings or prose.
  const blocks = Array.from(root.querySelectorAll('pre'))
  const sources = blocks.length ? blocks : Array.from(root.querySelectorAll('code'))
  return sources.map(node => node.textContent || '').join('\n\n')
}

export async function copyCodeText(text) {
  if (!text.trim()) throw new Error('本题没有代码示例')
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Older browsers and insecure origins still support the selection fallback.
    }
  }
  const previousFocus = document.activeElement
  const selection = window.getSelection()
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : []
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('aria-label', '复制代码')
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    if (!document.execCommand('copy')) throw new Error('复制失败，请手动选择复制')
  } finally {
    textarea.remove()
    previousFocus?.focus?.({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      ranges.forEach(range => selection.addRange(range))
    }
  }
}
