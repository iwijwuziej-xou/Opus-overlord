// ==UserScript==
// @name         Opus Overlord v8.0: 510kbps Absolute Ceiling
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  Forces the absolute technical limit of Opus (510kbps) via Engine-Level hijacking.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // The technical maximum for Opus in WebRTC/Chromium
    const MAX_OPUS_BITRATE = 510000; 

    /**
     * STAGE 1: HARDWARE TRANSPARENCY
     * Disables every filter that could muffle the NT1's capsule.
     */
    const forceRawConstraints = (c) => {
        if (!c || !c.audio) return c;
        const filters = [
            'echoCancellation', 'googEchoCancellation', 'noiseSuppression', 
            'googNoiseSuppression', 'autoGainControl', 'googAutoGainControl',
            'googHighpassFilter', 'voiceIsolation', 'googAudioMirroring',
            'googNoiseReduction'
        ];

        if (typeof c.audio === 'boolean') c.audio = {};
        filters.forEach(f => {
            c.audio[f] = false;
            if (c.audio.advanced) c.audio.advanced.forEach(a => a[f] = false);
        });

        // MANDATORY STUDIO SPECS
        c.audio.channelCount = { exact: 2 }; // Forces Scarlett Stereo Buffer
        c.audio.sampleRate = { exact: 48000 }; // Standard High-Res WebRTC
        return c;
    };

    // Proxy the MediaDevices API
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => origGUM(forceRawConstraints(c));

    /**
     * STAGE 2: ENGINE-LEVEL ENFORCEMENT
     * This is the "Overlord" hook that locks the bitrate at 510kbps.
     */
    const origSetParameters = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = async function(params) {
        if (this.track && this.track.kind === 'audio' && params.encodings) {
            params.encodings.forEach(enc => {
                // Lock the encoder to the 510kbps ceiling
                enc.maxBitrate = MAX_OPUS_BITRATE;
                enc.priority = "high"; // Marks packets as high priority
                enc.networkPriority = "high";
            });
        }
        return origSetParameters.call(this, params);
    };

    /**
     * STAGE 3: SDP HANDSHAKE HIJACK
     * Rewrites the network contract to broadcast 510kbps CBR Stereo.
     */
    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        let lines = sdp.split('\r\n');
        const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (!opusMatch) return sdp;
        const pt = opusMatch[1];

        return lines.map(line => {
            if (line.startsWith(`a=fmtp:${pt}`)) {
                // maxaveragebitrate=510000; cbr=1 (Constant Bitrate)
                return `a=fmtp:${pt} minptime=10;useinbandfec=1;maxaveragebitrate=${MAX_OPUS_BITRATE};stereo=1;sprop-stereo=1;cbr=1`;
            }
            // Application Specific Bandwidth (b=AS)
            if (line.startsWith('m=audio')) {
                return line + `\r\nb=AS:${Math.floor(MAX_OPUS_BITRATE / 1000)}`;
            }
            return line;
        }).join('\r\n');
    };

    // Intercept handshakes
    const pcProto = RTCPeerConnection.prototype;
    const origSetLocal = pcProto.setLocalDescription;
    const origSetRemote = pcProto.setRemoteDescription;

    pcProto.setLocalDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetLocal.call(this, d); };
    pcProto.setRemoteDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetRemote.call(this, d); };

    console.log(`%c[Opus Overlord v8.0]%c 510kbps Absolute Studio Mode Active.`, "color:cyan; font-weight:bold", "color:white");
})();
