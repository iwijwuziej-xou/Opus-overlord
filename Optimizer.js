// ==UserScript==
// @name         Pure Filterless 16k Mic + 384k Opus (Connection Fix)
// @namespace    http://tampermonkey.net/
// @version      6.3
// @description  Fixed getUserMedia connectivity. Targets Mic only. 384kbps @ 16kHz.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. MICROPHONE CONSTRAINTS (More Flexible to allow connection) ---
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
            googAudioMirroring: true,
            // Removed 'exact' to prevent hardware rejection; using 'ideal' instead
            sampleRate: { ideal: 16000 }, 
            channelCount: { ideal: 2 },
            latency: 0
        };
        
        if (typeof constraints.audio === 'boolean') {
            constraints.audio = rawAudioSettings;
        } else {
            // Merge settings without overwriting critical IDs if they exist
            Object.assign(constraints.audio, rawAudioSettings);
        }
        return constraints;
    };

    // --- 2. SDP TRANSFORMATION (The actual Quality Enforcer) ---
    const setHighBitrateRaw = (sdp) => {
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                // Remove all existing bitrate/quality caps found in the dump
                let newParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '')
                    .replace(/maxplaybackrate=\d+;?/g, '')
                    .replace(/sprop-maxcapturerate=\d+;?/g, '');

                // Inject our 384k/16k/No-Filter params
                return `a=fmtp:${pt} ${newParams}maxaveragebitrate=384000;maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=1;sprop-stereo=1;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 3. PATCHING ---

    // Patch Local Description
    if (win.RTCPeerConnection) {
        const origSetLocalDescription = win.RTCPeerConnection.prototype.setLocalDescription;
        win.RTCPeerConnection.prototype.setLocalDescription = function(desc) {
            if (desc && desc.sdp) {
                desc.sdp = setHighBitrateRaw(desc.sdp);
                console.log('[FILTERLESS] SDP Mic Patched: 16kHz, 384k, No FEC/DTX');
            }
            return origSetLocalDescription.apply(this, arguments);
        }
    }

    // Patch getUserMedia (Mic)
    if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
        const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
        win.navigator.mediaDevices.getUserMedia = function(c) {
            return originalGUM(getFilterlessConstraints(c)).catch(err => {
                console.error('[FILTERLESS] GUM Failed, retrying with default constraints...', err);
                // Fallback: If our raw settings fail, try the original request to at least get a connection
                return originalGUM(c);
            });
        };
    }

    console.log('[FILTERLESS] v6.3 Active: Connection Fallback Enabled.');
})();
