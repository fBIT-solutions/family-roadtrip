import { getUserTripRole, canViewTrip, canEditTrip, canManageTripMembers, canViewTripSchedule, canVoteOnItems } from '@/lib/auth-helpers'
import { Trip } from '@/types/schema'

describe('Auth Helpers', () => {
  const mockTrip: Trip = {
    id: 'trip-1',
    name: 'Summer Roadtrip 2028',
    createdBy: 'creator@example.com',
    people: ['traveler1@example.com', 'traveler2@example.com'],
    viewers: ['viewer@example.com'],
    goal: 'adventure',
    status: 'planning',
    startDate: new Date('2028-06-01'),
    endDate: new Date('2028-06-15'),
    days: 15,
    hasPet: false,
    totalBudget: 5000,
    currency: 'USD',
    description: 'A great summer adventure',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('getUserTripRole', () => {
    it('should return "none" when user email is not provided', () => {
      expect(getUserTripRole(mockTrip, null)).toBe('none')
      expect(getUserTripRole(mockTrip, undefined)).toBe('none')
      expect(getUserTripRole(mockTrip)).toBe('none')
    })

    it('should return "creator" for trip creator', () => {
      expect(getUserTripRole(mockTrip, 'creator@example.com')).toBe('creator')
    })

    it('should return "traveler" for trip members', () => {
      expect(getUserTripRole(mockTrip, 'traveler1@example.com')).toBe('traveler')
      expect(getUserTripRole(mockTrip, 'traveler2@example.com')).toBe('traveler')
    })

    it('should return "viewer" for trip viewers', () => {
      expect(getUserTripRole(mockTrip, 'viewer@example.com')).toBe('viewer')
    })

    it('should return "none" for non-member users', () => {
      expect(getUserTripRole(mockTrip, 'stranger@example.com')).toBe('none')
    })

    it('should be case-sensitive for email matching', () => {
      expect(getUserTripRole(mockTrip, 'Creator@example.com')).toBe('none')
    })
  })

  describe('canViewTrip', () => {
    it('should return true for creator', () => {
      expect(canViewTrip(mockTrip, 'creator@example.com')).toBe(true)
    })

    it('should return true for travelers', () => {
      expect(canViewTrip(mockTrip, 'traveler1@example.com')).toBe(true)
    })

    it('should return true for viewers', () => {
      expect(canViewTrip(mockTrip, 'viewer@example.com')).toBe(true)
    })

    it('should return false for non-members', () => {
      expect(canViewTrip(mockTrip, 'stranger@example.com')).toBe(false)
    })

    it('should return false when no email provided', () => {
      expect(canViewTrip(mockTrip, null)).toBe(false)
      expect(canViewTrip(mockTrip)).toBe(false)
    })
  })

  describe('canEditTrip', () => {
    it('should return true for creator', () => {
      expect(canEditTrip(mockTrip, 'creator@example.com')).toBe(true)
    })

    it('should return true for travelers', () => {
      expect(canEditTrip(mockTrip, 'traveler1@example.com')).toBe(true)
    })

    it('should return false for viewers (read-only)', () => {
      expect(canEditTrip(mockTrip, 'viewer@example.com')).toBe(false)
    })

    it('should return false for non-members', () => {
      expect(canEditTrip(mockTrip, 'stranger@example.com')).toBe(false)
    })

    it('should return false when no email provided', () => {
      expect(canEditTrip(mockTrip, null)).toBe(false)
    })
  })

  describe('canManageTripMembers', () => {
    it('should return true only for creator', () => {
      expect(canManageTripMembers(mockTrip, 'creator@example.com')).toBe(true)
    })

    it('should return false for travelers', () => {
      expect(canManageTripMembers(mockTrip, 'traveler1@example.com')).toBe(false)
    })

    it('should return false for viewers', () => {
      expect(canManageTripMembers(mockTrip, 'viewer@example.com')).toBe(false)
    })

    it('should return false for non-members', () => {
      expect(canManageTripMembers(mockTrip, 'stranger@example.com')).toBe(false)
    })
  })

  describe('canViewTripSchedule', () => {
    it('should return true for creator', () => {
      expect(canViewTripSchedule(mockTrip, 'creator@example.com')).toBe(true)
    })

    it('should return true for travelers', () => {
      expect(canViewTripSchedule(mockTrip, 'traveler1@example.com')).toBe(true)
    })

    it('should return true for viewers', () => {
      expect(canViewTripSchedule(mockTrip, 'viewer@example.com')).toBe(true)
    })

    it('should return false for non-members', () => {
      expect(canViewTripSchedule(mockTrip, 'stranger@example.com')).toBe(false)
    })
  })

  describe('canVoteOnItems', () => {
    it('should return true for creator', () => {
      expect(canVoteOnItems(mockTrip, 'creator@example.com')).toBe(true)
    })

    it('should return true for travelers', () => {
      expect(canVoteOnItems(mockTrip, 'traveler1@example.com')).toBe(true)
    })

    it('should return false for viewers (voting blocked)', () => {
      expect(canVoteOnItems(mockTrip, 'viewer@example.com')).toBe(false)
    })

    it('should return false for non-members', () => {
      expect(canVoteOnItems(mockTrip, 'stranger@example.com')).toBe(false)
    })
  })
})
