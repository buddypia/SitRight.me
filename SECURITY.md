# Security Policy

SitRight processes camera feeds locally in the browser using MediaPipe. Raw camera frames and facial/skeletal landmarks are never uploaded, stored, or sent anywhere. The production build enforces this with a Content Security Policy (`connect-src 'self'`), ensuring the browser blocks any request to external origins. Only privacy-preserving, anonymous product telemetry may be sent to our first-party origin to improve app reliability.

## Supported versions

Only the latest version deployed from `main` is supported.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository ([private vulnerability reporting](https://github.com/buddypia/SitRight.me/security/advisories/new)), or email us directly at **contact@buddypia.com**.

Please include:

- A description of the issue and its impact
- Steps to reproduce (browser, OS, and a minimal proof of concept if possible)

You can expect an initial response within 7 days. Once a fix is released, the advisory will be published with credit to the reporter unless you prefer to remain anonymous.

## Scope

In scope:

- Anything that could send camera frames, landmarks, or posture data off the device
- Bypasses of the Content Security Policy or other security headers
- Cross-site scripting or injection in the app

Out of scope:

- Issues that require a compromised browser, extension, or device
- Missing headers on preview deployments
