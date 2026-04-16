// ==UserScript==
// @name         Universal Iron-Block v10.0: 24-bit/48kHz Absolute Filter Genocide
// @namespace    http://tampermonkey.net/
// @version      10.0
// @description  Universal Raw Audio. 384kbps @ 48kHz. Kills ALL filters with absolute force.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE BITRATE & STEREO ENFORCER (SDP) ---
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

    // --- 2. THE ENGINE PATCHES ---
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

        // --- 3. THE MIC CONSTRAINTS (The "Genocide" Logic) ---
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (constraints) => {
                if (constraints && constraints.audio) {
                    const genocide = {
                        // HARDWARE SPECS (Adaptive)
                        channelCount: { ideal: 2 },
                        sampleRate: { ideal: 48000 },
                        sampleSize: { ideal: 24 },
                        
                        // W3C FILTERS: FORCED OFF
                        echoCancellation: { exact: false },
                        noiseSuppression: { exact: false },
                        autoGainControl: { exact: false },

                        // LEGACY CHROMIUM FILTERS: ABSOLUTE FALSE
                        // We use direct booleans here because "exact" doesn't apply to legacy "goog" flags
                        googEchoCancellation: false,
                        googAutoGainControl: false,
                        googAutoGainControl2: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        googTypingNoiseDetection: false,
                        googNoiseReduction: false,
                        googAudioMirroring: true, // Keep stereo channels aligned
                        
                        // 2026 SPECIFIC: VOIP MODES
                        voiceIsolation: false,
                        systemAudioLoopback: false
                    };

                    if (typeof constraints.audio === 'boolean') {
                        constraints.audio = genocide;
                    } else {
                        // Merge and prioritize our genocide constraints
                        Object.assign(constraints.audio, genocide);
                    }
                    console.log('%c[IRON-BLOCK] Filter Genocide Successful. Raw 48kHz Stream Locked.', 'color: #ff00ff; font-weight: bold;');
                }
                return originalGUM(constraints);
            };
        }
    } catch (e) { console.error('[IRON-BLOCK] Failure:', e); }
})();
