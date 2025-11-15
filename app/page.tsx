'use client'

import { useEffect, useState } from 'react'
import PostCard from '@/components/PostCard'
import Navbar from '@/components/Navbar'

interface Post {
  id: string
  title: string
  content: string
  date: string
  imageUrl?: string | null
  mediaUrl?: string | null
  mediaType?: 'image' | 'video' | 'audio' | null
  createdAt: string
  category: 'schedule' | 'daily'
  authorId: string
  author: {
    nickname: string
  }
  _count: {
    likes: number
    comments: number
  }
  likes: Array<{
    userId: string
  }>
}

const titleStyle = {
  fontFamily: 'Pretendard, sans-serif',
  fontSize: '16px',
  fontWeight: 600,
  color: 'rgb(23, 23, 23)',
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null)
  const [selectedAuthorNickname, setSelectedAuthorNickname] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '16',
        })

        if (selectedAuthorId) {
          params.append('authorId', selectedAuthorId)
        }

        const response = await fetch(`/api/posts?${params}`)
        if (response.ok) {
          const data = await response.json()
          if (page === 1) {
            setPosts(data.posts)
          } else {
            setPosts((prev) => [...prev, ...data.posts])
          }
          setHasMore(data.posts.length === 16)
        }
      } catch (error) {
        console.error('포스트 로딩 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [page, selectedAuthorId])

  const handleAuthorFilter = (authorId: string | null, nickname: string | null) => {
    setPosts([])
    setHasMore(true)
    setSelectedAuthorId(authorId)
    setSelectedAuthorNickname(nickname)
    setPage(1)
  }

  const clearAuthorFilter = () => {
    setPosts([])
    setHasMore(true)
    setSelectedAuthorId(null)
    setSelectedAuthorNickname(null)
    setPage(1)
  }

  const loadMore = () => {
    setPage((prev) => prev + 1)
  }

  const schedulePosts = posts.filter((post) => post.category === 'schedule')
  const dailyPosts = posts.filter((post) => post.category === 'daily')
  const isInitialLoading = loading && posts.length === 0
  const isEmpty = !loading && posts.length === 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isInitialLoading && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: 'rgb(23, 23, 23)' }}
            ></div>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p style={{ color: 'rgb(102, 102, 102)' }}>아직 작성된 포스트가 없습니다.</p>
          </div>
        )}

        {selectedAuthorId && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm" style={{ color: 'rgb(55, 55, 55)' }}>
              @{selectedAuthorNickname}님의 카드만 보고 있어요.
            </p>
            <button
              onClick={clearAuthorFilter}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              전체 보기
            </button>
          </div>
        )}

        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="space-y-1">
            <h3 style={titleStyle}>주요일정 카드</h3>
            <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
              가족 일정, 병원 예약 등 오늘의 핵심 일정 카드를 모아봤어요.
            </p>
          </div>
          {schedulePosts.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgb(150, 150, 150)' }}>
              아직 등록된 주요일정 카드가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-[30px] items-start">
              {schedulePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={(postId) =>
                    setPosts((prev) => prev.filter((item) => item.id !== postId))
                  }
                  onAuthorClick={handleAuthorFilter}
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="space-y-1">
            <h3 style={titleStyle}>오늘의 할일 카드</h3>
            <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
              오늘 해야 할 일들을 카드 단위로 정리한 리스트예요.
            </p>
          </div>
          {dailyPosts.length === 0 ? (
            <p className="text-sm" style={{ color: 'rgb(150, 150, 150)' }}>
              아직 등록된 오늘의 할일 카드가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-[30px] items-start">
              {dailyPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={(postId) =>
                    setPosts((prev) => prev.filter((item) => item.id !== postId))
                  }
                  onAuthorClick={handleAuthorFilter}
                />
              ))}
            </div>
          )}
        </section>

        {hasMore && posts.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-button text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
