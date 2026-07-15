// ==UserScript==
// @name         Chromium Windows 11 Ultimate Mic Optimizer
// @namespace    http://tampermonkey.net/
// @version      17.0.1
// @description  v17.0.1: Stable release. Disables software noise filters without overriding hardware-native capabilities.
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const PATCHED = Symbol('ironBlockChromiumPatched');

    /**
     * CORE FILTER BYPASS
     * Strips software-side processing (Noise Suppression, AGC, Echo Cancellation)
     * which are the primary causes of audio "choppiness."
     */
    const forceAudioFilterFlags = (o) => {
        if (!o || typeof o !== 'object') return o;

        // Standard W3C Filter Kills
        o.echoCancellation = false;
        o.noiseSuppression = false;
        o.autoGainControl = false;
        o.voiceIsolation = false;
        
        // Chromium/Blink Engine Hook Kills
        o.googEchoCancellation = false;
        o.googAutoGainControl = false;
        o.googAutoGainControl2 = false;
        o.googNoiseSuppression = false;
        o.googHighpassFilter = false;
        o.googTypingNoiseDetection = false;
        o.googNoiseReduction = false;
        o.googAudioMirroring = false;
        
        return o;
    };

    /**
     * STABLE DEVICE CAPTURE
     * We strip out rigid latency/sampleSize constraints from v17.0.0
     * which were causing the mic hardware to fail initialization.
     */
    const patchGetUserMedia = () => {
        if (!win.navigator?.mediaDevices?.getUserMedia) return;
        const md = win.navigator.mediaDevices;
        const orig = md.getUserMedia.bind(md);
        if (orig[PATCHED]) return;

        md.getUserMedia = (c) => {
            if (c && c.audio) {
                if (typeof c.audio === 'object') {
                    forceAudioFilterFlags(c.audio);
                    
                    // STABILITY FIX: Remove these hard constraints
                    // They force the hardware into a state it may not support,
                    // causing the "No Audio" bug.
                    delete c.audio.latency;
                    delete c.audio.sampleSize;
                }
            }
            return orig(c);
        };
        md.getUserMedia[PATCHED] = true;
    };

    // Initialize the patch sequence
    try {
        patchGetUserMedia();
    } catch (e) {
        console.error("Mic Optimizer v17.0.1 failed to initialize:", e);
    }
})();
