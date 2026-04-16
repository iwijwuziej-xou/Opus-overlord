// ==UserScript==
// @name         Universal Filterless v7.0: 384kbps + Force Remote Stereo + AGC Kill
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  Full WebRTC Overhaul. Forced 384kbps Stereo Opus. Overrides Remote Constraints & Kills all filters.
// @author       Coder
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // --- 1. THE BITRATE & STEREO ENFORCER ---
    const upgradeSDP = (sdp) => {
        if (!sdp || typeof sdp !== 'string') return sdp;

        return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
            if (params.toLowerCase().includes('opus')) {
                // Remove existing limits
                let cleanParams = params
                    .replace(/maxaveragebitrate=\d+;?/g, '')
                    .replace(/stereo=\d;?/g, '')
                    .replace(/sprop-stereo=\d;?/g, '')
                    .replace(/useinbandfec=\d;?/g, '')
                    .replace(/usedtx=\d;?/g, '');

                // Inject 384kbps + Forced Stereo Logic
                // stereo=1: We WANT to receive stereo.
                // sprop-stereo=1: We ARE sending stereo.
                return `a=fmtp:${pt} ${cleanParams}maxaveragebitrate=384000;stereo=1;sprop-stereo=1;cbr=1;useinbandfec=0;usedtx=0`.replace(/;+/g, ';');
            }
            return match;
        });
    };

    // --- 2. ENGINE PATCHES (Local & Remote) ---
    try {
        if (win.RTCPeerConnection) {
            // PATCH: Local Description (What YOU send)
            const origSetLocal = win.RTCPeerConnection.prototype.setLocalDescription;
            win.RTCPeerConnection.prototype.setLocalDescription = function(desc) {
                if (desc && desc.sdp) {
                    desc.sdp = upgradeSDP(desc.sdp);
                    console.log('%c[IRON-BLOCK] Local SDP Patched: 384kbps Stereo Engaged', 'color: #00ff00; font-weight: bold;');
                }
                return origSetLocal.apply(this, arguments);
            };

            // PATCH: Remote Description (What THEY receive/expect)
            // This forces the other side's "listener" to open its ears for a 384k stereo signal
            const origSetRemote = win.RTCPeerConnection.prototype.setRemoteDescription;
            win.RTCPeerConnection.prototype.setRemoteDescription = function(desc) {
                if (desc && desc.sdp) {
                    desc.sdp = upgradeSDP(desc.sdp);
                    console.log('%c[IRON-BLOCK] Remote SDP Overridden: Forcing Incoming Stereo/384k', 'color: #00ffff; font-weight: bold;');
                }
                return origSetRemote.apply(this, arguments);
            };
        }

        // --- 3. THE MIC CONSTRAINTS (Filter Genocide) ---
        if (win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) {
            const originalGUM = win.navigator.mediaDevices.getUserMedia.bind(win.navigator.mediaDevices);
            win.navigator.mediaDevices.getUserMedia = (constraints) => {
                if (constraints && constraints.audio) {
                    const rawAudio = {
                        autoGainControl: false,
                        echoCancellation: false,
                        noiseSuppression: false,
                        channelCount: 2, // Forced 2-channel
                        sampleRate: 48000,
                        latency: 0,
                        // Chrome-specific legacy flags
                        googAutoGainControl: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        googEchoCancellation: false,
                        googAudioMirroring: true
                    };

                    if (typeof constraints.audio === 'boolean') {
                        constraints.audio = rawAudio;
                    } else {
                        Object.assign(constraints.audio, rawAudio);
                    }
                    console.log('%c[IRON-BLOCK] Filters Terminated. Raw 48kHz Stream Active.', 'color: #ff00ff;');
                }
                return originalGUM(constraints);
            };
        }
    } catch (e) {
        console.error('[IRON-BLOCK] Critical Patch Failure:', e);
    }
})();
