# church-attendance-backend

## Events API: GET /api/admin/events

Response example (each event includes `services` array):

```json
[
	{
		"id": "event-uuid-1",
		"name": "Sunday Service",
		"event_date": "2025-12-21",
		"services": [
			{ "id": "svc-uuid-1", "service_code": "A", "service_time": "08:00:00", "qrUrl": "https://example.com/api/register/metadata?token=..." },
			{ "id": "svc-uuid-2", "service_code": "B", "service_time": "10:00:00", "qrUrl": "https://example.com/api/register/metadata?token=..." }
		]
	},
	{
		"id": "event-uuid-2",
		"name": "Midweek Prayer",
		"event_date": "2025-12-24",
		"services": []
	}
]
```

``` 

## Delete Event (admin)

Delete an event only when there are no attendees registered for any of its services.

- Endpoint: `DELETE /api/admin/event/:eventId`
- Auth: Bearer token (admin)

Responses:
- `200` - `{ message: "Event deleted" }`
- `400` - `{ message: "Can't delete event: attendees exist" }` (when attendees exist)
- `404` - `{ message: 'Event not found' }` (not found or not authorized)

Example cURL:

```bash
curl -X DELETE \
	-H "Authorization: Bearer <ADMIN_TOKEN>" \
	https://your-base-url/api/admin/event/<EVENT_ID>
```

Ensure the admin token belongs to the same `church_id` as the event.

## Testing Member Payment Link API

This endpoint returns the `payment_link` set on the member's church record.

- Endpoint: `GET /api/member/payment-link`
- Auth: Bearer token (member)

1) Obtain a member token (example using the test OTP):

```bash
curl -X POST \
	-H "Content-Type: application/json" \
	-d '{"phone":"+15551234567","otp":"123456"}' \
	https://your-base-url/api/member/verify-otp
```

Response:

```json
{ "token": "<MEMBER_TOKEN>" }
```

2) Call the payment link endpoint with the member token:

```bash
curl -H "Authorization: Bearer <MEMBER_TOKEN>" \
	https://your-base-url/api/member/payment-link
```

Example response:

```json
{ "paymentLink": "https://payments.example.com/abc123" }
```

If no payment link is set the response will be:

```json
{ "paymentLink": null }
```

Replace `https://your-base-url` with your `BASE_URL` (or localhost and port when running locally).
