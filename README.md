# NoteStudio

NoteStudio is a semester-wise website for storing and managing study materials in one place.

## Features

- Browse notes by semester and subject
- Upload PDF, DOC, DOCX, PPT, and PPTX files
- Upload files up to 100 MB each
- View supported documents in the browser
- Download study materials
- Search notes, subjects, and subject codes
- Filter by notes, question banks, previous papers, and syllabi
- Sort materials by newest or name
- Mark important files as favorites
- See recently viewed materials
- Use light mode or dark mode
- Edit and delete files with owner access only

## File Structure

```text
notestudio/
├── client/                 # Frontend website
│   ├── index.html          # Page structure
│   ├── styles.css          # Website design
│   └── app.js              # Frontend functionality
├── server/                 # Backend application
│   ├── index.js            # Server entry point
│   ├── routes/notes.js     # Notes and file APIs
│   ├── middleware/         # Upload and owner access rules
│   ├── uploads/            # Uploaded files
│   └── .env                # Private owner configuration
└── README.md
```

## Run Locally

Requires Node.js 18 or newer.

```bash
cd server
npm install
npm start
```

Open [http://localhost:4000](http://localhost:4000) in your browser.

## Owner Access

Normal users can view, download, search, and favorite documents. Only the owner can edit or delete files.

The owner password is protected using a secure hash in `server/.env`.

## Deployment

### Render backend

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables:
  - `ADMIN_PASSWORD_HASH` = your private owner-password hash
  - `CORS_ORIGIN` = your Vercel URL, for example `https://your-project.vercel.app`
  - `NODE_ENV` = `production`

### Vercel frontend

- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variable:
  - `VITE_API_URL` = your Render backend URL, for example `https://your-api.onrender.com`

Only `VITE_API_URL` belongs in the frontend. Never add passwords, hashes, API keys, or database credentials to Vercel frontend variables.
