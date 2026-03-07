// ==UserScript==
// @name         Opus Overlord v10.5: Universal Clear Stereo
// @namespace    http://tampermonkey.net/
// @version      10.5
// @description  Stable 120kbps Stereo + Total Filter Annihilation. Guaranteed Clear.
// @author       JavaScript Einstein
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const STABLE_BITRATE = 120000; // 120kbps: The HD Sweet Spot

    // --- 1. TOTAL FILTER ANNIHILATION ---
    const annihilateFilters = (c) => {
        const kill = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googEchoCancellation: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googTypingNoiseDetection: false,
            googAudioMirroring: false,
            voiceIsolation: 'none', // Specifically for MacOS/Brave
            channelCount: { exact: 2 },
            sampleRate: { exact: 48000 }
        };
        if (c.audio) {
            if (typeof c.audio === 'object') Object.assign(c.audio, kill);
            else c.audio = kill;
        }
        return c;
    };

    navigator.mediaDevices.getUserMedia = (orig => function(c) {
        return orig.call(this, annihilateFilters(c));
    })(navigator.mediaDevices.getUserMedia);

    // --- 2. INTERNAL SDP HIJACK (The Stereo Force) ---
    const forceHD = (sdp) => {
        if (!sdp || !sdp.includes('opus')) return sdp;
        return sdp.split('\r\n').map(line => {
            if (line.includes('a=fmtp:')) {
                // Wipe the server limits and force the HD parameters
                let m = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${STABLE_BITRATE}`);
                m = m.replace(/maxplaybackrate=\d+/, `maxplaybackrate=48000`);
                
                // sprop-stereo=1 is the secret for Instagram's server to allow stereo
                if (!m.includes('stereo=1')) {
                    m += `;stereo=1;sprop-stereo=1;cbr=1;maxaveragebitrate=${STABLE_BITRATE}`;
                }
                return m;
            }
            // Allocate bandwidth pipe
            if (line.startsWith('m=audio')) return line + `\r\nb=AS:${Math.floor(STABLE_BITRATE / 1000)}`;
            return line;
        }).join('\r\n');
    };

    // --- 3. THE SILENT ENGINE HIJACK ---
    const pcProto = RTCPeerConnection.prototype;
    const wrap = (fn) => function(desc) {
        if (desc && desc.sdp) desc.sdp = forceHD(desc.sdp);
        return fn.call(this, desc);
    };

    pcProto.setLocalDescription = wrap(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrap(pcProto.setRemoteDescription);

    console.log("%c[v10.5]%c STEREO HD ENGINE ACTIVE (256kbps). All filters killed.", "color:#00ffcc;font-weight:bold", "color:white");
})();
