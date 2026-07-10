// ==UserScript==
// @name         Chromium Windows 11 Ultimate Mic Optimizer
// @namespace    http://tampermonkey.net/
// @version      17.0.0
// @description  Hard-locked uncompressed 48kHz/384kbps CBR pipeline for Win11 Chromium. All hardware guards removed.
// @match        *://*/*
// @grant        unsafeWindow
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const PATCHED = Symbol('ironBlockChromiumPatched');

    // Ultimate hardware pipeline bypass: Strips all Chromium-engine audio manipulation layers
    const forceAudioFilterFlags = (o) => {
        if (!o || typeof o !== 'object') return o;
        
        // Disable standard W3C spec audio processing
        o.echoCancellation = false;
        o.noiseSuppression = false;
        o.autoGainControl = false;
        o.voiceIsolation = false;
        
        // Explicitly kill the underlying Google Chromium/Blink audio engine hooks
        o.googEchoCancellation = false;
        o.googAutoGainControl = false;
        o.googAutoGainControl2 = false;
        o.googNoiseSuppression = false;
        o.googHighpassFilter = false;
        o.googTypingNoiseDetection = false;
        o.googNoiseReduction = false;
        o.googAudioMirroring = false;
        
        // Windows 11 WASAPI / CoreAudio pipeline parameter enforcement
        o.volume = 1.0;                  // Maxes out the browser-level mixing slider
        o.latency = 0.005;               // Forces low-latency audio path constraints (5ms target)
        o.channelCount = { ideal: 2 };   // Forces stereo processing down the WebRTC track
        
        return o;
    };

    const OPUS_TARGET_BITRATE = 384000; // Peak limit of the physical Opus codec spec
    const OPUS_SAMPLE_RATE = 48000;    // Standard studio definition clock rate

    // SDP Munging Engine: Rewrites session descriptions directly at the browser layer
    const upgradeSDP = (sdp) => {
        if (!sdp || typeof sdp !== 'string') return sdp;
        const lines = sdp.split('\r\n');
        const opusPT = new Set();

        // Locate the unique dynamic payload type (PT) mapping assigned to Opus by the server
        for (const l of lines) {
            if (l.startsWith('a=rtpmap:') && /opus\/48000/i.test(l)) {
                const pt = l.split(' ')[0].split(':')[1];
                if (pt) opusPT.add(pt);
            }
        }
        if (!opusPT.size) return sdp;

        const out = lines.map((l) => {
            if (!l.startsWith('a=fmtp:')) return l;
            const m = l.match(/^a=fmtp:(\d+)\s+(.*)$/);
            if (!m) return l;
            const pt = m[1];
            let p = m[2] || '';
            if (!opusPT.has(pt)) return l;

            // Purge any preexisting lower ceilings or server-side compression constraints
            p = p
                .replace(/maxaveragebitrate=\d+;?/gi, '')
                .replace(/maxplaybackrate=\d+;?/gi, '')
                .replace(/sprop-maxcapturerate=\d+;?/gi, '')
                .replace(/stereo=\d+;?/gi, '')
                .replace(/sprop-stereo=\d+;?/gi, '')
                .replace(/useinbandfec=\d+;?/gi, '')
                .replace(/usedtx=\d+;?/gi, '')
                .replace(/cbr=\d+;?/gi, '')
                .replace(/ptime=\d+;?/gi, '')
                .replace(/;+$/g, '')
                .trim();

            if (p && !p.endsWith(';')) p += ';';

            // Establish rigid studio-spec media configuration parameters
            const o = [
                'stereo=1',                       // Forces stereo channel capability transmission
                'sprop-stereo=1',                 // Signals to receiving end that input is true stereo
                `maxaveragebitrate=${OPUS_TARGET_BITRATE}`, // 384kbps dedicated audio highway bandwidth
                'cbr=1',                          // Locked Constant Bitrate Mode
                'useinbandfec=0',                 // Disables forward error compression overhead allocation
                'usedtx=0',                       // Hard-kills voice activation gating / voice dropouts
                `maxplaybackrate=${OPUS_SAMPLE_RATE}`,
                `sprop-maxcapturerate=${OPUS_SAMPLE_RATE}`,
                'ptime=20'                        // Direct 20ms audio frame sizing for stable UDP throughput
            ];

            return `a=fmtp:${pt} ${p}${o.join(';')}`;
        });

        return out.join('\r\n');
    };

    // Injection Layer 1: Hijacks WebRTC Connection Handshakes
    const patchPeerConnection = () => {
        const PC = win.RTCPeerConnection || win.webkitRTCPeerConnection || win.mozRTCPeerConnection;
        if (!PC || !PC.prototype) return;

        ['setLocalDescription', 'setRemoteDescription'].forEach((n) => {
            const orig = PC.prototype[n];
            if (typeof orig !== 'function' || orig[PATCHED]) return;

            PC.prototype[n] = function (desc) {
                try {
                    if (desc && typeof desc.sdp === 'string') {
                        const u = upgradeSDP(desc.sdp);
                        if (u !== desc.sdp) {
                            desc = new desc.constructor({ type: desc.type, sdp: u });
                        }
                    }
                } catch {}
                return orig.apply(this, arguments);
            };

            PC.prototype[n][PATCHED] = true;
        });
    };

    const mergeAudioConstraints = (t, b) => {
        if (!t || typeof t !== 'object') return b;
        const o = Object.assign({}, t);
        if (!o.channelCount) o.channelCount = {};
        if (!o.sampleRate) o.sampleRate = {};
        if (!o.sampleSize) o.sampleSize = {};
        if (o.channelCount.ideal == null) o.channelCount.ideal = b.channelCount.ideal;
        if (o.sampleRate.ideal == null) o.sampleRate.ideal = b.sampleRate.ideal;
        if (o.sampleSize.ideal == null) o.sampleSize.ideal = b.sampleSize.ideal;
        forceAudioFilterFlags(o);
        return o;
    };

    // Injection Layer 2: Intercepts Initial Device Capture Requests
    const patchGetUserMedia = () => {
        if (!win.navigator?.mediaDevices?.getUserMedia) return;
        const md = win.navigator.mediaDevices;
        const orig = md.getUserMedia.bind(md);
        if (orig[PATCHED]) return;

        md.getUserMedia = (c) => {
            try {
                if (!c) c = {};
                if (c.audio) {
                    const base = {
                        channelCount: { ideal: 2 },
                        sampleRate: { ideal: OPUS_SAMPLE_RATE },
                        sampleSize: { ideal: 24 } // Requests highest 24-bit container depth from Windows 11 engine
                    };
                    forceAudioFilterFlags(base);

                    if (typeof c.audio === 'boolean') {
                        c.audio = base;
                    } else if (typeof c.audio === 'object') {
                        c.audio = mergeAudioConstraints(c.audio, base);
                    }
                }
            } catch {}
            return orig(c);
        };

        md.getUserMedia[PATCHED] = true;
    };

    // Injection Layer 3: Defends against mid-session constraint overrides
    const patchApplyConstraints = () => {
        const MT = win.MediaStreamTrack;
        if (!MT?.prototype?.applyConstraints) return;

        const orig = MT.prototype.applyConstraints;
        if (orig[PATCHED]) return;

        MT.prototype.applyConstraints = function (c) {
            try {
                if (this.kind === 'audio' && c && typeof c === 'object') {
                    if (c.audio && typeof c.audio === 'object') {
                        forceAudioFilterFlags(c.audio);
                    } else {
                        forceAudioFilterFlags(c);
                    }
                }
            } catch {}
            return orig.apply(this, arguments);
        };

        MT.prototype.applyConstraints[PATCHED] = true;
    };

    // Injection Layer 4: Hardens packet settings directly at the network pipeline encoding egress
    const patchRtpSender = () => {
        const RS = win.RTCRtpSender;
        if (!RS?.prototype?.setParameters) return;

        const orig = RS.prototype.setParameters;
        if (orig[PATCHED]) return;

        RS.prototype.setParameters = function (p) {
            try {
                if (p && Array.isArray(p.encodings)) {
                    p.encodings.forEach((e) => {
                        if (!e) return;
                        e.dtx = 'disabled'; // Prevent browser engine dropouts during quiet talking
                        e.maxBitrate = OPUS_TARGET_BITRATE;
                        e.priority = 'high';        // Prioritizes network transmission queues over CPU lag
                        e.networkPriority = 'high'; // Prioritizes network packets at OS kernel layer
                    });
                }
            } catch {}
            return orig.apply(this, arguments);
        };

        RS.prototype.setParameters[PATCHED] = true;
    };

    // Global Fire Sequence
    try {
        patchPeerConnection();
        patchGetUserMedia();
        patchApplyConstraints();
        patchRtpSender();
    } catch {}
})();
