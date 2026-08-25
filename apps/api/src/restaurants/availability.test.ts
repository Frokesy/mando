import assert from 'node:assert/strict'
import test from 'node:test'

import { getRestaurantAvailability } from './availability.js'

const weekdaySchedule = {
  openingTime: '08:00',
  closingTime: '20:00',
  openDays: 'Mon - Sat',
}

test('opens during configured Lagos business hours', () => {
  assert.equal(
    getRestaurantAvailability(weekdaySchedule, new Date('2026-08-24T11:00:00Z')).isOpen,
    true,
  )
})

test('opens at opening time and closes exactly at closing time', () => {
  assert.equal(
    getRestaurantAvailability(weekdaySchedule, new Date('2026-08-24T07:00:00Z')).isOpen,
    true,
  )
  assert.equal(
    getRestaurantAvailability(weekdaySchedule, new Date('2026-08-24T19:00:00Z')).isOpen,
    false,
  )
})

test('closes after hours and on excluded days', () => {
  assert.equal(
    getRestaurantAvailability(weekdaySchedule, new Date('2026-08-24T20:00:00Z')).isOpen,
    false,
  )
  assert.equal(
    getRestaurantAvailability(weekdaySchedule, new Date('2026-08-23T11:00:00Z')).isOpen,
    false,
  )
})

test('supports overnight opening hours', () => {
  const overnightSchedule = {
    openingTime: '18:00',
    closingTime: '02:00',
    openDays: 'Fri - Sat',
  }

  assert.equal(
    getRestaurantAvailability(overnightSchedule, new Date('2026-08-21T22:00:00Z')).isOpen,
    true,
  )
  assert.equal(
    getRestaurantAvailability(overnightSchedule, new Date('2026-08-22T00:30:00Z')).isOpen,
    true,
  )
})

test('keeps restaurants without configured hours available', () => {
  assert.equal(
    getRestaurantAvailability({ openingTime: null, closingTime: null, openDays: null }).isOpen,
    true,
  )
})

test('fails closed for a malformed configured day schedule', () => {
  const availability = getRestaurantAvailability({
    openingTime: '08:00',
    closingTime: '20:00',
    openDays: 'sometimes',
  })

  assert.equal(availability.isOpen, false)
  assert.equal(availability.status, 'Schedule unavailable')
})

test('supports explicit comma-separated opening days', () => {
  const schedule = { openingTime: '08:00', closingTime: '20:00', openDays: 'Mon, Wed, Fri' }
  assert.equal(getRestaurantAvailability(schedule, new Date('2026-08-24T11:00:00Z')).isOpen, true)
  assert.equal(getRestaurantAvailability(schedule, new Date('2026-08-25T11:00:00Z')).isOpen, false)
  assert.equal(getRestaurantAvailability(schedule, new Date('2026-08-26T11:00:00Z')).isOpen, true)
})

test('rejects a schedule containing both valid and invalid day text', () => {
  const availability = getRestaurantAvailability({
    openingTime: '08:00',
    closingTime: '20:00',
    openDays: 'Mon, someday',
  })
  assert.equal(availability.isOpen, false)
  assert.equal(availability.status, 'Schedule unavailable')
})
