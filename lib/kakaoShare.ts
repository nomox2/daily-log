'use client'

declare global {
  interface Window {
    Kakao: any
  }
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js'
const DEFAULT_SHARE_IMAGE = 'https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png'

let kakaoScriptPromise: Promise<void> | null = null

const loadKakaoSdk = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Kakao) {
    return Promise.resolve()
  }
  if (kakaoScriptPromise) {
    return kakaoScriptPromise
  }

  kakaoScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = KAKAO_SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Kakao SDK 로딩 실패'))
    document.head.appendChild(script)
  })

  return kakaoScriptPromise
}

interface ShareOptions {
  title: string
  description?: string
  url: string
  imageUrl?: string | null
}

export const sharePostToKakao = async ({ title, description, url, imageUrl }: ShareOptions) => {
  if (typeof window === 'undefined') return false
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!kakaoKey) {
    console.warn('Kakao 공유를 위해 NEXT_PUBLIC_KAKAO_JS_KEY 환경변수가 필요합니다.')
    return false
  }

  try {
    await loadKakaoSdk()
    const { Kakao } = window
    if (!Kakao) return false
    if (!Kakao.isInitialized()) {
      Kakao.init(kakaoKey)
    }

    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description: description || '',
        imageUrl: imageUrl || DEFAULT_SHARE_IMAGE,
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
      buttons: [
        {
          title: '자세히 보기',
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
      ],
    })
    return true
  } catch (error) {
    console.error('Kakao 공유 실패:', error)
    return false
  }
}

