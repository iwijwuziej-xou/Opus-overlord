// ==UserScript==
// @name         Global Media Quality Overrider
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Forces 1080p60 and Filterless Audio globally on all sites
// @author       Partner
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Brainstorming the "Enforcement" Strategy:
    // Some sites try to re-apply constraints AFTER the stream starts.
    // To be "always right," we define our targets clearly.

    const AUDIO_RAW_TARGETS = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        googAutoGainControl: false,
        googAutoGainControl2: false,
        googEchoCancellation: false,
        googNoiseSuppression: false,
        googHighpassFilter: false,
        googTypingNoiseDetection: false,
        channelCount: 2,
        latency: 0,
        sampleRate: 48000
    };

    const VIDEO_HQ_TARGETS = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 },
        aspectRatio: { ideal: 1.7777777778 }
    };

    const forceConstraints = (constraints, isScreen) => {
        if (!constraints) return constraints;
        
        // Clone to avoid side-effects during modification
        const c = JSON.parse(JSON.stringify(constraints));

        // Force Audio Quality
        if (c.audio) {
            if (typeof c.audio === 'boolean' || typeof c.audio === 'object') {
                c.audio = typeof c.audio === 'object' ? { ...c.audio, ...AUDIO_RAW_TARGETS } : AUDIO_RAW_TARGETS;
            }
        }

        // Force Video/Screen Quality
        if (c.video) {
            // If it's a screen share, we force 1080p60. 
            // If it's a webcam, we prioritize 60fps but let resolution be flexible to avoid hardware errors.
            const videoBase = isScreen ? VIDEO_HQ_TARGETS : { frameRate: { ideal: 60 } };
            c.video = typeof c.video === 'object' ? { ...c.video, ...videoBase } : videoBase;
        }

        return c;
    };

    // --- INTERCEPTION LAYER ---

    if (navigator.mediaDevices) {
        // 1. Intercept getUserMedia (Webcam/Mic)
        const originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async function(constraints) {
            console.log('%c[MediaOverride] Intercepting getUserMedia (Mic/Cam)', 'color: #00ff00; font-weight: bold;');
            return originalGUM(forceConstraints(constraints, false));
        };

        // 2. Intercept getDisplayMedia (Screen Share)
        const originalGDM = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async function(constraints) {
            console.log('%c[MediaOverride] Intercepting getDisplayMedia (Screen)', 'color: #00d4ff; font-weight: bold;');
            return originalGDM(forceConstraints(constraints, true));
        };
    }

    console.log('%c[Partner] Global Overrider Active. Logic: 1080p60 & Raw Audio enforced browser-wide.', 'color: #fff; background: #222; padding: 3px;');
})();

