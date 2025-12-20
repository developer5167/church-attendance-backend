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
