'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-semibold" style={{ color: 'rgb(23, 23, 23)' }}>
              Daily-Log
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div
                  className="flex items-center gap-3 border border-gray-200"
                  style={{ borderRadius: '50px', padding: '12px 24px', height: '48px' }}
                >
                  <Link
                    href="/profile"
                    className="text-sm font-medium hover:opacity-70 transition-opacity"
                    style={{ color: 'rgb(23, 23, 23)' }}
                  >
                    @{session.user.nickname}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-xs font-medium hover:opacity-70 transition-opacity"
                    style={{ color: 'rgb(102, 102, 102)' }}
                  >
                    로그아웃
                  </button>
                </div>
                <Link
                  href="/posts/new"
                  className="rounded-button px-6 py-3 text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity"
                  style={{ borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '500' }}
                >
                  글쓰기
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: 'rgb(102, 102, 102)' }}
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-button px-6 py-3 text-sm font-medium text-white bg-black hover:opacity-90 transition-opacity"
                  style={{ borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '500' }}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

