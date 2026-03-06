// ==UserScript==
// @name         Opus Overlord v9.0: Absolute Studio Endgame
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  510kbps CBR Stereo + Total Filter Annihilation for Scarlett 2i2/NT1.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const BITRATE_CEILING = 510000; // 510kbps (Opus Limit)

    /**
     * STAGE 1: SIGNAL PURITY (THE KILL LIST)
     * Kills every filter that causes "muffled" or "robotic" audio.
     */
    const annihilateFilters = (c) => {
        if (!c || !c.audio) return c;
        
        const killList = [
            'echoCancellation', 'googEchoCancellation', 'googEchoCancellation2',
            'noiseSuppression', 'googNoiseSuppression', 'googNoiseSuppression2',
            'autoGainControl', 'googAutoGainControl', 'googAutoGainControl2',
            'googHighpassFilter', 'googTypingNoiseDetection', 'googAudioMirroring',
            'voiceIsolation', 'googNoiseReduction'
        ];

        if (typeof c.audio === 'boolean') c.audio = {};
        
        killList.forEach(f => {
            c.audio[f] = false;
            if (c.audio.advanced) c.audio.advanced.forEach(a => a[f] = false);
        });

        // FORCE STUDIO HARDWARE SPECS
        c.audio.channelCount = { exact: 2 }; // Forces Stereo Handshake
        c.audio.sampleRate = { exact: 48000 }; // High-Res 48kHz
        c.audio.latency = 0; // Requests lowest possible buffer
        
        return c;
    };

    // Proxy MediaDevices
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => origGUM(annihilateFilters(c));

    /**
     * STAGE 2: ENGINE-LEVEL SATURATION
     * Forces the Brave/Chromium encoder to stay at 510kbps.
     */
    const origSetParameters = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = async function(params) {
        if (this.track && this.track.kind === 'audio' && params.encodings) {
            params.encodings.forEach(enc => {
                enc.maxBitrate = BITRATE_CEILING;
                enc.priority = "high"; // Packet prioritization
                enc.networkPriority = "high";
                // Disable VAD (Voice Activity Detection) to keep bitrate constant
                if (enc.voiceActivityDetection !== undefined) enc.voiceActivityDetection = false;
            });
        }
        return origSetParameters.call(this, params);
    };

    /**
     * STAGE 3: SDP REWRITE (THE HANDSHAKE)
     * Munges the network contract for 510kbps CBR Stereo.
     */
    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        let lines = sdp.split('\r\n');
        const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (!opusMatch) return sdp;
        const pt = opusMatch[1];

        return lines.map(line => {
            if (line.startsWith(`a=fmtp:${pt}`)) {
                // Force CBR=1 and Stereo=1 to prevent mono summing
                return `a=fmtp:${pt} minptime=10;useinbandfec=1;maxaveragebitrate=${BITRATE_CEILING};stereo=1;sprop-stereo=1;cbr=1`;
            }
            // Application Specific Bandwidth (b=AS) - Placed under audio media
            if (line.startsWith('m=audio')) {
                return line + `\r\nb=AS:${Math.floor(BITRATE_CEILING / 1000)}`;
            }
            return line;
        }).join('\r\n');
    };

    // Intercept handshakes in both directions
    const pcProto = RTCPeerConnection.prototype;
    const origSetLocal = pcProto.setLocalDescription;
    const origSetRemote = pcProto.setRemoteDescription;

    pcProto.setLocalDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetLocal.call(this, d); };
    pcProto.setRemoteDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetRemote.call(this, d); };

    console.log(`%c[Opus Overlord v9.0]%c ABSOLUTE STUDIO DOMINANCE ACTIVE (510kbps).`, "color:gold; font-weight:bold; font-size: 14px", "color:cyan");
})();
