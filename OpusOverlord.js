// ==UserScript==
// @name         Opus Overlord v10.3: Silent HD Juggernaut
// @namespace    http://tampermonkey.net/
// @version      10.3
// @description  Internal 510kbps Force. No HUD. Full Studio Fidelity for Scarlett/NT1.
// @author       JavaScript Einstein
// @match        *://*.instagram.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const HD_BITRATE = 510000;

    // 1. HARDWARE PURITY: Bypass all "Trash" processing
    const applyStudioConstraints = (c) => {
        const studioSettings = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googHighpassFilter: false,
            googNoiseSuppression: false,
            googAutoGainControl: false,
            channelCount: { exact: 2 },
            sampleRate: { exact: 48000 },
            latency: 0
        };
        if (c.audio) {
            if (typeof c.audio === 'object') Object.assign(c.audio, studioSettings);
            else c.audio = studioSettings;
        }
        return c;
    };

    navigator.mediaDevices.getUserMedia = (orig => function(c) {
        return orig.call(this, applyStudioConstraints(c));
    })(navigator.mediaDevices.getUserMedia);

    // 2. THE SDP REWRITE: Kill the 20k limit from the dump
    const forceHDBitrate = (sdp) => {
        if (!sdp || !sdp.includes('opus')) return sdp;

        return sdp.split('\r\n').map(line => {
            if (line.includes('a=fmtp:')) {
                // Remove Instagram's 20000 limit and 16000 playback cut
                let m = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${HD_BITRATE}`);
                m = m.replace(/maxplaybackrate=\d+/, `maxplaybackrate=48000`);
                
                // Inject Studio Parameters: Stereo, CBR, and Ultra Bitrate
                if (!m.includes('maxaveragebitrate')) {
                    m += `;maxaveragebitrate=${HD_BITRATE};stereo=1;sprop-stereo=1;cbr=1;minptime=10`;
                }
                return m;
            }
            // Allocate Bandwidth at the Media level
            if (line.startsWith('m=audio')) {
                return line + `\r\nb=AS:${Math.floor(HD_BITRATE / 1000)}`;
            }
            return line;
        }).join('\r\n');
    };

    // 3. ENGINE HIJACK: Override both Local and Remote commands
    const pcProto = RTCPeerConnection.prototype;
    const wrapSDP = (fn) => function(description) {
        if (description && description.sdp) {
            description.sdp = forceHDBitrate(description.sdp);
        }
        return fn.call(this, description);
    };

    pcProto.setLocalDescription = wrapSDP(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrapSDP(pcProto.setRemoteDescription);

    console.log("%c[Opus Overlord v10.3]%c Internal HD Engine Active. 510kbps Enforced.", "color:gold;font-weight:bold", "color:white");
})();
