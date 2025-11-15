'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Navbar from '@/components/Navbar'

interface User {
  id: string
  nickname: string
  createdAt: string
}

export default function Profile() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        setNickname(data.nickname)
      }
    } catch (error) {
      console.error('프로필 로딩 실패:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const updateData: {
      nickname?: string
      password?: string
    } = {}

    if (nickname && nickname !== user?.nickname) {
      if (nickname.length < 2 || nickname.length > 20) {
        setError('닉네임은 2자 이상 20자 이하여야 합니다.')
        return
      }
      updateData.nickname = nickname
    }

    if (password) {
      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.')
        return
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        return
      }
      updateData.password = password
    }

    if (Object.keys(updateData).length === 0) {
      setError('변경할 정보가 없습니다.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '프로필 업데이트 중 오류가 발생했습니다.')
      } else {
        setSuccess('프로필이 업데이트되었습니다.')
        setPassword('')
        setConfirmPassword('')
        
        // 세션 업데이트 (닉네임이 변경된 경우)
        if (updateData.nickname) {
          await update()
          // 세션을 업데이트했으므로 페이지 새로고침
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      }
    } catch (error) {
      setError('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
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
            프로필 설정
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" style={{ color: 'rgb(239, 68, 68)' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded" style={{ color: 'rgb(34, 197, 94)' }}>
              {success}
            </div>
          )}

          {user && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="nickname"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'rgb(23, 23, 23)' }}
                >
                  닉네임
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  minLength={2}
                  maxLength={20}
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                  style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
                  placeholder="닉네임을 입력하세요 (2-20자)"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'rgb(23, 23, 23)' }}
                >
                  새 비밀번호 (변경하지 않으려면 비워두세요)
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                  style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
                  placeholder="비밀번호를 입력하세요 (최소 6자)"
                />
              </div>

              {password && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'rgb(23, 23, 23)' }}
                  >
                    새 비밀번호 확인
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                    style={{ borderColor: 'rgb(229, 229, 229)', color: 'rgb(23, 23, 23)' }}
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                </div>
              )}

              <div className="pt-4 border-t" style={{ borderColor: 'rgb(229, 229, 229)' }}>
                <p className="text-sm mb-4" style={{ color: 'rgb(102, 102, 102)' }}>
                  가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
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
                    fontWeight: '500'
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
                    fontWeight: '500'
                  }}
                >
                  {loading ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

