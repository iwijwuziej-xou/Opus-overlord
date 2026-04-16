// ==UserScript==
// @name         Universal Iron-Block v8.0: 24-bit/48kHz Raw Opus Dominance
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Forces 24-bit 48kHz Raw Audio. 384kbps Stereo Opus. Kills ALL Chromium filters.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE BITRATE & 24-BIT ENFORCER ---
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

                // maxaveragebitrate=384000 (384kbps)
                // stereo=1 / sprop-stereo=1 (Forced 2-Channel)
                // cbr=1 (Constant Bitrate for zero dips)
                // maxplaybackrate=48000 / sprop-maxcapturerate=48000 (Forced 48kHz)
                return `a=fmtp:${pt} ${cleanParams}maxaveragebitrate=384000;stereo=1;sprop-stereo=1;cbr=1;maxplaybackrate=48000;sprop-maxcapturerate=48000;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 2. THE ENGINE PATCHES (Local & Remote Descriptions) ---
    try {
        if (win.RTCPeerConnection) {
            const patchDesc = (proto, name) => {
                const orig = proto[name];
                proto[name] = function(desc) {
                    if (desc && desc.sdp) {
                        desc.sdp = upgradeSDP(desc.sdp);
                        console.log(`%c[IRON-BLOCK] ${name} Patched: 384kbps/48kHz Stereo`, 'color: #00ff00; font-weight: bold;');
                    }
                    return orig.apply(this, arguments);
                };
            };
            patchDesc(win.RTCPeerConnection.prototype, 'setLocalDescription');
            patchDesc(win.RTCPeerConnection.prototype, 'setRemoteDescription');
        }

        // --- 3. THE MIC CONSTRAINTS (Filter Genocide & 24-bit/48kHz Force) ---
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (constraints) => {
                if (constraints && constraints.audio) {
                    const ironBlockAudio = {
                        // FORCE HIGH RES HARDWARE SPECS
                        channelCount: { exact: 2 },
                        sampleRate: { exact: 48000 },
                        sampleSize: { exact: 24 }, // FORCES 24-BIT DEPTH
                        latency: 0,
                        
                        // KILLS ALL CHROMIUM PROCESSING (SET TO FALSE)
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        
                        // GOOG SPECIFIC REGISTERS (DEATH TO FILTERS)
                        googAutoGainControl: false,
                        googAutoGainControl2: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        googEchoCancellation: false,
                        googTypingNoiseDetection: false,
                        googAudioMirroring: true, // Prevents phase flipping
                        googNoiseReduction: false
                    };

                    if (typeof constraints.audio === 'boolean') {
                        constraints.audio = ironBlockAudio;
                    } else {
                        Object.assign(constraints.audio, ironBlockAudio);
                    }
                    console.log('%c[IRON-BLOCK] getUserMedia Intercepted: ALL FILTERS DEAD.', 'color: #ff00ff;');
                }
                return originalGUM(constraints);
            };
        }
    } catch (e) { console.error('[IRON-BLOCK] Critical Patch Failure:', e); }
})();
