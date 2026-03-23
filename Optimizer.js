// ==UserScript==
// @name         Pure Filterless 16k Mic + 384k Opus + Mirroring (Mic Only)
// @namespace    http://tampermonkey.net/
// @version      6.2
// @description  Targets Mic ONLY. Disables FEC/DTX, forces 384kbps @ 16kHz, enables googAudioMirroring.
// @author       Coder & Gemini
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. MICROPHONE CONSTRAINTS ---
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
            googAudioMirroring: true, // Keep stereo field intact
            sampleRate: { ideal: 16000, exact: 16000 },
            channelCount: { ideal: 2 },
            latency: 0
        };
        
        if (typeof constraints.audio === 'boolean') {
            constraints.audio = rawAudioSettings;
        } else {
            Object.assign(constraints.audio, rawAudioSettings);
        }
        return constraints;
    };

    // --- 2. SDP TRANSFORMATION (Bitrate & Filter Stripping) ---
    const setHighBitrateRaw = (sdp) => {
        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                // Scrub existing restrictive parameters from the dump
                let newParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '')
                    .replace(/maxplaybackrate=\d+;?/g, '')
                    .replace(/sprop-maxcapturerate=\d+;?/g, '');

                // Inject high-fidelity 16kHz parameters
                return `a=fmtp:${pt} ${newParams}maxaveragebitrate=384000;maxplaybackrate=16000;sprop-maxcapturerate=16000;stereo=1;sprop-stereo=1;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 3. PATCHING ---

    // Patch Local Description for outgoing Opus quality
    const origSetLocalDescription = win.RTCPeerConnection.prototype.setLocalDescription;
    win.RTCPeerConnection.prototype.setLocalDescription = function(desc) {
        if (desc && desc.sdp) {
            desc.sdp = setHighBitrateRaw(desc.sdp);
            console.log('[FILTERLESS] SDP Mic Patched: 16kHz, 384k, No FEC/DTX');
        }
        return origSetLocalDescription.apply(this, arguments);
    };

    // Patch getUserMedia (Microphone) ONLY - Screen share (getDisplayMedia) remains untouched
    if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
        const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
        win.navigator.mediaDevices.getUserMedia = (c) => originalGUM(getFilterlessConstraints(c));
    }

    console.log('[FILTERLESS] v6.2 Active: Mic Targeted, Screen Share Ignored.');
})();
