// ==UserScript==
// @name         Universal Filterless 16k + 384k Opus + Volume Lock
// @namespace    http://tampermonkey.net/
// @version      6.5
// @description  Universal Raw Audio. 384kbps @ 16kHz. Disables all AGC/Volume control and filters.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE CONSTRAINTS (Kill Filters & Volume Control) ---
    const getFilterlessConstraints = (constraints) => {
        if (!constraints || !constraints.audio) return constraints;
        
        const rawAudioSettings = {
            // STOPS WEBSITE FROM CHANGING MIC VOLUME
            autoGainControl: false, 
            googAutoGainControl: false,
            googAutoGainControl2: false,
            
            // KILLS FILTERS
            echoCancellation: false,
            noiseSuppression: false,
            googEchoCancellation: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googTypingNoiseDetection: false,
            
            // MAINTAINS RAW QUALITY
            googAudioMirroring: true, 
            sampleRate: { ideal: 24000 },
            channelCount: { ideal: 2 }
        };

        if (typeof constraints.audio === 'boolean') {
            constraints.audio = rawAudioSettings;
        } else {
            // Overwrite existing constraints to ensure our "false" settings stick
            Object.assign(constraints.audio, rawAudioSettings);
        }
        return constraints;
    };

    // --- 2. THE SDP TRANSFORMER (The Bitrate Enforcer) ---
    const setHighBitrateRaw = (sdp) => {
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                let newParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '')
                    .replace(/maxplaybackrate=\d+;?/, '')
                    .replace(/sprop-maxcapturerate=\d+;?/, '');

                return `a=fmtp:${pt} ${newParams}maxaveragebitrate=384000;maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=1;sprop-stereo=1;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 3. APPLY ENGINE PATCHES ---
    try {
        // Patch RTCPeerConnection for Bitrate
        if (win.RTCPeerConnection) {
            const origSetLocalDescription = win.RTCPeerConnection.prototype.setLocalDescription;
            win.RTCPeerConnection.prototype.setLocalDescription = function(desc) {
                if (desc && desc.sdp) {
                    desc.sdp = setHighBitrateRaw(desc.sdp);
                    console.log('%c[FILTERLESS] Handshake Patched: 384kbps & Volume Locked', 'color: #00ff00; font-weight: bold;');
                }
                return origSetLocalDescription.apply(this, arguments);
            };
        }

        // Patch getUserMedia for Raw Input & AGC Kill
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (c) => {
                const patched = getFilterlessConstraints(c);
                console.log('[FILTERLESS] getUserMedia Request intercepted.');
                return originalGUM(patched).catch(e => {
                    console.warn('[FILTERLESS] Constraint error, falling back to default.', e);
                    return originalGUM(c);
                });
            };
        }
    } catch (e) {
        console.error('[FILTERLESS] Critical Patching Failure:', e);
    }

    console.log('[FILTERLESS] v6.5 Active: Filters DEAD | Volume LOCKED | Bitrate 384k');
})();
