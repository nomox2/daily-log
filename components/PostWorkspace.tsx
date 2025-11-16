'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { sharePostToKakao } from '@/lib/kakaoShare'

type WorkspaceMode = 'view' | 'create'

interface Comment {
  id: string
  content: string
  createdAt: string
  authorId: string
  parentId?: string | null
  author: {
    nickname: string
  }
  replies?: Comment[]
}

interface PostDetail {
  id: string
  title: string
  content: string
  mediaUrl?: string | null
  mediaType?: 'image' | 'video' | 'audio' | null
  category?: 'schedule' | 'daily'
  date?: string
  authorId: string
  createdAt: string
  author: {
    nickname: string
  }
  likes?: Array<{
    userId: string
  }>
  _count: {
    likes: number
    comments: number
  }
}

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface PostWorkspaceProps {
  mode: WorkspaceMode
  postId?: string
}

const TAB_OPTIONS = [
  {
    value: 'schedule',
    label: '주요일정',
    placeholder: '주요 일정을 입력하세요',
  },
  {
    value: 'todo',
    label: '오늘의 할일',
    placeholder: '오늘의 할 일을 입력하세요',
  },
] as const

type TabValue = (typeof TAB_OPTIONS)[number]['value']

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const parseTodosFromContent = (content?: string | null): TodoItem[] => {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index) => {
          if (typeof item === 'string') {
            const text = item.trim()
            if (!text) return null
            return {
              id: generateId(),
              text,
              completed: false,
            }
          }
          if (item && typeof item === 'object') {
            const text = (item.text ?? '').toString().trim()
            if (!text) return null
            return {
              id: item.id ?? `${index}-${text}`,
              text,
              completed: Boolean(item.completed),
            }
          }
          return null
        })
        .filter((item): item is TodoItem => Boolean(item && item.text))
    }
  } catch {
    // fallback handled below
  }

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      id: generateId(),
      text: line,
      completed: false,
    }))
}

const serializeTodos = (todos: TodoItem[]) =>
  JSON.stringify(
    todos.map((todo) => ({
      text: todo.text,
      completed: todo.completed,
    }))
  )

const buildEmptyPost = (nickname?: string, userId?: string): PostDetail => ({
  id: 'new',
  title: '',
  content: '[]',
  category: 'daily',
  authorId: userId ?? '',
  createdAt: new Date().toISOString(),
  author: {
    nickname: nickname || '나',
  },
  mediaUrl: null,
  mediaType: null,
  _count: {
    likes: 0,
    comments: 0,
  },
})

