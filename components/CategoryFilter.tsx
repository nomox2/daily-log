'use client'

interface Category {
  id: string
  name: string
  color?: string | null
  _count: {
    posts: number
  }
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategoryId?: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export default function CategoryFilter({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !selectedCategoryId
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        전체
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategoryId === category.id
              ? 'text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          style={
            selectedCategoryId === category.id
              ? { backgroundColor: category.color || '#6366f1' }
              : {}
          }
        >
          {category.name} ({category._count.posts})
        </button>
      ))}
    </div>
  )
}

