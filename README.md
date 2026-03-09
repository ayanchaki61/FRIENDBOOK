# FriendBook (MERN)

A Facebook-like social app with:

- Sign up, login, logout
- Profile view/update
- Friend search
- Friend request send and accept
- Text and photo URL post creation
- Home feed (your posts + friends posts)
- Notifications
- Header and footer UI

## Tech Stack

- Frontend: React + Vite + React Router + Axios
- Backend: Node.js + Express + JWT
- Database: MongoDB + Mongoose

## Project Structure

- `client/` - React frontend
- `server/` - Express API backend

## Backend Setup

1. Go to `server/`
2. Create `.env` from `.env.example`
3. Set values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/friendbook
JWT_SECRET=replace_with_a_long_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

4. Install dependencies (if needed):

```bash
npm install
```

5. Start backend:

```bash
npm run dev
```

## Frontend Setup

1. Go to `client/`
2. Create `.env` from `.env.example`
3. Set environment values:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

4. Install dependencies (if needed):

```bash
npm install
```

5. Start frontend:

```bash
npm run dev
```

## Google Auth Setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID of type `Web application`.
2. Add your frontend origin to `Authorized JavaScript origins` (for example `http://localhost:5173`).
3. Copy the same Client ID into both:
	- `server/.env` as `GOOGLE_CLIENT_ID`
	- `client/.env` as `VITE_GOOGLE_CLIENT_ID`
4. Restart both backend and frontend after changing `.env` files.

If either value is left as the placeholder `your_google_oauth_client_id.apps.googleusercontent.com`, Google login/signup will stay disabled.

## API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`

### Users

- `GET /api/users/search?q=<text>`
- `GET /api/users/profile/:id`
- `PUT /api/users/profile`

### Friends

- `POST /api/friends/request/:userId`
- `GET /api/friends/requests`
- `POST /api/friends/requests/:requestId/accept`
- `POST /api/friends/requests/:requestId/reject`

### Posts

- `POST /api/posts`
- `GET /api/posts/home`
- `GET /api/posts/user/:userId`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications/:id/read`
