# UI/UX Portfolio

frontend/  -> index.html, css/style.css, js/app.js
backend/   -> server.js (Node.js, no npm install needed), data/projects.json, data/messages.json

## Run
cd backend && node server.js
Open http://localhost:3000

## Edit
- Projects: backend/data/projects.json (title, meta, tone a/b/c, link)
- Messages from the contact form are saved in backend/data/messages.json
- Read them via API: ADMIN_KEY=mysecret node server.js, then
  curl -H "x-admin-key: mysecret" http://localhost:3000/api/messages
