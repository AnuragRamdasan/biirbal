# 🔒 HTTPS Setup for Slack Integration

## Using LocalTunnel for Development

### 1. Start your Next.js development server
```bash
npm run dev
```
Your app should be running on `http://localhost:3000`

### 2. In a new terminal, create HTTPS tunnel
```bash
npx localtunnel --port 3000 --subdomain taansen-dev
```

This will give you a public HTTPS URL like:
```
https://taansen-dev.loca.lt
```

### 3. Update your Slack App OAuth URLs

Go to [api.slack.com/apps](https://api.slack.com/apps) → Your App → **OAuth & Permissions**

Update **Redirect URLs** to:
```
https://taansen-dev.loca.lt/api/auth/callback/slack
https://taansen-dev.loca.lt/api/slack/oauth_redirect
```

### 4. Update Event Subscriptions URL

Go to **Event Subscriptions** and update the **Request URL** to:
```
https://taansen-dev.loca.lt/api/slack/events
```

### 5. Update NEXTAUTH_URL

Add to your `.env` file:
```bash
NEXTAUTH_URL=https://taansen-dev.loca.lt
```

### 6. Test the integration

1. Visit: `https://taansen-dev.loca.lt`
2. Try Slack login
3. Try bot installation

## Alternative: Use a Different Subdomain

If `taansen-dev` is taken, try:
```bash
npx localtunnel --port 3000 --subdomain your-unique-name
```

## Pro Tips

### Keep the tunnel running
The tunnel needs to stay active while testing. Don't close the terminal.

### Use a consistent subdomain
Using `--subdomain` ensures you get the same URL each time, so you don't need to update Slack app settings repeatedly.

### Restart tunnel if needed
If the tunnel stops working:
```bash
# Stop with Ctrl+C, then restart
npx localtunnel --port 3000 --subdomain taansen-dev
```

## For Production

When deploying to production (Vercel, Netlify, etc.), update your Slack app URLs to your actual domain:
```
https://yourdomain.com/api/auth/callback/slack
https://yourdomain.com/api/slack/oauth_redirect
https://yourdomain.com/api/slack/events
```