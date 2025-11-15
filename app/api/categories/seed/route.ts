import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const categories = [
      { name: '관심사', description: '다양한 관심사 기록', color: '#8b5cf6' },
      { name: '소속', description: '소속 단체나 조직 이야기', color: '#3b82f6' },
      { name: '취미', description: '취미 생활 기록', color: '#10b981' },
      { name: '일상', description: '일상의 작은 성취', color: '#f59e0b' },
      { name: '여행', description: '여행 경험 공유', color: '#ec4899' },
      { name: '음식', description: '맛있는 음식 기록', color: '#ef4444' },
      { name: '운동', description: '운동 기록과 성과', color: '#06b6d4' },
      { name: '예술', description: '창작 작품 기록', color: '#f97316' },
      { name: '학습', description: '학습 성과와 지식 공유', color: '#6366f1' },
      { name: '기타', description: '기타 이야기', color: '#64748b' },
    ]

    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      })
    }

    return NextResponse.json({ message: '카테고리가 생성되었습니다.' })
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

