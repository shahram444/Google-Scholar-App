# Scholar Hub 📚

A full-stack mobile app to track your Google Scholar citations, publications, and academic impact.

![Scholar Hub](https://via.placeholder.com/800x400/0f0c29/ffffff?text=Scholar+Hub)

## Features

- 🔐 **Google Sign-In** - Secure authentication with your Google account
- 📊 **Citation Metrics** - Track total citations, h-index, and i10-index
- 📈 **Citation History** - Visual graph of citations over time
- 📄 **Publications** - View your top publications with citation counts
- 👥 **Co-Authors** - See your research collaborators
- 🔄 **Real-time Updates** - Pull-to-refresh for latest data

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   iPhone App    │ ───► │  Backend Server │ ───► │ Google Scholar  │
│  (Expo/React    │      │   (Node.js +    │      │   (Scraped)     │
│    Native)      │      │    Express)     │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Google OAuth   │
│    (Sign-in)    │
└─────────────────┘
```

## Prerequisites

- **Node.js** 18+ (https://nodejs.org/)
- **Expo Go app** on your iPhone (free from App Store)
- **Google Cloud Console account** (free)

## Step 1: Set Up Google OAuth

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Name it something like "Scholar Hub"

### 1.2 Enable APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable:
   - Google+ API
   - Google People API

### 1.3 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure the OAuth consent screen first:
   - User Type: External
   - App name: Scholar Hub
   - Support email: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add your email as a test user

4. Create OAuth client IDs:

   **For Web (required for Expo):**
   - Application type: Web application
   - Authorized JavaScript origins: `https://auth.expo.io`
   - Authorized redirect URIs: `https://auth.expo.io/@YOUR_EXPO_USERNAME/scholar-hub`
   
   **For iOS (optional, for standalone builds):**
   - Application type: iOS
   - Bundle ID: `com.yourname.scholarhub`
   
   **For Android (optional):**
   - Application type: Android
   - Package name: `com.yourname.scholarhub`

5. Copy your Client IDs - you'll need them!

## Step 2: Set Up Backend Server

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Google Client ID:

```env
GOOGLE_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
PORT=3001
```

### 2.3 Run the Server

**For local development:**
```bash
npm run dev
```

Server will run at `http://localhost:3001`

### 2.4 Deploy to Production (Required for iPhone)

Your backend needs to be accessible from the internet. Options:

**Option A: Railway (Recommended - Free tier)**
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables
4. Get your URL (e.g., `https://scholar-hub.up.railway.app`)

**Option B: Render**
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect repo, add env vars
4. Get URL

**Option C: Heroku**
```bash
heroku create scholar-hub-backend
heroku config:set GOOGLE_CLIENT_ID=your_id
git push heroku main
```

## Step 3: Set Up Mobile App

### 3.1 Install Expo CLI

```bash
npm install -g expo-cli
```

### 3.2 Install Dependencies

```bash
cd frontend
npm install
```

### 3.3 Configure the App

Edit `App.js` and update the CONFIG section:

```javascript
const CONFIG = {
  GOOGLE_CLIENT_ID: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // Optional
  GOOGLE_ANDROID_CLIENT_ID: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Optional
  BACKEND_URL: 'https://your-backend-url.railway.app', // Your deployed backend URL
};
```

### 3.4 Create Expo Account

1. Go to [expo.dev](https://expo.dev)
2. Create free account
3. Login in terminal:
```bash
expo login
```

### 3.5 Run the App

```bash
npm start
```

This will show a QR code. 

### 3.6 Open on Your iPhone

1. Open **Expo Go** app on your iPhone
2. Scan the QR code from terminal
3. App will load on your phone!

## Step 4: Find Your Google Scholar ID

Your Scholar ID is in your profile URL:

```
https://scholar.google.com/citations?user=ABC123xyz
                                          ^^^^^^^^^^
                                          This is your ID
```

If you don't know your ID:
1. Go to Google Scholar
2. Click "My profile" (if you have one)
3. Copy the `user=` parameter from the URL

Or use the in-app search to find your profile!

## Troubleshooting

### "Failed to connect to server"

- Make sure backend is running and accessible
- Check BACKEND_URL in App.js is correct
- If using localhost, make sure phone is on same WiFi

### "Invalid token" on login

- Verify GOOGLE_CLIENT_ID matches in both frontend and backend
- Make sure redirect URIs are correct in Google Console
- Check you're using the **Web** client ID for Expo

### "Failed to fetch Scholar data"

- Google Scholar may be rate limiting - wait a few minutes
- Verify the Scholar ID is correct
- Try searching by name instead

### App won't load on Expo Go

- Make sure you're logged into Expo CLI
- Check your phone and computer are on same network
- Try `expo start --tunnel` for remote access

## Project Structure

```
google-scholar-app/
├── backend/
│   ├── server.js         # Express server with Scholar scraping
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── App.js            # React Native/Expo app
│   ├── app.json          # Expo configuration
│   └── package.json
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/google` | POST | Verify Google token |
| `/api/scholar/search` | GET | Search Scholar profiles |
| `/api/scholar/profile/:id` | GET | Get full profile data |
| `/api/user/link-scholar` | POST | Link Scholar to user |

## Tech Stack

**Frontend:**
- React Native
- Expo
- expo-auth-session (Google OAuth)
- expo-linear-gradient

**Backend:**
- Node.js
- Express
- Cheerio (web scraping)
- google-auth-library

## Security Notes

- Google OAuth tokens are verified server-side
- No Scholar passwords required - data is public
- User data stored in memory (add database for production)
- Consider rate limiting for production

## Future Improvements

- [ ] Push notifications for new citations
- [ ] Compare metrics over time
- [ ] Export data to CSV
- [ ] Multiple Scholar profiles
- [ ] Citation alerts by publication
- [ ] Dark/light theme toggle

## License

MIT License - feel free to use and modify!

---

## Quick Start Summary

1. **Google Cloud Console**: Create OAuth credentials
2. **Backend**: `npm install` → configure `.env` → deploy to Railway/Render
3. **Frontend**: Update CONFIG in `App.js` → `npm start` → scan QR with Expo Go
4. **Enjoy**: Sign in with Google, link your Scholar profile, track citations!

Need help? The app will show helpful error messages. Most issues are related to OAuth configuration or network connectivity.
