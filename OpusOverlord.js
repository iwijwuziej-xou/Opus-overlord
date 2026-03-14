// ==UserScript==
// @name         Opus Overlord v13.0: Full Studio
// @namespace    http://tampermonkey.net/
// @version      13.0
// @description  Universal 1080p60 Cam/Screen + 384k Stereo + Total Filter Kill.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const AUDIO_BITRATE = 384000;
    const VIDEO_BITRATE = 8000000; // 8Mbps for High-Definition Camera/Screen

    // --- 1. THE UNIVERSAL HARDWARE HIJACK (Mic, Cam, Screen) ---
    const applyGodModeConstraints = (c) => {
        // AUDIO: Complete Filter Annihilation (All-In-One)
        if (c.audio) {
            const studioAudio = {
                echoCancellation: false, noiseSuppression: false, autoGainControl: false,
                googEchoCancellation: false, googAutoGainControl: false, googNoiseSuppression: false,
                googHighpassFilter: false, googTypingNoiseDetection: false, googAudioMirroring: false,
                googNoiseReduction: false, googExperimentalEchoCancellation: false,
                voiceIsolation: 'none', channelCount: { exact: 2 }, sampleRate: { exact: 48000 },
                latency: 0
            };
            c.audio = typeof c.audio === 'object' ? Object.assign(c.audio, studioAudio) : studioAudio;
        }
        
        // VIDEO/CAMERA/SCREEN: Force 1080p 60FPS
        if (c.video) {
            const studioVideo = {
                width: { ideal: 1920, max: 3840 },  // Supports up to 4K if hardware allows
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 60, min: 60 },
                aspectRatio: 1.777777778, // Pro 16:9
                displaySurface: "monitor"
            };
            c.video = typeof c.video === 'object' ? Object.assign(c.video, studioVideo) : studioVideo;
        }
        return c;
    };

    // Hijack Mic & Camera
    navigator.mediaDevices.getUserMedia = (orig => function(c) { 
        return orig.call(this, applyGodModeConstraints(c)); 
    })(navigator.mediaDevices.getUserMedia);

    // Hijack Screenshare
    navigator.mediaDevices.getDisplayMedia = (orig => function(c) { 
        return orig.call(this, applyGodModeConstraints(c)); 
    })(navigator.mediaDevices.getDisplayMedia);

    // --- 2. THE SDP JUGGERNAUT (Bitrate & Stereo Engine) ---
    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        return sdp.split('\r\n').map(line => {
            // AUDIO: Force 384k, Stereo, No FEC/DTX
            if (line.includes('a=fmtp:') && line.includes('opus')) {
                let m = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${AUDIO_BITRATE}`)
                            .replace(/maxplaybackrate=\d+/, `maxplaybackrate=48000`);
                if (!m.includes('stereo=1')) {
                    m += `;stereo=1;sprop-stereo=1;cbr=1;useinbandfec=0;usedtx=0;sprop-maxcapturerate=48000`;
                }
                return m;
            }
            // VIDEO: Force 8Mbps pipe for BOTH Cam and Screenshare
            if (line.startsWith('m=video')) {
                return line + `\r\nb=AS:${Math.floor(VIDEO_BITRATE / 1000)}`;
            }
            // Increase initial camera bandwidth
            if (line.includes('x-google-start-bitrate')) {
                return line.replace(/x-google-start-bitrate=\d+/, `x-google-start-bitrate=${Math.floor(VIDEO_BITRATE / 1000)}`);
            }
            return line;
        }).join('\r\n');
    };

    const pcProto = RTCPeerConnection.prototype;
    const wrap = (fn) => function(desc) {
        if (desc && desc.sdp) desc.sdp = mungeSDP(desc.sdp);
        return fn.call(this, desc);
    };

    pcProto.setLocalDescription = wrap(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrap(pcProto.setRemoteDescription);

    console.log("%c[v13.0]%c GLOBAL GOD-MODE ACTIVE: Cam/Screen 1080p60 | 384k Stereo | All Filters Dead.", "color:gold;font-weight:bold", "color:white");
})();
