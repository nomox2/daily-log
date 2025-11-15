import dynamic from 'next/dynamic'

const PostWorkspace = dynamic(() => import('@/components/PostWorkspace'), { ssr: false })

export default function NewPostPage() {
  return <PostWorkspace mode="create" />
}

