export const getLocalISODate = (value?: string | number | Date) => {
  const baseDate = value ? new Date(value) : new Date()
  const offset = baseDate.getTimezoneOffset()
  const local = new Date(baseDate.getTime() - offset * 60 * 1000)
  return local.toISOString().split('T')[0]
}

export const isSameLocalDate = (value: string | number | Date, targetISODate: string) =>
  getLocalISODate(value) === targetISODate



