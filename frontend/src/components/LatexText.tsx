import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface LatexTextProps {
  text: string
  className?: string
}

function renderLatexToHtml(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
      macros: {
        '\\ce': (context: any) => {
          // Load mhchem extension dynamically
          try {
            const mhchem = require('katex/contrib/mhchem/mhchem')
            return mhchem.ce(context.consumeArgs(1)[0].map((t: any) => t.text).join(''))
          } catch {
            return katex.renderToString(context.consumeArgs(1)[0].map((t: any) => t.text).join(''), { throwOnError: false })
          }
        }
      }
    })
  } catch {
    return `<span class="text-red-500 dark:text-red-400">${tex}</span>`
  }
}

export default function LatexText({ text, className = '' }: LatexTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !text) return

    // Split text into segments: LaTeX vs plain text
    // $$...$$ for display math, $...$ for inline math
    const parts: { type: 'html' | 'text'; content: string }[] = []
    let remaining = text

    // Process $$...$$ first (display math)
    const displayRegex = /\$\$([\s\S]*?)\$\$/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    // First pass: extract display math $$...$$
    const intermediate: { type: 'math-display' | 'text'; content: string; start: number }[] = []
    while ((match = displayRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        intermediate.push({ type: 'text', content: remaining.slice(lastIndex, match.index), start: lastIndex })
      }
      intermediate.push({ type: 'math-display', content: match[1], start: match.index })
      lastIndex = displayRegex.lastIndex
    }
    if (lastIndex < remaining.length) {
      intermediate.push({ type: 'text', content: remaining.slice(lastIndex), start: lastIndex })
    }

    // Second pass: extract inline math $...$ from text segments
    for (const seg of intermediate) {
      if (seg.type === 'math-display') {
        parts.push({ type: 'html', content: renderLatexToHtml(seg.content, true) })
        continue
      }

      const inlineRegex = /(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g
      let inlineLastIndex = 0
      let inlineMatch: RegExpExecArray | null
      while ((inlineMatch = inlineRegex.exec(seg.content)) !== null) {
        if (inlineMatch.index > inlineLastIndex) {
          parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex, inlineMatch.index) })
        }
        parts.push({ type: 'html', content: renderLatexToHtml(inlineMatch[1], false) })
        inlineLastIndex = inlineRegex.lastIndex
      }
      if (inlineLastIndex < seg.content.length) {
        parts.push({ type: 'text', content: seg.content.slice(inlineLastIndex) })
      }
    }

    // Build DOM
    const container = ref.current
    container.innerHTML = ''
    for (const part of parts) {
      if (part.type === 'html') {
        const span = document.createElement('span')
        span.innerHTML = part.content
        container.appendChild(span)
      } else {
        // Split by newlines to preserve <br>
        const lines = part.content.split('\n')
        lines.forEach((line, i) => {
          container.appendChild(document.createTextNode(line))
          if (i < lines.length - 1) {
            container.appendChild(document.createElement('br'))
          }
        })
      }
    }
  }, [text])

  if (!text) return null

  // Quick check: does the text contain any LaTeX?
  const hasLatex = /\$[\s\S]*?\$/.test(text)
  if (!hasLatex) {
    // No LaTeX, render as plain text with line breaks
    return (
      <div ref={ref} className={className}>
        {text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    )
  }

  return <div ref={ref} className={`latex-content ${className}`} />
}
