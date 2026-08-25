const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const LAGOS_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

type RestaurantSchedule = {
  openingTime: string | null
  closingTime: string | null
  openDays: string | null
}

export function getRestaurantAvailability(
  schedule: RestaurantSchedule,
  now = new Date(),
) {
  if (!schedule.openingTime || !schedule.closingTime) {
    return { isOpen: true, status: 'Open' as const }
  }

  const parts = LAGOS_DATE_TIME_FORMATTER.formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value.toLowerCase().slice(0, 3)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  const currentMinutes = hour * 60 + minute
  const openingMinutes = parseTime(schedule.openingTime)
  const closingMinutes = parseTime(schedule.closingTime)

  if (!weekday || openingMinutes === null || closingMinutes === null) {
    return { isOpen: true, status: 'Open' as const }
  }

  const openDays = parseOpenDays(schedule.openDays)
  if (!openDays) {
    return { isOpen: false, status: 'Schedule unavailable' as const }
  }
  const todayIndex = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number])
  const opensToday = openDays.has(todayIndex)
  const overnight = closingMinutes <= openingMinutes
  const previousDayIndex = (todayIndex + 6) % 7
  const stillOpenFromPreviousDay = overnight
    && openDays.has(previousDayIndex)
    && currentMinutes < closingMinutes
  const withinTodayHours = opensToday && (
    overnight
      ? currentMinutes >= openingMinutes
      : currentMinutes >= openingMinutes && currentMinutes < closingMinutes
  )
  const isOpen = withinTodayHours || stillOpenFromPreviousDay

  return { isOpen, status: isOpen ? 'Open' as const : 'Currently closed' as const }
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function isValidOpenDaysExpression(value: string) {
  return parseOpenDays(value) !== null
}

function parseOpenDays(value: string | null) {
  if (!value?.trim()) return new Set(WEEKDAYS.map((_, index) => index))

  const rawValue = value.toLowerCase().trim().replace(/[–—]/g, '-').replace(/\s+to\s+/g, '-')
  if (['daily', 'every day', 'all days', 'all week'].includes(rawValue)) {
    return new Set(WEEKDAYS.map((_, index) => index))
  }
  if (rawValue === 'weekdays') return new Set([1, 2, 3, 4, 5])
  if (rawValue === 'weekends') return new Set([0, 6])
  const normalized = rawValue.replace(/days?/g, '')
  const selected = new Set<number>()

  for (const segment of normalized.split(',')) {
    const rangeParts = segment.trim().split('-').map((part) => part.trim())
    if (rangeParts.length > 2 || rangeParts.some((part) => !part)) return null
    const [startText, endText] = rangeParts.map((part) => part.slice(0, 3))
    const start = WEEKDAYS.indexOf(startText as (typeof WEEKDAYS)[number])
    if (start < 0) return null
    if (!endText) {
      selected.add(start)
      continue
    }

    const end = WEEKDAYS.indexOf(endText as (typeof WEEKDAYS)[number])
    if (end < 0) return null
    let cursor = start
    for (let count = 0; count < 7; count += 1) {
      selected.add(cursor)
      if (cursor === end) break
      cursor = (cursor + 1) % 7
    }
  }

  return selected.size > 0 ? selected : null
}
