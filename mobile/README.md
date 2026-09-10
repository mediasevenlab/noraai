# Expo mobile (not in this checkout)

This `hybrid` branch ships Android as `hybrid/` (Capacitor around the webapp). The runnable Expo app is **not** part of this tree.

If you need the Expo client, Maestro E2E, EAS, iOS IAP, Expo Push, or mobile social auth, use the `mobile` branch of [mediasevenlab/24nutrition](https://github.com/mediasevenlab/24nutrition):

```bash
git fetch origin
git switch mobile
```

Keep general web, backend, infrastructure, and shared contract work on `hybrid`. Merge `hybrid` into `mobile` when Expo work needs those changes.
