import { z } from 'zod'

const isValidMediaValue = (val: string) => {
  if (!val) return false
  if (
    val.startsWith('data:image/') ||
    val.startsWith('data:video/') ||
    val.startsWith('data:audio/')
  ) {
    return true
  }

  try {
    const url = new URL(val)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const mediaTypeEnum = z.enum(['image', 'video', 'audio'])
const categoryEnum = z.enum(['schedule', 'daily'])

export const postSchema = z
  .object({
    title: z.string().min(1).max(100),
    content: z.string().min(1).max(500),
    category: categoryEnum.default('daily'),
    mediaUrl: z
      .string()
      .optional()
      .nullable()
      .refine((val) => val === null || val === undefined || val === '' || isValidMediaValue(val), {
        message: '유효한 미디어 파일을 선택해주세요.',
      })
      .transform((val) => (!val || val === '' ? null : val)),
    mediaType: mediaTypeEnum.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if ((data.mediaUrl && !data.mediaType) || (!data.mediaUrl && data.mediaType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '미디어 파일과 타입을 함께 제공해야 합니다.',
        path: ['mediaType'],
      })
    }
  })

export type MediaType = z.infer<typeof mediaTypeEnum>
export type PostCategory = z.infer<typeof categoryEnum>
