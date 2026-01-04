## Payment Link (admin)

APIs for getting and setting the `payment_link` value on the `churches` record belonging to the authenticated admin.

- Endpoint: `GET /api/admin/church/payment-link`
- Auth: Bearer token (admin)

Response example:

```json
{ "paymentLink": "https://payments.example.com/pay/abc123" }
```

Responses:
- `200` - `{ paymentLink: string | null }` (null when not set)
- `404` - `{ message: 'Church not found' }`

Example cURL:

```bash
curl -X GET \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://your-base-url/api/admin/church/payment-link
```

- Endpoint: `POST /api/admin/church/payment-link`
- Auth: Bearer token (admin)

Request body (JSON):

```json
{ "paymentLink": "https://payments.example.com/pay/abc123" }
```

Responses:
- `200` - `{ paymentLink: string }` (saved value)
- `400` - `{ message: 'Missing or invalid paymentLink' }`
- `404` - `{ message: 'Church not found' }`

Example cURL:

```bash
curl -X POST \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"paymentLink":"https://payments.example.com/pay/abc123"}' \
  https://your-base-url/api/admin/church/payment-link
```
