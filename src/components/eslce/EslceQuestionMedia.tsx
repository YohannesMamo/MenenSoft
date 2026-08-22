import { API_BASE_URL } from '../../config/api'
import { RichText } from '../../lib/content'
import { FileText, Image as ImageIcon } from 'lucide-react'

interface Passage {
  id: number
  code?: string
  title?: string
  content: string
  exam_year?: number | null
  word_count?: number | null
}

interface QuestionImage {
  id: number
  description?: string
  url: string
}

export interface EslceQuestionMediaData {
  passage?: Passage | null
  images?: QuestionImage[]
}

function resolveImageUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  let origin = ''
  if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
    origin = new URL(API_BASE_URL).origin
  } else {
    origin = window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : window.location.origin
  }
  return `${origin}${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`
}

export default function EslceQuestionMedia({ passage, images }: EslceQuestionMediaData) {
  const imgList = (images || []).filter(img => img.url)
  if (!passage && imgList.length === 0) return null

  return (
    <div className="space-y-4 mb-4">
      {passage && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Reading Passage</span>
            {passage.title && <span className="text-gray-500 dark:text-gray-400 font-normal">· {passage.title}</span>}
            {passage.exam_year && <span className="text-gray-400 dark:text-gray-500 font-normal">· {passage.exam_year}</span>}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <RichText text={passage.content} />
          </div>
        </div>
      )}

      {imgList.length > 0 && (
        <div className="space-y-3">
          {imgList.map(img => (
            <figure key={img.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-center">
              <img
                src={resolveImageUrl(img.url)}
                alt={img.description || 'Question figure'}
                className="max-w-full mx-auto rounded-lg"
                loading="lazy"
              />
              {img.description && (
                <figcaption className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                  <ImageIcon className="w-3 h-3" /> {img.description}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}