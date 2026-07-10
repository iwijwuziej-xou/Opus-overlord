## v17.0.0 — Chromium Windows 11 Ultimate Engine Release
**Release Date:** 2026-07-10

### 🚀 The Ultimate Performance Milestone
Version 17.0.0 marks a complete evolution from a standard WebRTC utility script into a dedicated, hardware-exclusive audio pipeline. This release strips away the browser layer processing entirely to feed web-based communication platforms an uncompressed, wide-open, high-headroom audio stream optimized specifically for Chromium browsers running on Windows 11.

### 🛠️ Key Enhancements & Architectural Changes
- **Ultimate Hardware Bypass:** Aggressively eliminates the core Google Chromium/Blink internal software digital signal processing (DSP) stack alongside classic W3C properties. By bypassing `googHighpassFilter`, `googNoiseSuppression`, and `googEchoCancellation`, your mic retains its true proximity effect and vocal "air."
- **Windows 11 WASAPI CoreAudio Optimization:** Integrated native runtime instructions requesting a 24-bit container directly from the host operating system's sound engine, paired with a target low-latency constraint path ($5\text{ms}$).
- **The Zero-Gating Lock (CBR-1):** Enforces a completely fixed, unyielding $384\text{ kbps}$ lane on the network data layer. No gating, no dropping audio payloads to save bandwidth, and absolute continuous stream preservation via forced `cbr=1`, `usedtx=0`, and `useinbandfec=0`.
- **Egress Network Packet Prioritization:** Hard-coded explicit priority markers (`e.priority = 'high'` and `e.networkPriority = 'high'`) directly into the `RTCRtpSender` egress layer, instructing the Chromium resource manager to prioritize your mic's UDP packets over standard rendering or video bandwidth.
- **Max Volume Open-Intake:** Injects raw volume constraint overrides directly at `getUserMedia` capture, maximizing the browser-level mixing slider to 1.0 automatically.

### 🚨 Environmental Requirements
Because v17.0.0 fundamentally converts your browser into a raw, unfiltered XLR-style recording desk with zero software safeguards:
1. **Headphones are Mandatory:** With all software acoustic echo cancellation completely terminated, using open desktop or laptop speakers **will** cause severe feedback loops for other participants on a call.
2. **OS Configuration:** For absolute maximum transparency, users must manually configure their Windows 11 Sound Control Panel (`mmsys.cpl`) to match the script's studio specification ($48000\text{ Hz}$ in Exclusive Mode).
