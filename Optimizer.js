// ==UserScript==
// @name         Universal Filterless 16k + 384k Opus (IG/Zoom/Monkey)
// @namespace    http://tampermonkey.net/
// @version      6.4
// @description  Universal Raw Audio Patch. No FEC/DTX, 384kbps @ 16kHz. Targets Mic Only.
// @author       Coder & Gemini
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE CONSTRAINTS (Kill Filters) ---
    const getFilterlessConstraints = (constraints) => {
        if (!constraints || !constraints.audio) return constraints;
        const rawAudioSettings = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googEchoCancellation: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googTypingNoiseDetection: false,
            googAudioMirroring: true, // Crucial for Yeti X stereo field
            sampleRate: { ideal: 16000 },
            channelCount: { ideal: 2 }
        };
        if (typeof constraints.audio === 'boolean') {
            constraints.audio = rawAudioSettings;
        } else {
            Object.assign(constraints.audio, rawAudioSettings);
        }
        return constraints;
    };

    // --- 2. THE SDP TRANSFORMER (Kill Compression) ---
    const setHighBitrateRaw = (sdp) => {
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                let newParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '')
                    .replace(/maxplaybackrate=\d+;?/, '')
                    .replace(/sprop-maxcapturerate=\d+;?/, '');

                // Force 384k Bitrate, 16k Sample Rate, No FEC, No DTX
                return `a=fmtp:${pt} ${newParams}maxaveragebitrate=384000;maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=1;sprop-stereo=1;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 3. APPLY PATCHES ---
    try {
        // Handle outgoing call quality
        const origSetLocalDescription = win.RTCPeerConnection.prototype.setLocalDescription;
        win.RTCPeerConnection.prototype.setLocalDescription = function(desc) {
            if (desc && desc.sdp) {
                desc.sdp = setHighBitrateRaw(desc.sdp);
                console.log('%c[FILTERLESS] Handshake Patched: 384kbps @ 16kHz', 'color: #00ff00; font-weight: bold;');
            }
            return origSetLocalDescription.apply(this, arguments);
        };

        // Handle Microphone Access (GUM)
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (c) => {
                return originalGUM(getFilterlessConstraints(c)).catch(e => originalGUM(c));
            };
        }
    } catch (e) {
        console.error('[FILTERLESS] Patching failed:', e);
    }

    console.log('[FILTERLESS] v6.4 Universal Loaded. Ready for IG/Zoom/Monkey.');
})();
