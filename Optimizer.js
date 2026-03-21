// ==UserScript==
// @name         Media Stream Constraints Overrider
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Forces raw stereo audio and 1080p60 screen capture
// @author       Partner
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Helper to deep merge or override constraints
    const modifyConstraints = (constraints, isDisplay = false) => {
        if (!constraints) constraints = {};

        // 1. Handle Audio Constraints (Specific to getUserMedia)
        if (constraints.audio) {
            const audioDefaults = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                googAudioMirroring: true, // Specific for stereo/mirroring in Chromium
                channelCount: 2
            };

            if (typeof constraints.audio === 'boolean') {
                constraints.audio = audioDefaults;
            } else {
                Object.assign(constraints.audio, audioDefaults);
            }
        }

        // 2. Handle Video Constraints (Specific to getDisplayMedia)
        if (isDisplay) {
            const videoDefaults = {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 60, max: 60 }
            };

            if (!constraints.video || typeof constraints.video === 'boolean') {
                constraints.video = videoDefaults;
            } else {
                Object.assign(constraints.video, videoDefaults);
            }
        }

        return constraints;
    };

    // Override getUserMedia (Camera/Mic)
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
        console.log('%c[MediaOverride] Modifying getUserMedia constraints...', 'color: #00ff00');
        const newConstraints = modifyConstraints(constraints);
        return originalGetUserMedia(newConstraints);
    };

    // Override getDisplayMedia (Screen Share)
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async (constraints) => {
        console.log('%c[MediaOverride] Modifying getDisplayMedia constraints...', 'color: #00ff00');
        const newConstraints = modifyConstraints(constraints, true);
        return originalGetDisplayMedia(newConstraints);
    };

    console.log('Media Stream Overrider Active: Filters Disabled & 1080p60 Enabled.');
})();
