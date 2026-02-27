# Spotify AI Music Blocker
**Block AI-generated music on Spotify**

Automatically blocks artists known for AI-generated music using a community-maintained list.
- Runs directly in your browser
- No manual blocking
- Daily updated
- Fully open source

## Check if a Spotify Artist is AI-Generated
Wondering if a Spotify artist is AI-generated? If you don’t want to install the script and just want to check an artist, you can search the list of AI music artists here:  
**[Search the AI Artist List](https://github.com/CennoxX/spotify-ai-blocker/blob/main/SpotifyAiArtists.csv)**

Use the **Search this file** box at the top of the page to look for the artist name or ID.

## Installation
1. Install **[Tampermonkey](https://www.tampermonkey.net/index.php)**
   - The script requires direct page-context access, which other userscript managers do not support.
   - If you use Chrome, you must allow Tampermonkey to run scripts: [Permission to execute userscripts](https://www.tampermonkey.net/faq.php#Q209).
2. Open the script on:
   - **[GreasyFork](https://greasyfork.org/scripts/546762-spotify-ai-artist-blocker)**
   - **[GitHub](https://github.com/CennoxX/spotify-ai-blocker/raw/refs/heads/main/SpotifyAiBlocker.user.js)**
3. Click **Install** and confirm.
4. Open **[Spotify Web Player](https://open.spotify.com/)** to run the script.

## How It Works
The script automatically blocks artists from a community list of AI-generated music and runs quietly when you open Spotify Web.

> [!CAUTION]
> Spotify does not provide an official API for blocking artists. This userscript mimics requests made by Spotify’s web player and may violate Spotify's Terms of Service. Use at your own risk.

1. **List Fetching:** Daily loads a crowd-sourced CSV list of artists generating AI music from GitHub.
2. **Token Capture:** Hooks into Spotify’s internal `fetch` requests to extract the access token.
3. **Username Detection:** Retrieves the logged-in username from Spotify’s `localStorage`.
4. **Blocking:** Sends POST requests with access token and username to Spotify’s private API to block each artist.
5. **Persistence:** Remembers blocked artists and last run date using `localStorage` to prevent duplicate requests.

## Help Improve the List
Found an AI-generated artist that is not on the list? Submit them using the [GitHub submission form](https://github.com/CennoxX/spotify-ai-blocker/issues/new?template=ai-artist.yml).

You can submit the currently playing artist directly from Spotify Web: Hold **Shift + Right Click** (Spotify disables the normal context menu), then go to **Tampermonkey → Spotify AI Artist Blocker → Report AI Artist on GitHub**. The submission form will open automatically with the artist information already pre-filled.

## Similar Projects
- [SubmitHub AI Song Checker](https://www.submithub.com/story/ai-song-checker) – Tool to detect AI-generated songs
- [AI-Music Detection](https://github.com/deezer/ismir25-ai-music-detector) – Code for Deezer’s AI music tagging system
- [Identifying Counterfeit Songs](https://openreview.net/forum?id=PY7KSh29Z8) – Paper about large-scale AI song detection datasets
- [Using AI To Detect AI Music](https://www.youtube.com/watch?v=QVXfcIb3OKo) – YouTube video on identifying AI music
- [Soul Over AI](https://github.com/xoundbyte/soul-over-ai) – Curated list of AI artists across platforms
- [Spotify AI Blocklist](https://github.com/eye-wave/spotify-ai-blocklist) – AI blocklist for Spicetify
- [Spotify AI Band Blocker](https://github.com/Reginald-Gillespie/Spotify-AI-Band-Blocker) – Spicetify plugin to block AI artists

## FAQ
**Does this work in the Spotify app?**  
Blocking the artists only works in the Spotify Web Player. But once blocked, the artists are blocked everywhere you use Spotify.

**Do I need to install this on every device?**  
No, the block applies globally to your Spotify account, so once an artist is blocked, it counts on all devices.

**Can I unblock artists later?**  
Yes, just unblock them on their artist page, they will not be blocked from that device again.

**Will this get my Spotify account banned?**  
No known bans so far, but it uses unofficial methods and could theoretically violate ToS.

## Support
Other problems? Open an [issue on GitHub](https://github.com/CennoxX/spotify-ai-blocker/issues/new).
