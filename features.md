# High-Impact Features:
1. Expense Tracking & Budget

- [x] Track trip costs (flights, hotels, food, activities)
- [x] Split expenses among family members
- [x] Budget vs actual spending dashboard

2. Activity/Things to Do

- [x] Add activities to each destination
- [x] Link to Google Maps, TripAdvisor, etc.
- [x] Voting on which activities to do (like your destination voting)

3. Accommodation Search Integration

- [ ] Search Airbnb/Hotels for each destination
- [ ] Store bookings with confirmation details
- [ ] Price comparison

4. Itinerary/Day-by-Day Schedule

- [ ] Timeline view of each day's activities
- [ ] Drag-and-drop to rearrange
- [ ] Time estimates for travel between destinations

5. Distance & Travel Time Calculator

- [ ] Show driving/flight distance between destinations
- [ ] Estimate travel time
- [ ] Suggest travel mode (flight, drive, train, etc.)

# Engagement Features:
6. Photo Gallery & Sharing

- [ ] Upload photos per destination
- [ ] Family members can add photos
- [ ] Create albums

7. Weather Forecast

- [ ] Show expected weather for trip dates
- [ ] Packing suggestions based on weather

8. Real-Time Collaboration

- [ ] See what family members are editing
- [ ] Notifications when others add destinations/activities

9. AI Recommendations

- [x] Suggest destinations based on interests
- [x] Recommend activities for selected destinations

# Practical Helpers:
10. Travel Documents Checklist

- [ ] Passport expiry tracker
- [ ] Visa requirements by country
- [ ] Document upload (tickets, visas, etc.)
  
11.  Packing Checklist

- [ ] Create lists per person
- [ ] Check items off as packed

12.  Currency & Cost Converter

- [ ] Show costs in local currency
- [ ] Exchange rate tracking

13.  Reminders/Alerts

- [ ] Deadline for bookings
- [ ] Payment reminders
- [ ] Pre-trip notifications

14.  Mobile App

- [ ] Companion mobile app for easy updates on the go

Quick Wins (Easiest to Implement):

- [ ] Distance calculator between destinations
- [ ] Weather widget for trip dates
- [ ] Expense tracker (simple version)
- [ ] Packing checklist
- [ ] Activity suggestions per destination

# User Preferences & Feedback (NEW - COMPLETE):

## Implemented:
- [x] User profile with interests and dislikes preferences
- [x] Dislike/feedback system for recommendations (mark items as "not interested")
- [x] AI prompts updated to exclude disliked items and categories
- [x] User preferences API endpoints (GET/POST)
- [x] Recommendation dislike tracking API (POST/GET/DELETE)
- [x] Profile preferences UI component
- [x] Dislike button component for recommendation cards
- [x] Add dislike buttons to activity recommendation cards
- [x] Add dislike buttons to destination recommendation cards
- [x] Create user profile page (/pages/preferences/index.tsx)
- [x] Create dislike management page (/pages/preferences/dislikes.tsx)
- [x] Allow users to review and manage their past dislikes
- [x] Preferences link added to destinations & activities pages