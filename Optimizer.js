// ==UserScript==
// @name         WebRTC Pure Raw Capture (No Filters, No DSP)
// @namespace    JavaScript Einstein
// @version      1.0
// @description  Disable ALL audio filters at the getUserMedia/getDisplayMedia engine level
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Raw audio constraints: disable ALL browser DSP
    const rawAudio = {
        audio: {
            sampleRate: 48000,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,

            // Disable Chrome legacy DSP flags
            googEchoCancellation: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googTypingNoiseDetection: false,
            googAudioMirroring: false
        }
    };

    // Raw video constraints (no filters, just clean capture)
    const rawVideo = {
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 }
        }
    };

    // Wrap getUserMedia
    function wrapGetUserMedia(md) {
        if (!md || !md.getUserMedia) return;
        const orig = md.getUserMedia.bind(md);

        md.getUserMedia = function(constraints = {}) {
            if (constraints.audio === true) constraints.audio = {};
            if (constraints.video === true) constraints.video = {};

            // Merge raw audio + raw video
            constraints = Object.assign({}, constraints, rawAudio, rawVideo);

            return orig(constraints);
        };
    }

    // Wrap getDisplayMedia
    function wrapGetDisplayMedia(md) {
        if (!md || !md.getDisplayMedia) return;
        const orig = md.getDisplayMedia.bind(md);

        md.getDisplayMedia = function(constraints = {}) {
            if (constraints.video === true || constraints.video === undefined)
                constraints.video = {};

            constraints = Object.assign({}, constraints, rawVideo);

            return orig(constraints);
        };
    }

    // Install wrappers early
    const mdDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'mediaDevices');
    if (mdDesc && mdDesc.get) {
        Object.defineProperty(Navigator.prototype, 'mediaDevices', {
            configurable: true,
            get() {
                const md = mdDesc.get.call(this);
                if (md && !md.__raw_wrapped) {
                    wrapGetUserMedia(md);
                    wrapGetDisplayMedia(md);
                    md.__raw_wrapped = true;
                }
                return md;
            }
        });
    } else if (navigator.mediaDevices) {
        wrapGetUserMedia(navigator.mediaDevices);
        wrapGetDisplayMedia(navigator.mediaDevices);
    }

})();
