# Jobly — J'IA Assistant de candidature (Chrome desktop beta)

## Installation
1. Download the ZIP from Jobly at /api/jia/extension/download.
2. Extract the archive to a permanent folder.
3. Open chrome://extensions in Google Chrome 116 or later on desktop.
4. Enable Developer mode.
5. Select Load unpacked and choose the extracted folder containing manifest.json.
6. Return to Jobly at https://jobly-c0651.vercel.app/jia/extension. The page detects the extension automatically.
7. Activate J'IA from the Jobly setup page or from this side panel. Pin the extension icon from Chrome's Extensions menu to open the side panel quickly.

## State and permissions
- The extension defaults to installed-but-paused. The talent explicitly activates it.
- Jobly checks its presence through a short local message handshake; it does not rely on a cookie or a click.
- If no response is received, Jobly reports "not detected (missing or disabled)"; the website cannot distinguish those cases when Chrome does not inject the content script.
- Form inspection is off by default. The side panel asks Chrome for optional permission on the current recruiter domain only after the talent clicks "Analyze visible fields".
- It reads only visible form labels, types, required flags and select options. It never reads field values, password inputs, file inputs or verification codes.
- It does not fill or submit any application. The talent reviews every suggestion and performs the final submission.

## Distribution
This is a developer-mode beta, not yet published in the Chrome Web Store. Chrome Android does not support this desktop extension; the Android flow uses the Jobly PWA share target.
