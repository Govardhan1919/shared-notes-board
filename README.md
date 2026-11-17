# Shared Notes

Four shared text boxes. No sign-in. Saved text stays until someone deletes it.

- `index.html` is the page.
- `api/notes.js` is the serverless function that saves notes to Vercel Blob.
- Needs the `BLOB_READ_WRITE_TOKEN` environment variable (added automatically when a Vercel Blob store is connected to the project).
