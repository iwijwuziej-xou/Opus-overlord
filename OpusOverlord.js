// ==UserScript==
// @name         Opus Overlord v11.0: Universal Studio Force
// @namespace    http://tampermonkey.net/
// @version      11.0
// @description  Disables all filters & forces 384kbps Stereo globally on all mic-using sites.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const UNIVERSAL_BITRATE = 384000;

    // --- 1. GLOBAL FILTER ANNIHILATION ---
    const studioConstraints = (c) => {
        const killAll = {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googEchoCancellation: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googHighpassFilter: false,
            googTypingNoiseDetection: false,
            googAudioMirroring: false,
            voiceIsolation: 'none',
            channelCount: { exact: 2 },
            sampleRate: { exact: 48000 },
            latency: 0
        };

        if (c.audio) {
            if (typeof c.audio === 'object') {
                Object.assign(c.audio, killAll);
            } else {
                c.audio = killAll;
            }
        }
        return c;
    };

    // Hijack getUserMedia for all websites
    navigator.mediaDevices.getUserMedia = (orig => function(c) {
        console.log("%c[v11.0]%c Global Studio Constraints Applied.", "color:#00ffcc;font-weight:bold", "color:white");
        return orig.call(this, studioConstraints(c));
    })(navigator.mediaDevices.getUserMedia);

    // --- 2. GLOBAL SDP BITRATE INJECTION ---
    const mungeSDP = (sdp) => {
        if (!sdp || !sdp.includes('opus')) return sdp;
        return sdp.split('\r\n').map(line => {
            if (line.includes('a=fmtp:')) {
                // Wipe limits and force 384kbps + Stereo + No FEC
                let m = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${UNIVERSAL_BITRATE}`);
                m = m.replace(/maxplaybackrate=\d+/, `maxplaybackrate=48000`);
                if (!m.includes('stereo=1')) {
                    m += `;stereo=1;sprop-stereo=1;cbr=1;useinbandfec=0;maxaveragebitrate=${UNIVERSAL_BITRATE}`;
                }
                return m;
            }
            if (line.startsWith('m=audio')) {
                return line + `\r\nb=AS:${Math.floor(UNIVERSAL_BITRATE / 1000)}`;
            }
            return line;
        }).join('\r\n');
    };

    // Intercept PeerConnection negotiations globally
    const pcProto = RTCPeerConnection.prototype;
    const wrap = (fn) => function(desc) {
        if (desc && desc.sdp) {
            desc.sdp = mungeSDP(desc.sdp);
        }
        return fn.call(this, desc);
    };

    pcProto.setLocalDescription = wrap(pcProto.setLocalDescription);
    pcProto.setRemoteDescription = wrap(pcProto.setRemoteDescription);

})();
