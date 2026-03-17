# Universal Media Stream Optimizer (Windows 11 Chromium Only)

CRITICAL: This script is architected EXCLUSIVELY for Chromium-based browsers (Brave, Chrome, Edge) running on Windows 11. It is NOT compatible with iOS, macOS, or non-Chromium engines (Firefox/Safari) due to the specific Windows 11 audio subsystem and Blink-engine hooks required for the optimization.
Core Overview
Most web applications (Instagram, Discord, Monkey.app) apply aggressive compression and filtering to audio and video to save server bandwidth. This script intercepts these requests at the browser engine level, forcing the connection to utilize the full technical potential of your Windows 11 hardware environment.
Key Technical Features
• Adaptive Audio Engine: Automatically detects hardware capabilities to match your specific gear.
• High-End (24-bit/48kHz): Optimizes for professional interfaces (e.g., Focusrite Scarlett, Yeti X) with a 384kbps Opus pipe.
• Standard (16-bit/16kHz): Ensures stability for baseline hardware (e.g., Yeti Classic) while maintaining maximum clarity.
• Codec Prioritization: Re-orders the Session Description Protocol (SDP) to force AV1 and VP9 as primary video codecs, providing superior clarity over standard H.264.
• Zero-Latency Playout: Injects a playoutDelayHint of 0 to minimize the buffer gap between capture and transmission for real-time responsiveness.
• Bitrate Reinforcement: Establishes a constant 8Mbps floor for video and screensharing to prevent pixelation during high-motion activity.
• DSP Bypass: Disables all browser-side Digital Signal Processing (Echo Cancellation, Noise Suppression, Auto-Gain) to allow the raw hardware signature of professional microphones (e.g., Rode NT1) to pass through untouched.
Installation
1. Operating System: Ensure you are running Windows 11.
2. Browser: Use a Chromium-based browser (Brave is highly recommended for best results).
3. Install the Tampermonkey extension.
4. Create a new script in the Tampermonkey dashboard.
5. Paste the code from optimizer.js into the editor.
6. Save and ensure the script is enabled.
Troubleshooting & Optimization (Windows 11)
To ensure 100% performance, follow these professional configuration steps within the Windows 11 environment:
1. Windows Sound Control Panel
• Sample Rate Match: Open mmsys.cpl via the Win+R shortcut. Ensure both your Playback and Recording tabs are set to the same value (e.g., 2-channel, 24-bit, 48000 Hz). Mismatched rates can cause digital artifacts or "robotic" audio.
• Exclusive Mode: Right-click your device > Properties > Advanced. Ensure "Allow applications to take exclusive control of this device" is Checked. This allows the script to bypass the Windows software mixer.
2. Browser Flag Optimization
Open brave://flags (or chrome://flags) and search for:
• Override software rendering list: Set to Enabled. This forces the browser to utilize your GPU for high-bitrate video encoding.
• Zero-copy video capture: Set to Enabled. This significantly reduces CPU overhead during 1080p60 streaming.
3. Hardware Acceleration
• In your browser settings, go to System and ensure "Use graphics acceleration when available" is toggled ON.
4. Verification
Press F12 to open the developer console on any calling site. If successful, you will see:
[System] Universal Media Stream Optimizer: Operational.
Compatibility
• OS: Windows 11 (Strict Requirement).
• Browsers: Brave, Chrome, Edge. (Note: iOS browsers are restricted to the WebKit engine and are not supported).
• Verified Platforms: Instagram, Discord (Web), Monkey.app, Google Meet, Zoom (Web).
