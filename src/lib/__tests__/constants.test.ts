import {
  TRIP_GOALS,
  TRIP_STATUSES,
  DESTINATION_STATUSES,
  DESTINATION_STATUS_COLORS,
  FILE_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  ACTIVITY_STATUSES,
} from '@/lib/constants'

describe('Constants', () => {
  describe('TRIP_GOALS', () => {
    it('should contain valid trip goal options', () => {
      expect(TRIP_GOALS).toContain('relaxation')
      expect(TRIP_GOALS).toContain('adventure')
      expect(TRIP_GOALS).toContain('family')
      expect(TRIP_GOALS.length).toBeGreaterThan(4)
    })
  })

  describe('TRIP_STATUSES', () => {
    it('should contain all trip status values', () => {
      expect(TRIP_STATUSES).toContain('planning')
      expect(TRIP_STATUSES).toContain('booked')
      expect(TRIP_STATUSES).toContain('active')
      expect(TRIP_STATUSES).toContain('completed')
    })
  })

  describe('DESTINATION_STATUSES', () => {
    it('should contain destination status values', () => {
      expect(DESTINATION_STATUSES).toContain('proposed')
      expect(DESTINATION_STATUSES).toContain('accepted')
      expect(DESTINATION_STATUSES).toContain('planned')
      expect(DESTINATION_STATUSES).toContain('visited')
    })
  })

  describe('DESTINATION_STATUS_COLORS', () => {
    it('should have color mapping for each status', () => {
      DESTINATION_STATUSES.forEach((status) => {
        expect(DESTINATION_STATUS_COLORS[status]).toBeDefined()
        expect(typeof DESTINATION_STATUS_COLORS[status]).toBe('string')
      })
    })

    it('should provide Tailwind CSS classes', () => {
      const colors = Object.values(DESTINATION_STATUS_COLORS)
      colors.forEach((color) => {
        expect(color).toMatch(/bg-/) // Should contain background color
        expect(color).toMatch(/text-/) // Should contain text color
      })
    })
  })

  describe('FILE_CATEGORIES', () => {
    it('should contain file category options', () => {
      expect(FILE_CATEGORIES).toContain('document')
      expect(FILE_CATEGORIES).toContain('picture')
      expect(FILE_CATEGORIES).toContain('ticket')
      expect(FILE_CATEGORIES.length).toBeGreaterThan(3)
    })
  })

  describe('EXPENSE_CATEGORIES', () => {
    it('should contain expense category options', () => {
      expect(EXPENSE_CATEGORIES).toContain('accommodation')
      expect(EXPENSE_CATEGORIES).toContain('food')
      expect(EXPENSE_CATEGORIES).toContain('transport')
      expect(EXPENSE_CATEGORIES).toContain('activity')
    })
  })

  describe('EXPENSE_CATEGORY_COLORS', () => {
    it('should have color for each expense category', () => {
      EXPENSE_CATEGORIES.forEach((category) => {
        expect(EXPENSE_CATEGORY_COLORS[category]).toBeDefined()
        expect(typeof EXPENSE_CATEGORY_COLORS[category]).toBe('string')
      })
    })
  })

  describe('ACTIVITY_STATUSES', () => {
    it('should contain activity status values', () => {
      if (ACTIVITY_STATUSES) {
        expect(Array.isArray(ACTIVITY_STATUSES)).toBe(true)
        expect(ACTIVITY_STATUSES.length).toBeGreaterThan(0)
      }
    })
  })
})