export default function PostWorkspace({ mode, postId }: PostWorkspaceProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [post, setPost] = useState<PostDetail | null>(mode === 'create' ? buildEmptyPost() : null)
  const [titleInput, setTitleInput] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(mode === 'view')
  const [commentsLoading, setCommentsLoading] = useState(mode === 'view')
  const [commentInput, setCommentInput] = useState('')
  const [replyParentId, setReplyParentId] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoInput, setTodoInput] = useState('')
  const [todoSaving, setTodoSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>('schedule')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const activeTabMeta = TAB_OPTIONS.find((tab) => tab.value === activeTab) ?? TAB_OPTIONS[0]

  useEffect(() => {
    if (mode === 'create') {
      setTitleInput('')
    }
  }, [activeTab, activeTabMeta.label, mode])

  const isAuthor = useMemo(() => {
    if (mode === 'create') {
      return Boolean(session?.user)
    }
    if (!session?.user || !post) return false
    return session.user.id === post.authorId
  }, [mode, session?.user, post])

  useEffect(() => {
    if (mode !== 'view' || !postId) return
    const fetchPost = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/posts/${postId}`)
        if (!response.ok) {
          router.push('/')
          return
        }
        const data: PostDetail = await response.json()
        setPost(data)
        setTodos(parseTodosFromContent(data.content))
        setTitleInput(data.title)
        setLikeCount(data._count.likes)
        // initialize schedule date/time when viewing a schedule post
        if (data.category === 'schedule' && data.date) {
          const d = new Date(data.date)
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          setScheduleDate(d.toISOString().slice(0, 10))
          setScheduleTime(`${hh}:${mm}`)
        }
        if (session?.user?.id) {
          setLiked(data.likes?.some((like) => like.userId === session.user.id) ?? false)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [mode, postId, router, session?.user?.id])

  const fetchComments = async () => {
    if (mode !== 'view' || !postId) return
    setCommentsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      if (response.ok) {
        const data: Comment[] = await response.json()
        setComments(data)
      }
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'view' && postId) {
      fetchComments()
    }
  }, [mode, postId])

  useEffect(() => {
    if (mode !== 'create') return
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated' && session?.user) {
      setPost((prev) =>
        prev && prev.id === 'new'
          ? {
              ...prev,
              authorId: session.user.id,
              author: { nickname: session.user.nickname ?? '나' },
            }
          : buildEmptyPost(session.user.nickname ?? '나', session.user.id)
      )
      setLoading(false)
    }
  }, [mode, status, session?.user, router])

  const handleLike = async () => {
    if (mode === 'create' || !session || isLiking || !postId) return
    setIsLiking(true)
    setLiked((prev) => !prev)
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      })
      if (!response.ok) {
        setLiked((prev) => !prev)
        setLikeCount((prev) => (liked ? prev + 1 : prev - 1))
      } else {
        const data = await response.json()
        setLiked(data.liked)
        setLikeCount(data.likeCount ?? (data.liked ? likeCount + 1 : likeCount - 1))
      }
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (mode !== 'view' || !post || !session || session.user.id !== post.authorId) return
    if (!window.confirm('정말 삭제하시겠어요?')) return
    const response = await fetch(`/api/posts/${post.id}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      router.push('/')
    } else {
      const data = await response.json()
      alert(data.error || '삭제 중 오류가 발생했습니다.')
    }
  }

  const submitComment = async (content: string, parentId?: string | null) => {
    if (mode !== 'view') return
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    if (!content.trim() || !postId) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          parentId: parentId || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || '댓글 작성 중 오류가 발생했습니다.')
        return
      }

      setCommentInput('')
      setReplyInput('')
      setReplyParentId(null)
      fetchComments()
      setPost((prev) =>
        prev
          ? {
              ...prev,
              _count: {
                ...prev._count,
                comments: prev._count.comments + 1,
              },
            }
          : prev
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitComment = () => submitComment(commentInput)
  const handleSubmitReply = () => {
    if (!replyParentId) return
    submitComment(replyInput, replyParentId)
  }

  const persistTodos = async (nextTodos: TodoItem[]) => {
    if (mode === 'create' || !post) return true
    setTodoSaving(true)
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: titleInput || post.title,
          content: serializeTodos(nextTodos),
          mediaUrl: post.mediaUrl ?? null,
          mediaType: post.mediaType ?? null,
        }),
      })

      if (!response.ok) {
        throw new Error('To-do 저장 실패')
      }
      const updatedPost: PostDetail = await response.json()
      setPost(updatedPost)
      setTodos(parseTodosFromContent(updatedPost.content))
      return true
    } catch (error) {
      console.error(error)
      alert('To-do 저장 중 오류가 발생했습니다.')
      return false
    } finally {
      setTodoSaving(false)
    }
  }

  const updateTodos = async (nextTodos: TodoItem[]) => {
    if (mode === 'create') {
      setTodos(nextTodos)
      return true
    }
    const previous = todos
    setTodos(nextTodos)
    const success = await persistTodos(nextTodos)
    if (!success) {
      setTodos(previous)
    }
    return success
  }

  const addTodoItem = async () => {
    if (!todoInput.trim()) return
    const newTodo: TodoItem = {
      id: generateId(),
      text: todoInput.trim(),
      completed: false,
    }
    setTodoInput('')
    await updateTodos([...todos, newTodo])
  }

  const toggleTodo = (id: string) => {
    if (!isAuthor) return
    const nextTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    updateTodos(nextTodos)
  }

  const removeTodo = (id: string) => {
    if (!isAuthor) return
    const nextTodos = todos.filter((todo) => todo.id !== id)
    updateTodos(nextTodos)
  }

  const handleCreatePost = async () => {
    if (mode !== 'create') return
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }
    if (!titleInput.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    setCreating(true)
    try {
      const category = activeTab === 'schedule' ? 'schedule' : 'daily'
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: titleInput.trim(),
          content: serializeTodos(todos),
          category,
          mediaUrl: null,
          mediaType: null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || '포스트 작성 중 오류가 발생했습니다.')
        return
      }

      router.push('/')
    } catch (error) {
      console.error('Request error:', error)
      alert('포스트 작성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (mode !== 'view') return
    if (!session?.user) {
      alert('로그인이 필요합니다.')
      return
    }
    if (!window.confirm('댓글을 삭제할까요?')) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || '댓글 삭제 중 오류가 발생했습니다.')
        return
      }
      await fetchComments()
      setPost((prev) =>
        prev
          ? {
              ...prev,
              _count: {
                ...prev._count,
                comments: Math.max(prev._count.comments - 1, 0),
              },
            }
          : prev
      )
    } catch (error) {
      console.error('delete comment error', error)
      alert('댓글 삭제 중 오류가 발생했습니다.')
    }
  }

  const canDeleteComment = (authorId: string) => {
    if (!session?.user?.id) return false
    if (session.user.id === authorId) return true
    if (mode === 'view' && post && session.user.id === post.authorId) return true
    return false
  }

  const handleShareClick = async () => {
    if (mode === 'create' || !post) return
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/posts/${post.id}`
    const description = `@${post.author.nickname}`
    const shared = await sharePostToKakao({
      title: post.title,
      description,
      url: shareUrl,
      imageUrl: post.mediaUrl,
    })

    if (!shared) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: post.title,
            url: shareUrl,
          })
          return
        } catch {
          // continue to clipboard fallback
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

  const renderComments = () => {
    if (mode === 'create') {
      return <p className="text-sm text-gray-400">게시물을 작성한 후 댓글을 사용할 수 있어요.</p>
    }
    if (commentsLoading) {
      return <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>댓글을 불러오는 중...</p>
    }

    if (comments.length === 0) {
      return <p className="text-sm" style={{ color: 'rgb(150, 150, 150)' }}>아직 댓글이 없습니다.</p>
    }

    const formatTime = (date: string) =>
      formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ko,
      })

    return comments.map((comment) => (
      <div key={comment.id} className="border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'rgb(23, 23, 23)' }}>
            @{comment.author.nickname}
          </span>
          <span className="text-xs" style={{ color: 'rgb(150, 150, 150)' }}>
            {formatTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'rgb(55, 55, 55)' }}>
          {comment.content}
        </p>
        <div className="mt-2 text-xs flex gap-3">
          <button
            onClick={() => {
              setReplyParentId(comment.id)
              setReplyInput('')
            }}
            className="hover:underline"
            style={{ color: 'rgb(102, 102, 102)' }}
          >
            답글 달기
          </button>
          {canDeleteComment(comment.authorId) && (
            <button
              onClick={() => handleDeleteComment(comment.id)}
              className="hover:underline"
              style={{ color: 'rgb(150, 150, 150)' }}
            >
              삭제
            </button>
          )}
        </div>

        {replyParentId === comment.id && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black text-sm"
              style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
              placeholder="답글을 입력하세요"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitReply}
                disabled={submitting}
                className="px-4 py-2 rounded text-xs font-medium text-white bg-black hover:opacity-80 disabled:opacity-50"
                style={{ fontSize: '14px' }}
              >
                등록
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyParentId(null)
                  setReplyInput('')
                }}
                className="px-4 py-2 rounded text-xs font-medium border"
                style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(102, 102, 102)' }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {comment.replies?.length ? (
          <div className="mt-4 pl-4 border-l border-gray-100 space-y-3">
            {comment.replies.map((reply) => (
              <div key={reply.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'rgb(23, 23, 23)' }}>
                    @{reply.author.nickname}
                  </span>
                  <span className="text-xs" style={{ color: 'rgb(150, 150, 150)' }}>
                    {formatTime(reply.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'rgb(55, 55, 55)' }}>
                  {reply.content}
                </p>
                {canDeleteComment(reply.authorId) && (
                  <div className="mt-1 text-xs">
                    <button
                      onClick={() => handleDeleteComment(reply.id)}
                      className="hover:underline"
                      style={{ color: 'rgb(150, 150, 150)' }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ))
  }

  if (mode === 'create' && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'rgb(23, 23, 23)' }}></div>
      </div>
    )
  }

  if (loading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'rgb(23, 23, 23)' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm hover:underline"
          style={{ color: 'rgb(102, 102, 102)' }}
        >
          ← 돌아가기
        </button>
 

        {mode === 'create' && (
          <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center gap-2">
            {TAB_OPTIONS.map((tab) => {
              const isActive = tab.value === activeTab
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 py-3 rounded-md font-semibold transition-all ${
                    isActive ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                  style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '16px' }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 제목 입력: 생성 모드이거나, 뷰 모드 + 스케줄 카드에서만 별도 섹션으로 노출 */}
        {(mode === 'create' || (mode === 'view' && post?.category === 'schedule')) && (
          <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-3 relative">
            {mode === 'view' && isAuthor && (
              <span
                onClick={handleDelete}
                className="absolute right-6 top-6 text-sm font-medium cursor-pointer hover:underline"
                style={{ color: 'rgb(23, 23, 23)' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDelete()
                  }
                }}
              >
                삭제
              </span>
            )}
            <label
              htmlFor="postTitle"
              className="font-semibold"
              style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '16px', color: 'rgb(23, 23, 23)' }}
            >
              제목
            </label>
            <input
              id="postTitle"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="제목을 입력해주세요"
              className="w-full px-4 py-2 border rounded text-base focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400"
              style={{ borderColor: 'rgb(229, 229, 229)', padding: '0 20px 0 20px', fontSize: '16px', color: 'rgb(23, 23, 23)', fontFamily: 'Pretendard, sans-serif' }}
              disabled={mode === 'view' && !isAuthor}
              maxLength={100}
            />
          </section>
        )}

        {(mode === 'create' && activeTab === 'schedule') ||
        (mode === 'view' && post?.category === 'schedule') ? (
          <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="font-semibold" style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '16px', color: 'rgb(23, 23, 23)' }}>
                일정 시간 선택
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">날짜</span>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
                    style={{ borderColor: 'rgb(229, 229, 229)', paddingLeft: '20px', paddingRight: '20px' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">시간</span>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
                    style={{ borderColor: 'rgb(229, 229, 229)', paddingLeft: '20px', paddingRight: '20px' }}
                  />
                </div>
              </div>
            </div>
            {(scheduleDate || scheduleTime) && (
              <p className="text-sm text-gray-600">
                선택된 일정: {scheduleDate || '날짜 미선택'} {scheduleTime || ''}
              </p>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-[10px]">
                <input
                  type="text"
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  placeholder="일정을 입력하세요"
                  className="flex-1 border rounded text-base focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400"
                  style={{ borderColor: 'rgb(229, 229, 229)', paddingLeft: '20px', fontSize: '16px', fontFamily: 'Pretendard, sans-serif' }}
                  disabled={!isAuthor}
                />
                <button
                  onClick={addTodoItem}
                  disabled={!isAuthor || !todoInput.trim()}
                  className="w-[80px] px-4 py-2 text-sm font-medium text-white bg-black rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  추가
                </button>
              </div>

              <div className="space-y-2">
                {todos.length === 0 ? (
                  <p className="text-sm text-gray-400">등록된 일정이 없습니다.</p>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between border rounded"
                      style={{ borderColor: 'rgb(229, 229, 229)', padding: '0 20px 0 20px', minHeight: '52px' }}
                    >
                      <span className="text-base" style={{ color: 'rgb(55, 55, 55)' }}>
                        {todo.text}
                      </span>
                      {isAuthor && (
                        <button
                          onClick={() => removeTodo(todo.id)}
                          className="text-sm text-gray-400 hover:text-gray-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {mode !== 'create' && post?.category !== 'schedule' && (
          <article className="bg-white border border-gray-200 rounded-lg px-6 pt-6 pb-0 relative">
            {isAuthor && (
              <span
                onClick={handleDelete}
                className="absolute right-6 top-6 text-sm font-medium cursor-pointer hover:underline"
                style={{ color: 'rgb(23, 23, 23)' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDelete()
                  }
                }}
              >
                삭제
              </span>
            )}
            <div className="space-y-3 pb-2">
              <label
                htmlFor="postTitleInline"
                className="block text-sm font-medium"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                제목
              </label>
              <input
                id="postTitleInline"
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                disabled={!isAuthor}
                placeholder="제목을 입력해주세요"
                className="w-full px-4 py-2 border rounded text-base focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400"
                style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)', paddingLeft: '20px', paddingRight: '20px', fontSize: '16px', fontFamily: 'Pretendard, sans-serif' }}
                maxLength={100}
              />

              {/* divider removed */}
            </div>

            <div className="flex items-center justify-end pt-2">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleLike}
                  disabled={!session || isLiking}
                  className={`flex items-center gap-2 transition-colors ${
                    liked ? 'text-red-500' : 'text-gray-500'
                  } ${!session ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <img
                    src={liked ? '/icons/icn:like:pressed.svg' : '/icons/like-normal.svg'}
                    alt="좋아요"
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">{likeCount}</span>
                </button>
                <div className="flex items-center gap-1 text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
                  <img src="/icons/reply.svg" alt="댓글" className="w-4 h-4" />
                  <span className="font-medium">{post._count.comments}</span>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={handleShareClick}
                >
                  <img src="/icons/share.svg" alt="공유하기" className="w-4 h-4" />
                  <span>공유하기</span>
                </button>
              </div>
            </div>
          </article>
        )}

        {!(mode === 'create' && activeTab === 'schedule') && !(mode === 'view' && post?.category === 'schedule') && (
          <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(23, 23, 23)' }}>
                To-do 리스트
              </h2>
              <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
                해야 할 일을 정리해 보세요.
              </p>
            </div>

            <div className="flex items-center gap-[10px]">
              <input
                type="text"
                value={todoInput}
                onChange={(e) => setTodoInput(e.target.value)}
                placeholder="할 일을 입력하세요"
                className="flex-1 border rounded text-base focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400"
                style={{ borderColor: 'rgb(229, 229, 229)', paddingLeft: '20px', fontSize: '16px', fontFamily: 'Pretendard, sans-serif' }}
                disabled={!isAuthor}
              />
              <button
                onClick={addTodoItem}
                disabled={!isAuthor || !todoInput.trim()}
                className="w-[80px] px-4 py-2 text-sm font-medium text-white bg-black rounded hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                추가
              </button>
            </div>

            <div className="space-y-2">
              {todos.length === 0 ? (
                <p className="text-sm text-gray-400">등록된 To-do가 없습니다.</p>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between border rounded"
                    style={{ borderColor: 'rgb(229, 229, 229)', padding: '0 20px 0 20px', minHeight: '52px' }}
                  >
                    <label className="flex items-center gap-2 text-base" style={{ color: 'rgb(55, 55, 55)' }}>
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="rounded"
                        disabled={!isAuthor}
                      />
                      <span className={todo.completed ? 'line-through text-gray-400' : ''}>{todo.text}</span>
                    </label>
                    {isAuthor && (
                      <button
                        onClick={() => removeTodo(todo.id)}
                        className="text-sm text-gray-400 hover:text-gray-600"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(23, 23, 23)' }}>
            댓글
          </h2>
          {mode === 'view' ? (
            <div className="space-y-3">
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 border rounded resize-none focus:outline-none focus:ring-1 focus:ring-black text-base placeholder:text-gray-400"
                style={{
                  borderColor: 'rgb(229, 229, 229)',
                  color: 'rgb(23, 23, 23)',
                  fontSize: '16px',
                  fontFamily: 'Pretendard, sans-serif',
                  paddingTop: '16px',
                  paddingBottom: '16px',
                }}
                placeholder="댓글을 입력하세요"
                disabled={!session}
              />
              <div className="flex justify-between items-center text-xs" style={{ color: 'rgb(150, 150, 150)' }}>
                <span>{commentInput.length}/500</span>
                <button
                  onClick={handleSubmitComment}
                  disabled={submitting || !session || !commentInput.trim()}
                  className="px-4 py-2 rounded text-xs font-medium text-white bg-black hover:opacity-90 disabled:opacity-40"
                  style={{ width: '88px', fontSize: '14px' }}
                >
                  등록
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">게시물을 작성하면 댓글을 받을 수 있어요.</p>
          )}
          <div className="pt-4 border-t" style={{ borderColor: 'rgb(229, 229, 229)' }}>
            {renderComments()}
          </div>
        </section>

        {mode === 'view' && isAuthor && (
          <div className="pb-12">
            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full py-3 px-6 border rounded hover:opacity-70 transition-opacity text-sm font-medium"
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
                type="button"
                onClick={async () => {
                  const success = await updateTodos(todos)
                  if (success) {
                    alert('저장되었습니다.')
                    router.push('/')
                  }
                }}
                className="w-full py-3 px-6 rounded text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                disabled={todoSaving}
              >
                저장
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="pb-12">
            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full py-3 px-6 border rounded hover:opacity-70 transition-opacity text-sm font-medium"
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
                type="button"
                onClick={handleCreatePost}
                className="w-full py-3 px-6 rounded text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                disabled={creating}
              >
                {creating ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

