// app/api/categories/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const categories = [
    { id: 1, slug: 'all', name: '전체' },
    { id: 2, slug: 'work', name: '업무' },
    { id: 3, slug: 'life', name: '일상' },
    { id: 4, slug: 'study', name: '공부' },
  ]

  return NextResponse.json(categories)
}