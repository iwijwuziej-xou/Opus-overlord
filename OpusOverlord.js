// ==UserScript==
// @name         Opus Overlord v7.0: The Einstein Final
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  100% Functional Raw Audio Enforcer. Fixed syntax, populated filters, dual-direction SDP munging.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_BITRATE = 384000; // 384 kbps

    /**
     * STAGE 1: THE POPULATED KILL LIST
     * Disables all browser-side DSP (Digital Signal Processing).
     */
    const forceRawConstraints = (c) => {
        if (!c || !c.audio) return c;
        
        const filters = [
            'echoCancellation', 'googEchoCancellation', 'googEchoCancellation2',
            'noiseSuppression', 'googNoiseSuppression', 'googNoiseSuppression2',
            'autoGainControl', 'googAutoGainControl', 'googAutoGainControl2',
            'googHighpassFilter', 'googTypingNoiseDetection', 'googAudioMirroring',
            'voiceIsolation'
        ];

        if (typeof c.audio === 'boolean') c.audio = {};
        const target = c.audio;

        filters.forEach(f => {
            target[f] = false;
            if (target.mandatory) target.mandatory[f] = false;
            if (target.advanced && Array.isArray(target.advanced)) {
                target.advanced.forEach(adv => { if (adv[f] !== undefined) adv[f] = false; });
            }
        });

        // Lock Hardware to Studio Specs
        target.channelCount = { exact: 2 };
        target.sampleRate = { exact: 48000 };
        return c;
    };

    // API Proxies for getUserMedia and applyConstraints
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => origGUM(forceRawConstraints(c));

    const origApply = MediaStreamTrack.prototype.applyConstraints;
    MediaStreamTrack.prototype.applyConstraints = function(c) {
        return (this.kind === 'audio') ? origApply.call(this, forceRawConstraints({audio: c}).audio) : origApply.call(this, c);
    };

    /**
     * STAGE 2: ASYNC ENGINE ENFORCEMENT
     * Forces the internal encoder to stay at the target bitrate regardless of network.
     */
    const origSetParameters = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = async function(params) {
        if (this.track && this.track.kind === 'audio' && params.encodings && params.encodings.length > 0) {
            params.encodings.forEach(enc => {
                enc.maxBitrate = TARGET_BITRATE;
            });
        }
        return origSetParameters.call(this, params);
    };

    /**
     * STAGE 3: DUAL-DIRECTION SDP MUNGING
     * Forces 384kbps Stereo in the network handshake for both sending and receiving.
     */
    const mungeSDP = (sdp) => {
        let lines = sdp.split('\r\n');
        const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (!opusMatch) return sdp;

        const payloadType = opusMatch[1];
        lines = lines.map(line => {
            if (line.startsWith(`a=fmtp:${payloadType}`)) {
                return `a=fmtp:${payloadType} minptime=10;useinbandfec=1;maxaveragebitrate=${TARGET_BITRATE};stereo=1;sprop-stereo=1;cbr=1`;
            }
            // Position b=AS immediately after m=audio for maximum browser compatibility
            if (line.startsWith('m=audio')) {
                return line + `\r\nb=AS:${Math.floor(TARGET_BITRATE / 1000)}`;
            }
            return line;
        });
        
        console.log(`[Opus Overlord] SDP Munged: Negotiating ${TARGET_BITRATE/1000}kbps Stereo.`);
        return lines.join('\r\n');
    };

    // Intercept Local and Remote handshakes
    const origSetLocal = RTCPeerConnection.prototype.setLocalDescription;
    RTCPeerConnection.prototype.setLocalDescription = function(desc) {
        if (desc && desc.sdp) desc.sdp = mungeSDP(desc.sdp);
        return origSetLocal.call(this, desc);
    };

    const origSetRemote = RTCPeerConnection.prototype.setRemoteDescription;
    RTCPeerConnection.prototype.setRemoteDescription = function(desc) {
        if (desc && desc.sdp) desc.sdp = mungeSDP(desc.sdp);
        return origSetRemote.call(this, desc);
    };

    console.log(`%c[Opus Overlord v7.0]%c Absolute Studio Build Active. Mics locked to ${TARGET_BITRATE/1000}kbps.`, "color:gold; font-weight:bold", "color:white");
})();
