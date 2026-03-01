
Database container: item-permissions

1. User creates a trip
```json
{
    "id": "uuid",
    "itemId": {item-uuid},
    "itemType": "trip",
    "userId": {userId},
    "role": "owner",
    "createdAt": "2024-06-01", 
    "updatedAt": "2024-06-01"
}
```

  - Trip has travelers
    For each traveler

    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "trip",
        "userId": {travelerId},
        "role": "contributor",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```

  - Trip has guests
    For each guest

    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "trip",
        "userId": {guestId},
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```

2. User creates a destination

```json
{
    "id": "uuid",
    "itemId": {item-uuid},
    "itemType": "destination",
    "userId": {userId},
    "role": "owner",
    "createdAt": "2024-06-01", 
    "updatedAt": "2024-06-01"
}
```


  - User set destination to public
    
    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "destination",
        "userId": *,
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```

3. User add destination to trip
- For each trip traveler

    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "destination",
        "parentType": "trip",
        "parentId": {tripId},
        "userId": {travelerId},
        "role": "contributor",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
- For each trip guest

    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "destination",
        "parentType": "trip",
        "parentId": {tripId},
        "userId": {guestId},
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```

4. User creates a activity
```json
{
    "id": "uuid",
    "itemId": {item-uuid},
    "itemType": "activity",
    "parentType": "destination",
    "parentId": {destinationId},
    "userId": {userId},
    "role": "owner",
    "createdAt": "2024-06-01", 
    "updatedAt": "2024-06-01"
}
```

  - User set activity to public
    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "activity",
        "parentType": "destination",
        "parentId": {destinationId},
        "userId": *,
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
5. user adds travler to trip
    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "trip",
        "userId": {travelerId},
        "role": "contributor",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
    - for each destination tied to trip
    ```json
    {
        "id": "uuid",
        "itemId": {destination-uuid},
        "itemType": "destination",
        "parentType": "trip",
        "parentId": {tripId},
        "userId": {travelerId},
        "role": "contributor",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
6. user adds guest to trip
    ```json
    {
        "id": "uuid",
        "itemId": {item-uuid},
        "itemType": "trip",
        "userId": {guestId},
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
    - for each destination tied to trip
    ```json
    {
        "id": "uuid",
        "itemId": {destination-uuid},
        "itemType": "destination",
        "parentType": "trip",
        "parentId": {tripId},
        "userId": {guestId},
        "role": "reader",
        "createdAt": "2024-06-01", 
        "updatedAt": "2024-06-01"
    }
    ```
   
## Rules
TRIPS
- Trips details to view:
  - All trips where user is owner, contributor, reader
- Trips to edit:
  - All trips where user is owner, contributor

BUDGETS
- Budgets to view:
  - All trips where user is owner, contributor
- Budgets to edit/add:
  - All trips where user is owner

MEDIA
- Media to view:
  - All trips where user is owner, contributor, reader
- Media to edit:
  - All trips where user is owner
- Media to add:
  - All trips where user is owner, contributor

DESTINATIONS
- destinations to view:
  - All destinations where user is owner, contributor, reader
- destinations to edit:
  - All destinations where user is owner, contributor
- destinations to delete:
  - All destinations where user is owner

ACTIVITIES
- Activities to view:
  - All activities where user is owner, reader
  - All activities where user is contributor, reader on parent destination
- Activities to edit:
  - All activities where user is owner
  - All activities where user is contributor on parent destination
- destinations to delete:
  - All activities where user is owner


EXPENSES
- Expenses to view/edit/add/delete:
  - All expenses where user is owner, contributor on parent trip
  
SCHEDULE
- schedules to edit/add/delete:
  - All schedules where user is owner, contributor on parent trip
- schedules to view:
  - All schedules where user is owner, contributor,reader on parent trip

