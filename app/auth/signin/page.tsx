'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function SignIn() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        nickname,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('닉네임 또는 비밀번호가 올바르지 않습니다.')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(250, 250, 250)' }}>
      <Navbar />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-center mb-6" style={{ color: 'rgb(23, 23, 23)' }}>
            로그인
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" style={{ color: 'rgb(239, 68, 68)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                style={{
                  borderColor: 'rgb(229, 229, 229)',
                  color: 'rgb(23, 23, 23)',
                  paddingLeft: '20px',
                }}
                placeholder="닉네임을 입력하세요"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-black"
                style={{
                  borderColor: 'rgb(229, 229, 229)',
                  color: 'rgb(23, 23, 23)',
                  paddingLeft: '20px',
                }}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderRadius: '6px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'rgb(102, 102, 102)' }}>
              계정이 없으신가요?{' '}
              <Link
                href="/auth/signup"
                className="hover:underline"
                style={{ color: 'rgb(23, 23, 23)' }}
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

