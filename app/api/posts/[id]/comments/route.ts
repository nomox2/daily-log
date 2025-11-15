import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { commentSchema } from '@/lib/validators/comment'

const includeCommentRelations = {
  author: {
    select: {
      nickname: true,
    },
  },
  replies: {
    include: {
      author: {
        select: {
          nickname: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId: params.id,
        parentId: null,
      },
      include: includeCommentRelations,
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    return NextResponse.json(
      { error: '댓글을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, parentId } = commentSchema.parse(body)

    let parentComment = null
    if (parentId) {
      parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      })

      if (!parentComment || parentComment.postId !== params.id) {
        return NextResponse.json(
          { error: '잘못된 부모 댓글입니다.' },
          { status: 400 }
        )
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        authorId: session.user.id,
        postId: params.id,
        parentId: parentId || null,
      },
      include: includeCommentRelations,
    })

    return NextResponse.json(newComment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '댓글 내용을 확인해주세요.', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '댓글 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}




