# Polar Customers Map 🗺️🌍

![Cover](public/cover.png)

Visualize your customers around the world! Fetches orders directly from your Polar organization and highlights every country where you've ever had paying customers.

### Features

- Ranks countries by revenue  
- Exports to PNG, JPEG, or WebP  
- Excludes trials and $0 orders  
- 🔒 100% private — your auth token is never stored  

> Currently supports [Polar](https://polar.sh). Additional platforms coming soon.

---

## API

Generate map images programmatically. Perfect for embedding in dashboards, reports, or automations.

### Endpoint

```
GET /api/v1/map
```

```
GET https://customers-map.vercel.app/api/v1/map
```

### Parameters

**Required:**
- `polar_access_token` — Your Polar API access token
- `organization_id` — Your Polar organization ID

**Optional:**
- `format` — `png` | `jpeg` | `webp` (default: `png`)
- `scale` — `1` | `2` | `3` (default: `2`) — Higher values = sharper images
- `displayCountryRevenue` — `true` | `false` (default: `false`)
- `colorScheme` — `light` | `dark` (default: `light`)

### Quick Start

```bash
curl -X GET 'https://customers-map.vercel.app/api/v1/map?polar_access_token=YOUR_TOKEN&organization_id=YOUR_ORG_ID' \
  -o map.png
```

### Examples

**High-resolution dark mode with revenue labels:**
```bash
curl -X GET \
  'https://customers-map.vercel.app/api/v1/map?polar_access_token=YOUR_TOKEN&organization_id=YOUR_ORG_ID&format=webp&scale=3&colorScheme=dark&displayCountryRevenue=true' \
  -o customers-map.webp
```

**Use in JavaScript:**
```javascript
const mapUrl = new URL('https://customers-map.vercel.app/api/v1/map');
mapUrl.searchParams.set('polar_access_token', token);
mapUrl.searchParams.set('organization_id', orgId);
mapUrl.searchParams.set('format', 'webp');
mapUrl.searchParams.set('scale', '3');

const response = await fetch(mapUrl);
const imageBlob = await response.blob();
```

---
