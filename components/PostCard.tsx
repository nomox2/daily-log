'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { sharePostToKakao } from '@/lib/kakaoShare'


interface PostCardProps {
  post: {
    id: string
    title: string
    content: string
    date: string     // ← 💚💚 여기에 추가!!!
    imageUrl?: string | null
    mediaUrl?: string | null
    mediaType?: 'image' | 'video' | 'audio' | null
    createdAt: string
    authorId: string
    author: {
      nickname: string
    }
    _count: {
      likes: number
      comments: number
    }
    commentsCount?: number
    likes?: Array<{
      userId: string
    }>
  }
  onLike?: (postId: string) => void
  onDelete?: (postId: string) => void
  liked?: boolean
  onAuthorClick?: (authorId: string, nickname: string) => void
}

export default function PostCard({ post, onLike, liked: initialLiked, onAuthorClick }: PostCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAuthor = session?.user?.id === post.authorId
  const [liked, setLiked] = useState(
    initialLiked || post.likes?.some((like) => like.userId === session?.user?.id) || false
  )
  const [likeCount, setLikeCount] = useState(post._count.likes)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (!session || isLiking) return

    setIsLiking(true)
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)

    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
      })

      if (!response.ok) {
        // 롤백
        setLiked(liked)
        setLikeCount(liked ? likeCount : likeCount - 1)
      } else {
        const data = await response.json()
        setLiked(data.liked)
      }
    } catch (error) {
      // 롤백
      setLiked(liked)
      setLikeCount(liked ? likeCount : likeCount - 1)
    } finally {
      setIsLiking(false)
    }

    if (onLike) {
      onLike(post.id)
    }
  }


  const formattedDate = format(new Date(post.date), 'yyyy.MM.dd')

type ParsedTodo = {
  id: string
  text: string
  completed: boolean
}

const serializeTodos = (todos: ParsedTodo[]) =>
  JSON.stringify(
    todos.map((todo) => ({
      text: todo.text,
      completed: todo.completed,
    }))
  )

const parsedTodos = useMemo<ParsedTodo[]>(() => {
  if (!post.content) return []
  try {
    const asJson = JSON.parse(post.content)
    if (Array.isArray(asJson)) {
      return asJson
        .map((item, index) => {
          if (typeof item === 'string') {
            const text = item.trim()
            if (!text) return null
            return { id: `${index}-${text}`, text, completed: false }
          }
          if (item && typeof item === 'object' && typeof item.text === 'string') {
            const text = item.text.trim()
            if (!text) return null
            const id =
              typeof item.id === 'string' && item.id.trim().length > 0
                ? item.id
                : `${index}-${text}`
            return { id, text, completed: Boolean(item.completed) }
          }
          return null
        })
        .filter((item): item is ParsedTodo => Boolean(item && item.text))
    }
  } catch {
    // fallback to plain text lines
  }
  return post.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `${index}-${text}`, text, completed: false }))
}, [post.content])


  
  const handleCardClick = () => {
    router.push(`/posts/${post.id}`)
  }

  const [todos, setTodos] = useState<ParsedTodo[]>(parsedTodos)
  const [isUpdatingTodos, setIsUpdatingTodos] = useState(false)

  useEffect(() => {
    setTodos(parsedTodos)
  }, [parsedTodos])

  const handleToggleTodo = async (todoId: string) => {
    if (!isAuthor || isUpdatingTodos) return

    const previousTodos = todos
    const targetExists = previousTodos.some((todo) => todo.id === todoId)
    if (!targetExists) return
    const updatedTodos = previousTodos.map((todo) =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    )

    setTodos(updatedTodos)
    const success = await persistTodos(updatedTodos)
    if (!success) {
      setTodos(previousTodos)
    }
  }

  const persistTodos = async (nextTodos: ParsedTodo[]) => {
    setIsUpdatingTodos(true)
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          content: serializeTodos(nextTodos),
          mediaUrl: post.mediaUrl ?? null,
          mediaType: post.mediaType ?? null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update todos')
      }
      return true
    } catch (error) {
      return false
    } finally {
      setIsUpdatingTodos(false)
    }
  }

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/posts/${post.id}`
    const description = `@${post.author.nickname}`
    const kakaoShared = await sharePostToKakao({
      title: post.title,
      description,
      url: shareUrl,
      imageUrl: post.imageUrl,
    })

    if (!kakaoShared) {
      if (navigator.share) {
        try {
          await navigator.share({ title: post.title, url: shareUrl })
          return
        } catch {
          // fall through to clipboard
        }
      }

      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('공유 링크가 복사되었습니다.')
      } catch {
        alert('링크 복사에 실패했습니다. 다시 시도해주세요.')
      }
    }
  }

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
  
      {post.imageUrl && (
        <div className="w-full h-64 overflow-hidden">
          <img
            src={post.imageUrl!}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
  
      <div className="px-6 pt-6 pb-0">
        {/* 약 몇 시간 전 */}
      
  
        {/* 날짜 + 수정 표시 */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>{formattedDate}</span>
          {isAuthor && <span className="font-medium">수정</span>}
        </div>
  
        {/* 제목 */}
        <h3
          className="text-lg font-semibold mb-2 line-clamp-1"
          style={{ color: 'rgb(23, 23, 23)' }}
        >
          {post.title}
        </h3>
  
        {/* To-do 리스트 */}
        {todos.length > 0 && (
          <div className="space-y-2 mb-4 min-h-[84px]">
            {todos.slice(0, 3).map((todo) => (
              <div
                key={`${post.id}-todo-${todo.id}`}
                className="flex items-center gap-2 text-base"
                style={{ color: 'rgb(55, 55, 55)' }}
              >
                <input
                  type="checkbox"
                  className="rounded"
                  checked={todo.completed}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => handleToggleTodo(todo.id)}
                  disabled={!isAuthor || isUpdatingTodos}
                />
                <span className={`line-clamp-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 닉네임 + 좋아요/댓글 (우측 하단) */}
        <div className="py-0 border-t" style={{ borderColor: 'rgb(229, 229, 229)' }}>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-medium text-left hover:text-gray-700 transition-colors"
              style={{ color: 'rgb(102, 102, 102)' }}
              onClick={(e) => {
                e.stopPropagation()
                onAuthorClick?.(post.authorId, post.author.nickname)
              }}
            >
              @{post.author.nickname}
            </button>

            <div className="flex items-center gap-4 text-gray-500">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleLike()
                }}
                disabled={!session || isLiking}
                className={`flex items-center gap-1 transition-colors ${
                  liked ? 'text-red-500' : 'text-gray-500'
                } ${!session ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <img
                  src={liked ? '/icons/icn:like:pressed.svg' : '/icons/like-normal.svg'}
                  alt="좋아요"
                  className="w-4 h-4"
                />
                <span>{likeCount}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                <img src="/icons/reply.svg" alt="댓글" className="w-4 h-4" />
                  <span>{post._count.comments}</span>
                </div>
                <button
                  type="button"
                  aria-label="게시물 공유"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={handleShareClick}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="6.12" y1="6.675" x2="9.881" y2="4.325" />
                    <line x1="6.12" y1="9.325" x2="9.881" y2="11.675" />
                    <circle cx="12" cy="3" r="2.5" />
                    <circle cx="12" cy="13" r="2.5" />
                    <circle cx="4" cy="8" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

