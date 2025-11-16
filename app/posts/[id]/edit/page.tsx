'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import type { MediaType } from '@/lib/validators/post'

interface PostResponse {
  id: string
  title: string
  content: string
  mediaUrl?: string | null
  mediaType?: MediaType | null
  authorId: string
}

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const postId = params?.id
  const { data: session, status } = useSession()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaData, setMediaData] = useState<string | null>(null)
  const [mediaName, setMediaName] = useState('')
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (!postId) return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status !== 'authenticated') return

    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`)
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || '포스트를 불러올 수 없습니다.')
          return
        }
        const data: PostResponse = await response.json()

        if (session?.user?.id && data.authorId !== session.user.id) {
          setError('수정 권한이 없습니다.')
          router.push('/')
          return
        }

        setTitle(data.title)
        setContent(data.content)
        setMediaData(data.mediaUrl || null)
        setMediaType(data.mediaType || null)
        setMediaName(data.mediaUrl ? '기존 미디어' : '')
      } catch (err) {
        console.error(err)
        setError('포스트를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setInitializing(false)
      }
    }

    fetchPost()
  }, [postId, router, session?.user?.id, status])

  const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const typePrefix = file.type.split('/')[0]
    if (!['image', 'video', 'audio'].includes(typePrefix)) {
      setError('이미지, 영상, 음성 파일만 업로드할 수 있습니다.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setMediaData(reader.result as string)
      setMediaName(file.name)
      setMediaType(typePrefix as MediaType)
    }
    reader.readAsDataURL(file)
  }

  const handleMediaRemove = () => {
    setMediaData(null)
    setMediaName('')
    setMediaType(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!postId) return
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          mediaUrl: mediaData,
          mediaType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || '포스트 수정 중 오류가 발생했습니다.'
        const details = data.details ? `\n상세: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}` : ''
        setError(errorMsg + details)
        return
      }

      router.push('/')
    } catch (err) {
      console.error(err)
      setError('포스트 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'rgb(23, 23, 23)' }}></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'rgb(23, 23, 23)' }}>
            포스트 수정
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" style={{ color: 'rgb(239, 68, 68)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                제목
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)', paddingLeft: '20px' }}
                placeholder="제목을 입력해주세요"
              />
            </div>

            <div>
              <label
                htmlFor="mediaUpload"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                미디어 업로드 (선택사항)
              </label>
              <input
                id="mediaUpload"
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleMediaChange}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-black file:text-white"
                style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
              />
              {(mediaData || mediaName) && (
                <div className="mt-3 space-y-2">
                  {mediaName && (
                    <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
                      {mediaName}
                    </p>
                  )}
                  {mediaData && (
                    <div>
                      {mediaType === 'image' && (
                        <img
                          src={mediaData}
                          alt="업로드된 이미지 미리보기"
                          className="w-full max-h-64 object-cover rounded border"
                          style={{ borderColor: 'rgb(229, 229, 229)' }}
                        />
                      )}
                      {mediaType === 'video' && (
                        <video
                          controls
                          src={mediaData}
                          className="w-full rounded border"
                          style={{ borderColor: 'rgb(229, 229, 229)' }}
                        />
                      )}
                      {mediaType === 'audio' && (
                        <audio controls src={mediaData} className="w-full">
                          브라우저가 오디오 재생을 지원하지 않습니다.
                        </audio>
                      )}
                      <button
                        type="button"
                        onClick={handleMediaRemove}
                        className="mt-2 text-sm font-medium hover:opacity-70 transition-opacity"
                        style={{ color: 'rgb(239, 68, 68)' }}
                      >
                        이미지 제거
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                내용
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={12}
                maxLength={500}
                className="w-full px-4 py-2 border rounded resize-none focus:outline-none focus:ring-1 focus:ring-black"
                style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
                placeholder="내용을 입력하세요"
              />
              <p className="mt-1 text-sm text-right" style={{ color: 'rgb(102, 102, 102)' }}>
                {content.length}/500
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-3 px-6 border rounded hover:opacity-70 transition-opacity text-sm font-medium"
                style={{
                  borderColor: 'rgb(23, 23, 23)',
                  color: 'rgb(23, 23, 23)',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-6 rounded text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {loading ? '수정 중...' : '수정하기'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}


