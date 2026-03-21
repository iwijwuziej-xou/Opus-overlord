// ==UserScript==
// @name         Media Stream Overrider (Screen/Mic/Cam)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Targets Screen Share (1080p60) and Mic/Cam (Raw Filterless)
// @author       Partner
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 1. RAW AUDIO LOGIC (Mic/Cam)
    // We disable every software processing flag Chromium has.
    const RAW_AUDIO = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        googAudioMirroring: true,
        googAutoGainControl: false,
        googAutoGainControl2: false,
        googEchoCancellation: false,
        googHighpassFilter: false,
        googNoiseSuppression: false,
        googTypingNoiseDetection: false,
        googNoiseReduction: false,
        channelCount: 2, // Force Stereo
        latency: 0
    };

    // 2. HQ VIDEO LOGIC (Screen Share)
    // We push for 1080p and 60fps specifically.
    const HQ_SCREEN = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 },
        aspectRatio: { ideal: 1.7777777778 }
    };

    const modify = (constraints, isScreen) => {
        if (!constraints) return constraints;

        // Apply Audio Overrides
        if (constraints.audio) {
            if (typeof constraints.audio === 'boolean') {
                constraints.audio = RAW_AUDIO;
            } else {
                Object.assign(constraints.audio, RAW_AUDIO);
            }
        }

        // Apply Screen Video Overrides
        if (isScreen && constraints.video) {
            if (typeof constraints.video === 'boolean') {
                constraints.video = HQ_SCREEN;
            } else {
                Object.assign(constraints.video, HQ_SCREEN);
            }
        }

        return constraints;
    };

    // --- INTERCEPTORS ---

    if (navigator.mediaDevices) {
        // Target: Mic and Camera
        const ogGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (c) => {
            console.log('%c[MediaOverride] Targeting Mic/Cam...', 'color: #00ff00');
            return ogGUM(modify(c, false));
        };

        // Target: Screen Share
        const ogGDM = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async (c) => {
            console.log('%c[MediaOverride] Targeting Screen Share (1080p60)...', 'color: #00d4ff');
            return ogGDM(modify(c, true));
        };
    }

    console.log('%c[MediaOverride] Ready. Monitoring Screen, Mic, and Camera requests.', 'font-weight: bold; color: #bada55');
})();

