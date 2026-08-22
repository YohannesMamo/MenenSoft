export type Segment =
  | { type: 'text'; text: string }
  | { type: 'inline-math'; math: string }
  | { type: 'display-math'; math: string }

const TOKEN_RE = /(\$\$[^$]+\$\$|\$[^$]+\$)/g

export function parseContent(text: string): Segment[] {
  const segments: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', text: text.slice(last, m.index) })
    }
    const tok = m[0]
    if (tok.startsWith('$$')) {
      segments.push({ type: 'display-math', math: tok.slice(2, -2) })
    } else {
      segments.push({ type: 'inline-math', math: tok.slice(1, -1) })
    }
    last = m.index + tok.length
  }
  if (last < text.length) {
    segments.push({ type: 'text', text: text.slice(last) })
  }
  return segments
}
