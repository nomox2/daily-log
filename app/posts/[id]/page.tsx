import dynamic from 'next/dynamic'

const PostWorkspace = dynamic(() => import('@/components/PostWorkspace'), { ssr: false })

interface PostDetailPageProps {
  params: {
    id: string
  }
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  return <PostWorkspace mode="view" postId={params.id} />
}

