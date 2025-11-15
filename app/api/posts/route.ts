import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { postSchema } from '@/lib/validators/post'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '16')
    const authorId = searchParams.get('authorId')
    const category = searchParams.get('category')

    const where =
      authorId || category
        ? {
            ...(authorId ? { authorId } : {}),
            ...(category ? { category } : {}),
          }
        : undefined

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              nickname: true,
            },
          },
          likes: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({
        where,
      }),
    ])

    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, mediaUrl, mediaType, category } = postSchema.parse(body)

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: session.user.id,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        category,
      },
      include: {
        author: {
          select: {
            nickname: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력 정보를 확인해주세요.', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

