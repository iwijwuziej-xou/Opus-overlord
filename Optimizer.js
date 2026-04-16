// ==UserScript==
// @name         Universal Iron-Block v9.0: Adaptive 24-bit/48kHz & Filter Genocide
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  Universal Raw Audio. 384kbps @ 48kHz. Adaptive Bit-Depth. Kills all Chromium processing.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE BITRATE & 48kHz ENFORCER ---
    const upgradeSDP = (sdp) => {
        if (!sdp || typeof sdp !== 'string') return sdp;

        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                let cleanParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/stereo=\d;?/g, '')
                    .replace(/sprop-stereo=\d;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '');

                // FORCES 384kbps, Stereo, and 48kHz Playback/Capture rates
                return `a=fmtp:${pt} ${cleanParams}maxaveragebitrate=384000;stereo=1;sprop-stereo=1;cbr=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 2. ENGINE PATCHES (Local & Remote) ---
    try {
        if (win.RTCPeerConnection) {
            const patchDesc = (proto, name) => {
                const orig = proto[name];
                proto[name] = function(desc) {
                    if (desc && desc.sdp) {
                        desc.sdp = upgradeSDP(desc.sdp);
                    }
                    return orig.apply(this, arguments);
                };
            };
            patchDesc(win.RTCPeerConnection.prototype, 'setLocalDescription');
            patchDesc(win.RTCPeerConnection.prototype, 'setRemoteDescription');
        }

        // --- 3. THE MIC CONSTRAINTS (Adaptive Hardware + Filter Death) ---
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (constraints) => {
                if (constraints && constraints.audio) {
                    const ironBlockAudio = {
                        // ADAPTIVE HARDWARE (Prevents crashing on 16-bit mics)
                        channelCount: { ideal: 2 },
                        sampleRate: { ideal: 48000 },
                        sampleSize: { ideal: 24 }, // Requests 24-bit, falls back to 16-bit if needed
                        
                        // ABSOLUTE FILTER GENOCIDE (Set to FALSE to kill processing)
                        echoCancellation: { exact: false },
                        noiseSuppression: { exact: false },
                        autoGainControl: { exact: false },
                        
                        // GOOG SPECIFIC REGISTERS
                        googAutoGainControl: false,
                        googAutoGainControl2: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        googEchoCancellation: false,
                        googTypingNoiseDetection: false,
                        googAudioMirroring: true, 
                        googNoiseReduction: false
                    };

                    if (typeof constraints.audio === 'boolean') {
                        constraints.audio = ironBlockAudio;
                    } else {
                        Object.assign(constraints.audio, ironBlockAudio);
                    }
                    console.log('%c[IRON-BLOCK] Constraints Applied. Hardware: Adaptive | Filters: DEAD', 'color: #00ff00; font-weight: bold;');
                }
                return originalGUM(constraints);
            };
        }
    } catch (e) { console.error('[IRON-BLOCK] Critical Patch Failure:', e); }
})();
