// ==UserScript==
// @name         Opus Overlord v11.4: Omnipotent (384k + 60FPS + Filter Kill)
// @namespace    http://tampermonkey.net/
// @version      11.4
// @description  All-in-one: 384kbps Stereo, 60FPS Screenshare, & Total Filter Annihilation.
// @author       JavaScript Einstein
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const AUDIO_BITRATE = 384000;
    const VIDEO_BITRATE = 8000000; // 8Mbps for High-Def Screenshare

    // --- 1. THE STUDIO HARDWARE HIJACK (Audio & Video) ---
    const applyOmnipotentConstraints = (c) => {
        // AUDIO: Kill every filter found in the dump + Force Stereo 48kHz
        if (c.audio) {
            const studioAudio = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                googEchoCancellation: false,
                googAutoGainControl: false,
                googNoiseSuppression: false,
                googHighpassFilter: false,
                googTypingNoiseDetection: false,
                channelCount: { exact: 2 },
                sampleRate: { exact: 48000 },
                latency: 0
            };
            c.audio = typeof c.audio === 'object' ? Object.assign(c.audio, studioAudio) : studioAudio;
        }
        
        // VIDEO/SCREENSHARE: Delete the 15fps cap from the dump
        if (c.video) {
            const studioVideo = {
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 60, min: 60 }, // Force 60fps motion
                displaySurface: "monitor"
            };
            c.video = typeof c.video === 'object' ? Object.assign(c.video, studioVideo) : studioVideo;
        }
        return c;
    };

    // Global hooks for Mic and Screen
    navigator.mediaDevices.getUserMedia = (orig => function(c) {
        return orig.call(this, applyOmnipotentConstraints(c));
    })(navigator.mediaDevices.getUserMedia);

    navigator.mediaDevices.getDisplayMedia = (orig => function(c) {
        return orig.call(this, applyOmnipotentConstraints(c));
    })(navigator.mediaDevices.getDisplayMedia);

    // --- 2. THE SDP JUGGERNAUT (Bitrate & Stereo Force) ---
    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        let lines = sdp.split('\r\n');

        return lines.map(line => {
            // AUDIO: Force 384k, Stereo, No FEC, No DTX, Full 48kHz Range
            if (line.includes('a=fmtp:') && line.includes('opus')) {
                return line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${AUDIO_BITRATE}`) +
                       `;stereo=1;sprop-stereo=1;cbr=1;useinbandfec=0;usedtx=0;maxplaybackrate=48000`;
            }
            // VIDEO: Force 8Mbps Bandwidth for Screenshare/Cam
            if (line.startsWith('m=video')) {
                return line + `\r\nb=AS:${Math.floor(VIDEO_BITRATE / 1000)}`;
            }
            return line;
        }).join('\r\n');
    };

    // Intercept the WebRTC handshake
    const pcProto = RTCPeerConnection.prototype;
    const wrap = (fn) => function(desc) {
        if (desc && desc.sdp) {
            desc.sdp = mungeSDP(desc.sdp);
        }
        return fn.call(this, desc);
    };

    pcProto.setLocalDescription = wrap(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrap(pcProto.setRemoteDescription);

    console.log("%c[v11.4]%c Omnipotent Mode: 384k Stereo / 60FPS Screenshare / No Filters.", "color:#ff00ff;font-weight:bold", "color:white");
})();
