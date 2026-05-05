// ==UserScript==
// @name         Spotify AI Artist Blocker
// @version      0.1.16
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
            toastMessage("Username not found.");
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

    function waitForElement(selector) {
        return new Promise(resolve => {
            const el = document.querySelector(selector);
            if (el)
                return resolve(el);

            let observer = null;
            observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function toastMessage(message) {
        const container = document.createElement("div");
        container.innerHTML = `
<div style="position:fixed;bottom:100px;left:50%;transform:translateX(-50%);">
  <div class="e-10310-box e-10310-box--elevated encore-light-theme" style="display:inline-flex;align-items:center;gap:8px;">
    <svg width="24" height="24" style="opacity:0.7;">
      <path d="M6 12c0-1.296.41-2.496 1.11-3.477l8.366 8.368A6 6 0 0 1 6 12m10.89 3.476L8.524 7.11a6 6 0 0 1 8.367 8.367z"></path>
      <path d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12m11-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16"></path>
    </svg>
    <span>${message}</span>
  </div>
</div>`;

        const modalSlot = await waitForElement(".VTO__modal-slot");
        modalSlot.appendChild(container);
        setTimeout(() => {
            container.style.transition = "opacity 0.3s";
            container.style.opacity = 0;
            setTimeout(() => container.remove(), 300);
        }, 5000);
    }

    async function main() {
        const randomDelay = () => new Promise(r => setTimeout(r, 500 + Math.random() * 250));
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
                const batch = toBlock.slice(i, i + 50);
                console.log(batch.map(a => `${a.name} (${a.id})`).join("\n"));
                const ids = batch.map(a => a.id);
                if (await blockArtists(ids)) {
                    ids.forEach(id => addBlocked(id));
                    done += ids.length;
                    console.log(`Blocked ${done} / ${toBlock.length}`);
                } else {
                    console.log("Failed to block batch.");
                }
                await randomDelay();
            }
            setLastRun(today);
            if (done != 0)
                toastMessage(`${done} AI artists blocked`);
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

    async function getPlayingArtistInfo() {
        document.querySelector('[data-restore-focus-key="device_picker"][data-active="true"],[data-testid="control-button-queue"][data-active="true"]')?.click();
        await new Promise(requestAnimationFrame);
        const trackId = document.querySelector('[data-context-item-type="track"]')?.href.split("track%3A").pop();
        const el = document.querySelector('.Root [data-testid="now-playing-bar"] [data-testid="context-item-info-artist"]');
        if (!trackId || !el)
            return toastMessage("Couldn't find currently playing artist");
        return { name: el?.innerText, url: el?.href, id: el?.href?.match(/\/artist\/([^\s]+)/i)?.[1], track: "https://open.spotify.com/track/" + trackId };
    }

    async function getOpenedArtistInfo() {
        const trackId = document.querySelector('[data-testid="track-list"] a[data-testid="internal-track-link"]')?.href.split("track/").pop();
        const el = document.querySelector('main:has([data-testid="artist-page"])');
        const artistId = el?.querySelector("section")?.dataset.testUri?.split("artist:").pop();
        const artistName = el?.querySelector('[data-encore-id="adaptiveTitle"]').innerHTML;
        if (!trackId || !el || !artistId || !artistName)
            return toastMessage("Couldn't find currently opened artist");
        return { name: artistName, url: "https://open.spotify.com/artist/" + artistId, id: artistId, track: "https://open.spotify.com/track/" + trackId };
    }

    GM_registerMenuCommand("Report opened AI Artist", async() => {
        const info = await getOpenedArtistInfo();
        if (!info)
            return;
        const { name, url, id, track } = info;
        await blockArtists([id]);
        window.open(`https://spotify-ai-blocker.cennoxx.deno.net/?artist_url=${url}&example_track_url=${track}&artist_name=${name}`);
    });

    GM_registerMenuCommand("Report playing AI Artist", async() => {
        const info = await getPlayingArtistInfo();
        if (!info)
            return;
        const { name, url, id, track } = info;
        await blockArtists([id]);
        window.open(`https://spotify-ai-blocker.cennoxx.deno.net/?artist_url=${url}&example_track_url=${track}&artist_name=${name}`);
    });

    GM_registerMenuCommand("Copy opened AI Artists name and ID", async() => {
        const info = getOpenedArtistInfo();
        if (!info)
            return;
        const { name, id } = info;
        await blockArtists([id]);
        GM_setClipboard(`${name},${id}`, "text");
    });

    GM_registerMenuCommand("Copy playing AI Artists name and ID", async() => {
        const  info = getPlayingArtistInfo();
        if (!info)
            return;
        const { name, id } = info;
        await blockArtists([id]);
        GM_setClipboard(`${name},${id}`, "text");
    });

    addFetchWrapper();
})();
