// ==UserScript==
// @name         Opus Overlord v12.3: Master of Purity
// @namespace    http://tampermonkey.net/
// @version      12.3
// @description  Full Filter Annihilation + 384k Stereo + 1080p60 Screenshare.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const AUDIO_BITRATE = 384000;
    const VIDEO_BITRATE = 8000000;

    // --- 1. THE COMPLETE FILTER KILL-LIST ---
    const annihilateAllFilters = (c) => {
        if (c.audio) {
            const godModeAudio = {
                // Standard Filters (The Big Three)
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                
                // Chromium Internal "Goog" Filters (The Hidden Saboteurs)
                googEchoCancellation: false,
                googAutoGainControl: false,
                googNoiseSuppression: false,
                googHighpassFilter: false,
                googTypingNoiseDetection: false,
                googAudioMirroring: false,
                googNoiseReduction: false,
                googExperimentalEchoCancellation: false,
                
                // Hardware & OS Level Gates
                voiceIsolation: 'none',
                latency: 0,
                
                // Scarlett Studio Config (The Math)
                channelCount: { exact: 2 }, // Force 2 channels
                sampleRate: { exact: 48000 } // Force 48kHz
            };
            c.audio = typeof c.audio === 'object' ? Object.assign(c.audio, godModeAudio) : godModeAudio;
        }

        if (c.video) {
            c.video = {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 60, min: 60 },
                displaySurface: "monitor"
            };
        }
        return c;
    };

    // Hijack getUserMedia (Mic/Cam) and getDisplayMedia (Screenshare)
    navigator.mediaDevices.getUserMedia = (orig => function(c) { return orig.call(this, annihilateAllFilters(c)); })(navigator.mediaDevices.getUserMedia);
    navigator.mediaDevices.getDisplayMedia = (orig => function(c) { return orig.call(this, annihilateAllFilters(c)); })(navigator.mediaDevices.getDisplayMedia);

    // --- 2. THE SDP POWERHOUSE (Bitrate & Stereo Engine) ---
    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        return sdp.split('\r\n').map(line => {
            if (line.includes('a=fmtp:') && line.includes('opus')) {
                // Force Stereo=1 (True), 384k, No FEC, No DTX
                let m = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${AUDIO_BITRATE}`)
                            .replace(/maxplaybackrate=\d+/, `maxplaybackrate=48000`);
                if (!m.includes('stereo=1')) {
                    m += `;stereo=1;sprop-stereo=1;cbr=1;useinbandfec=0;usedtx=0;sprop-maxcapturerate=48000`;
                }
                return m;
            }
            if (line.startsWith('m=video')) return line + `\r\nb=AS:${Math.floor(VIDEO_BITRATE / 1000)}`;
            return line;
        }).join('\r\n');
    };

    const pcProto = RTCPeerConnection.prototype;
    const wrap = (fn) => function(desc) {
        if (desc && desc.sdp) desc.sdp = mungeSDP(desc.sdp);
        return fn.call(this, desc);
    };

    pcProto.setLocalDescription = wrap(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrap(pcProto.setRemoteDescription);

    console.log("%c[v12.3]%c Master of Purity ACTIVE: Filters Dead | 384k Stereo | 60FPS HD.", "color:#00ffcc;font-weight:bold", "color:white");
})();
