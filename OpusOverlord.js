// ==UserScript==
// @name         Opus Overlord v9.1: Scarlett Absolute Studio
// @namespace    http://tampermonkey.net/
// @version      9.1
// @description  510kbps CBR Stereo Mirroring + Total Filter Kill for Scarlett/NT1.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const BITRATE_CEILING = 510000;

    const annihilateFilters = (c) => {
        if (!c || !c.audio) return c;
        const killList = [
            'echoCancellation', 'googEchoCancellation', 'noiseSuppression', 
            'googNoiseSuppression', 'autoGainControl', 'googAutoGainControl',
            'googHighpassFilter', 'voiceIsolation', 'googAudioMirroring', 'googNoiseReduction'
        ];

        if (typeof c.audio === 'boolean') c.audio = {};
        killList.forEach(f => {
            c.audio[f] = false;
            if (c.audio.advanced) c.audio.advanced.forEach(a => a[f] = false);
        });

        // LOCK FOR SCARLETT + NT1 (Input 1 Mirroring)
        c.audio.channelCount = { exact: 2 };
        c.audio.sampleRate = { exact: 48000 };
        c.audio.latency = 0;
        
        return c;
    };

    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => origGUM(annihilateFilters(c));

    const origSetParameters = RTCRtpSender.prototype.setParameters;
    RTCRtpSender.prototype.setParameters = async function(params) {
        if (this.track && this.track.kind === 'audio' && params.encodings) {
            params.encodings.forEach(enc => {
                enc.maxBitrate = BITRATE_CEILING;
                enc.priority = "high";
                enc.networkPriority = "high";
                if (enc.voiceActivityDetection !== undefined) enc.voiceActivityDetection = false;
            });
        }
        return origSetParameters.call(this, params);
    };

    const mungeSDP = (sdp) => {
        if (!sdp) return sdp;
        let lines = sdp.split('\r\n');
        const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
        if (!opusMatch) return sdp;
        const pt = opusMatch[1];

        return lines.map(line => {
            if (line.startsWith(`a=fmtp:${pt}`)) {
                // Keep FEC enabled as a safety net; the high bitrate ensures no quality loss.
                return `a=fmtp:${pt} minptime=10;useinbandfec=1;maxaveragebitrate=${BITRATE_CEILING};stereo=1;sprop-stereo=1;cbr=1`;
            }
            if (line.startsWith('m=audio')) return line + `\r\nb=AS:${Math.floor(BITRATE_CEILING / 1000)}`;
            return line;
        }).join('\r\n');
    };

    const pcProto = RTCPeerConnection.prototype;
    const origSetLocal = pcProto.setLocalDescription;
    const origSetRemote = pcProto.setRemoteDescription;

    pcProto.setLocalDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetLocal.call(this, d); };
    pcProto.setRemoteDescription = function(d) { if (d && d.sdp) d.sdp = mungeSDP(d.sdp); return origSetRemote.call(this, d); };

    console.log(`%c[Opus Overlord v9.1]%c 510kbps DUAL-MONO SCARLETT MODE ACTIVE.`, "color:gold; font-weight:bold", "color:cyan");
})();
