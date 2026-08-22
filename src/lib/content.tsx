import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import 'katex/contrib/mhchem/mhchem'
import { parseContent } from './parse'
import { ChemicalText } from './chemical'

function renderMath(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: true,
    })
  } catch {
    return math
  }
}

export interface RichTextProps {
  text: string
  className?: string
}

export function RichText({ text, className }: RichTextProps) {
  const segments = useMemo(() => parseContent(text), [text])

  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <ChemicalText key={i} text={seg.text} />
        if (seg.type === 'inline-math') {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: renderMath(seg.math, false) }}
            />
          )
        }
        if (seg.type === 'display-math') {
          return (
            <span
              key={i}
              style={{ display: 'block', textAlign: 'center', margin: '4px 0' }}
              dangerouslySetInnerHTML={{ __html: renderMath(seg.math, true) }}
            />
          )
        }
        return null
      })}
    </span>
  )
}
