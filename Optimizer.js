// ==UserScript==
// @name         Universal Iron-Block: 24-bit/48kHz Absolute Filter Genocide
// @namespace    http://tampermonkey.net/
// @version      11.0
// @description  Universal Raw Audio. 384kbps @ 48kHz. Adaptive Bit-Depth. Kills all Chromium filters globally.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// @updateURL    https://raw.githubusercontent.com/iwijwuziej-xou/Universal-Media-Stream-Optimizer/refs/heads/main/Optimizer.js
// @downloadURL  https://raw.githubusercontent.com/iwijwuziej-xou/Universal-Media-Stream-Optimizer/refs/heads/main/Optimizer.js
// ==/UserScript==

/* MIT License
  Copyright (c) 2026 Iron-Block Brotherhood
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software...
*/

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE BITRATE & 48kHz ENFORCER (SDP Handshake) ---
    const upgradeSDP = (sdp) => {
        if (!sdp || typeof sdp !== 'string') return sdp;
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                let clean = params.replace(/(maxaveragebitrate|stereo|sprop-stereo|useinbandfec|usedtx|maxplaybackrate|sprop-maxcapturerate)=\d+;?/g, '');
                return `a=fmtp:${pt} ${clean}maxaveragebitrate=384000;stereo=1;sprop-stereo=1;cbr=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 2. THE ENGINE PATCHES (Local & Remote) ---
    try {
        if (win.RTCPeerConnection) {
            ['setLocalDescription', 'setRemoteDescription'].forEach(name => {
                const orig = win.RTCPeerConnection.prototype[name];
                win.RTCPeerConnection.prototype[name] = function(desc) {
                    if (desc && desc.sdp) desc.sdp = upgradeSDP(desc.sdp);
                    return orig.apply(this, arguments);
                };
            });
        }

        // --- 3. THE MIC CONSTRAINTS (Adaptive 24-bit + Absolute Genocide) ---
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (constraints) => {
                if (constraints && constraints.audio) {
                    const genocide = {
                        channelCount: { ideal: 2 },
                        sampleRate: { ideal: 48000 },
                        sampleSize: { ideal: 24 },
                        echoCancellation: { exact: false },
                        noiseSuppression: { exact: false },
                        autoGainControl: { exact: false },
                        googEchoCancellation: false,
                        googAutoGainControl: false,
                        googAutoGainControl2: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        googTypingNoiseDetection: false,
                        googNoiseReduction: false,
                        googAudioMirroring: true,
                        voiceIsolation: false
                    };

                    if (typeof constraints.audio === 'boolean') {
                        constraints.audio = genocide;
                    } else {
                        Object.assign(constraints.audio, genocide);
                    }
                    console.log('%c[IRON-BLOCK] v11.0: GitHub Sync Active. Filter Genocide Engaged.', 'color: #00ff00; font-weight: bold;');
                }
                return originalGUM(constraints);
            };
        }
    } catch (e) { console.error('[IRON-BLOCK] Patch Failure:', e); }
})();
