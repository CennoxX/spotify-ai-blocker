// ==UserScript==
// @name         Spotify AI Artist Blocker
// @version      0.1.12
// @description  Automatically block AI-generated artists on Spotify using a crowd-sourced list
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/spotify-ai-blocker
// @supportURL   https://github.com/CennoxX/spotify-ai-blocker/issues/new
// @match        https://open.spotify.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=spotify.com
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @license      MIT
// ==/UserScript==
/* jshint esversion: 11 */

(async function() {
    "use strict";

    const CSV_URL = "https://raw.githubusercontent.com/CennoxX/spotify-ai-blocker/refs/heads/main/SpotifyAiArtists.csv";
    const STORAGE_KEY = "spotifyBlockedArtists";
    const LAST_RUN_KEY = "spotifyBlockerLastRun";
    const today = new Date().toISOString().slice(0, 10);

    const getBlocked = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const addBlocked = id => { const b = getBlocked(); b.includes(id) || (b.push(id), localStorage.setItem(STORAGE_KEY, JSON.stringify(b))) };
    const hasRunToday = () => localStorage.getItem(LAST_RUN_KEY) == today;
    const setLastRun = d => localStorage.setItem(LAST_RUN_KEY, d);
    let hasRun = false;
    let authHeader;

    async function fetchArtistList() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: CSV_URL,
                onload: r => {
                    const a = r.responseText.split("\n").slice(1).map(l => l.split(",").map(s => s.trim())).filter(([n, id]) => n && id).map(([name, id]) => ({ name, id }));
                    resolve(a);
                },
                onerror: reject
            });
        });
    }

    function getUsername() {
        const username = Object.keys(localStorage).find(k => k.includes(":") && !k.startsWith("anonymous:"))?.split(":")[0];
        if (!username)
            alert("Username not found.");
        return username;
    }

    async function blockArtists(ids) {
        const username = getUsername();
        if (!authHeader || !username)
            return false;

        try {
            const response = await fetch("https://spclient.wg.spotify.com/collection/v2/write?market=from_token", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "authorization": authHeader,
                },
                body: JSON.stringify({
                    username: username,
                    set: "artistban",
                    items: ids.map(id => ({ uri: `spotify:artist:${id}` }))
                })
            });
            if (response.ok)
                return true;
            if (response.status == 401)
                localStorage.removeItem("spotifyAccessToken");
        } catch (e) {
            console.error("blockArtists error:", e);
        }
        return false;
    }

    async function toastMessage(number) {
        var container = document.createElement("div");
        container.innerHTML = `
<div class="notistack-SnackbarContainer" style="position:fixed;bottom:100px;left:50%;transform:translateX(-50%)">
  <div class="notistack-Snackbar">
    <div class="e-91000-box e-91000-box--elevated encore-light-theme" style="display:flex;align-items:center;padding:2px 10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
      <svg data-encore-id="icon" class="e-91000-icon" style="--encore-icon-height:var(--encore-graphic-size-decorative-larger);--encore-icon-width:var(--encore-graphic-size-decorative-larger);margin-right:10px;opacity:0.6" viewBox="0 0 24 24">
        <path d="M6 12c0-1.296.41-2.496 1.11-3.477l8.366 8.368A6 6 0 0 1 6 12m10.89 3.476L8.524 7.11a6 6 0 0 1 8.367 8.367z"/>
        <path d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12m11-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16"/>
      </svg>
      <span>${number} AI artists blocked</span>
    </div>
  </div>
</div>`;
        let modalSlot = null;
        do {
            modalSlot = document.querySelector(".VTO__modal-slot");
        } while (!modalSlot && await randomDelay());
        modalSlot.appendChild(container);
        setTimeout(()=>{
            var snackbar = container.querySelector(".notistack-Snackbar");
            snackbar.style.transition = "opacity 0.3s";
            snackbar.style.opacity = 0;
            setTimeout(()=>container.remove(),300);
        },5000);
    }

    function randomDelay() {
        return new Promise(r => setTimeout(() => r(true), 500 + Math.random() * 250));
    }

    async function main() {
        try {
            hasRun = true;
            const artists = await fetchArtistList();
            const blocked = getBlocked();
            const toBlock = artists.filter(a => !blocked.includes(a.id));
            console.log(`Loaded ${artists.length} artists, ${toBlock.length} to block`);
            if (!toBlock.length)
                console.log("No new artists to block.");
            let done = 0;
            for (let i = 0; i < toBlock.length; i += 50) {
                const ids = toBlock.slice(i, i + 50).map(a => a.id);
                if (await blockArtists(ids)) {
                    ids.forEach(id => addBlocked(id));
                    done += ids.length;
                    console.log(`Blocked ${done}/${toBlock.length}`);
                } else {
                    console.log("Failed to block batch:", ids);
                }
                await randomDelay();
            }
            setLastRun(today);
            if (done != 0)
                toastMessage(done);
            console.log("Finished blocking artists.");
        } catch (e) {
            console.error("Error in Spotify AI Artist Blocker:", e);
        }
    }

    function addFetchWrapper() {
        const originalFetch = unsafeWindow.fetch;
        unsafeWindow.fetch = async function (...args) {
            const [, init] = args;
            if (init?.headers?.authorization)
                authHeader = init?.headers?.authorization;
            if (authHeader && !hasRun && !hasRunToday())
                main();
            return originalFetch.apply(this, args);
        };
    }

    function getArtistInfo() {
        const el = document.querySelector('.Root [data-testid="now-playing-bar"] [data-testid="context-item-info-artist"]');
        const track = "https://open.spotify.com/track/" + document.querySelector('[data-context-item-type="track"]').href.split("track%3A").pop();
        return { name: el?.innerText, url: el?.href, id: el?.href?.match(/\/artist\/([^\s]+)/i)?.[1], track: track };
    }

    GM_registerMenuCommand("Report AI Artist in GitHub", async() => {
        const { name, url, id, track } = getArtistInfo();
        await blockArtists([id]);
        window.open(`https://github.com/CennoxX/spotify-ai-blocker/issues/new?template=ai-artist.yml&title=[AI-Artist]%20${name}&artist_url=${url}&example_track_url=${track}&artist_name=${name}`);
    });

    GM_registerMenuCommand("Copy AI Artist name and ID", async() => {
        const { name, id } = getArtistInfo();
        await blockArtists([id]);
        GM_setClipboard(`${name},${id}`, "text");
    });

    addFetchWrapper();
})();
