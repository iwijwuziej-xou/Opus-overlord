// ==UserScript==
// @name         Opus Overlord: Raw Audio & 384kbps Bitrate Enforcer
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Disables all filters and forces 384kbps Opus bitrate via real-time SDP injection.
// @author       JavaScript Einstein
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const TARGET_BITRATE = 384000; // 384 kbps
    const OPUS_MAX_BITRATE = 510000; // Technical ceiling

    /**
     * STAGE 1: ARCHITECTURAL FILTER NEUTRALIZATION
     * Recursively strips all processing constraints from any media request.
     */
    const cleanConstraints = (c) => {
        if (!c ||!c.audio) return c;
        const filters =;

        if (typeof c.audio === 'boolean') c.audio = {};
        filters.forEach(f => {
            c.audio[f] = false;
            if (c.audio.mandatory) c.audio.mandatory[f] = false;
            if (c.audio.ideal && c.audio.ideal[f]!== undefined) c.audio.ideal[f] = false;
            if (c.audio.exact && c.audio.exact[f]!== undefined) c.audio.exact[f] = false;
        });

        // Request maximum fidelity channels/sample rate
        c.audio.channelCount = 2; // Stereo
        c.audio.sampleRate = 48000; // 48kHz High-Res
        return c;
    };

    // Patch getUserMedia
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => origGUM(cleanConstraints(c));

    // Patch applyConstraints
    const origApply = MediaStreamTrack.prototype.applyConstraints;
    MediaStreamTrack.prototype.applyConstraints = function(c) {
        return (this.kind === 'audio')? origApply.call(this, cleanConstraints({audio: c}).audio) : origApply.call(this, c);
    };

    /**
     * STAGE 2: SDP BITRATE INJECTION
     * Intercepts the WebRTC handshake to force high-bitrate Opus parameters.
     */
    const injectHighBitrate = (sdp) => {
        let lines = sdp.split('\r\n');
        
        // 1. Locate the Opus Payload Type (usually 111)
        const opusRegex = /a=rtpmap:(\d+) opus\/48000\/2/;
        const match = sdp.match(opusRegex);
        if (!match) return sdp;

        const payloadType = match[1];

        lines = lines.map(line => {
            // 2. Modify FMTP line to inject max bitrate and stereo
            if (line.startsWith(`a=fmtp:${payloadType}`)) {
                // Ensure stereo=1 and inject our target bitrate
                if (!line.includes('maxaveragebitrate')) {
                    line += `;maxaveragebitrate=${TARGET_BITRATE};stereo=1;sprop-stereo=1;cbr=1;useinbandfec=1`;
                } else {
                    line = line.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${TARGET_BITRATE}`);
                }
            }
            return line;
        });

        // 3. Inject "b=AS" (Application Specific) bandwidth modifier under the audio section
        const audioIndex = lines.findIndex(l => l.startsWith('m=audio'));
        if (audioIndex!== -1) {
            // Standard bandwidth limit in kbps (384)
            const bandwidthLine = `b=AS:${Math.floor(TARGET_BITRATE / 1000)}`;
            // Check if a 'b=AS' line already exists shortly after 'm=audio'
            if (!lines[audioIndex + 1].startsWith('b=AS')) {
                lines.splice(audioIndex + 1, 0, bandwidthLine);
            } else {
                lines[audioIndex + 1] = bandwidthLine;
            }
        }

        return lines.join('\r\n');
    };

    /**
     * STAGE 3: PROTOTYPE MONKEY-PATCHING
     * Hijacks the RTCPeerConnection methods to ensure modified SDP is used.
     */
    const origSetLocal = RTCPeerConnection.prototype.setLocalDescription;
    RTCPeerConnection.prototype.setLocalDescription = function(desc) {
        if (desc && desc.sdp && desc.type === 'offer') {
            desc.sdp = injectHighBitrate(desc.sdp);
        }
        return origSetLocal.call(this, desc);
    };

    const origCreateOffer = RTCPeerConnection.prototype.createOffer;
    RTCPeerConnection.prototype.createOffer = function(options) {
        return origCreateOffer.call(this, options).then(offer => {
            offer.sdp = injectHighBitrate(offer.sdp);
            return offer;
        });
    };

    console.log(`[Opus Overlord] System Primed. Target: ${TARGET_BITRATE/1000}kbps Raw Audio.`);
})();
