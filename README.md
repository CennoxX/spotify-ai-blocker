# Spotify AI Blocker

**Block AI-generated music on Spotify** using a crowd-sourced list. This project collects artists making AI-music and blocks them automatically with a userscript.

> [!CAUTION]
> Spotify doesn’t provide a public API to block artists, so this userscript uses a workaround by capturing Spotify’s tokens and mimicking internal requests from Spotify’s web client. Using unofficial API requests may violate Spotify's Terms of Service.

## How It Works
1. **List Fetching:** Loads daily a crowd-sourced CSV list of artists generating AI-music from GitHub.
2. **Token Capture:** Hooks into Spotify’s internal `fetch` requests to extract the access token.
3. **Username Detection:** retrieves the logged-in username from Spotify’s `localStorage`.
4. **Blocking:** Sends POST requests with access token and username to Spotify’s private API to block each artist.
5. **Persistence:** Remembers blocked artists and last run date using `localStorage` to prevent duplicate requests.

## Installation
1. Install a userscript manager (e.g. Tampermonkey, Violentmonkey).
2. Visit the script on [GreasyFork](https://update.greasyfork.org/scripts/546762/Spotify%20AI%20Artist%20Blocker.user.js) or [GitHub](https://github.com/CennoxX/spotify-ai-blocker/raw/refs/heads/main/SpotifyAiBlocker.user.js).
3. Click **Install** and confirm.

## Similar Projects
- [AI Bands](https://github.com/romiem/ai-bands) – Curated list of AI-generated music projects on various platforms
- [Spotify AI Blocklist](https://github.com/eye-wave/spotify-ai-blocklist) – Another blocklist for AI artists on Spotify
- Spotify playlists with AI music: [AI Music 1](https://open.spotify.com/playlist/5xooQuxBYK7ZXN4dhSQ9GL), [AI Music 2](https://open.spotify.com/playlist/0LbbLseXgEjmDv27R7SwzT), [AI Music 3](https://open.spotify.com/playlist/3dVyZZTdyA6VUqSD3mmf7g)
- [SubmitHub AI Song Checker](https://www.submithub.com/story/ai-song-checker) – Tool for detecting AI-generated songs
- [AI Music Detection Video](https://www.youtube.com/watch?v=QVXfcIb3OKo) – YouTube video about identifying AI music

## Support
Found an AI-music generating artist? [Add an AI artist using GitHub](https://github.com/CennoxX/spotify-ai-blocker/issues/new?template=ai-artist.yml) or [send a mail](mailto:cesar.bernard@gmx.de). 

Other problems? [Open an issue](https://github.com/CennoxX/spotify-ai-blocker/issues/new). 
