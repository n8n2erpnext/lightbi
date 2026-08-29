# macOS unsigned Beta test build

This workflow produces an ad-hoc signed universal DMG for Intel and Apple Silicon Macs with macOS 11 Big Sur or newer. It is not Developer ID signed or notarized, so testers may need to allow it in Privacy & Security.

The workflow validates DMG integrity, `LSMinimumSystemVersion=11.0`, both `x86_64` and `arm64` slices, ad-hoc code signing, and a SHA-256 checksum. Pull requests upload an Actions artifact only. An explicit manual dispatch with `publish=true` may add the validated DMG to an existing Beta GitHub Release and R2 manifest without changing the version or replacing Windows/Linux installers.

Future Apple Developer signing replaces `signingIdentity: "-"` through protected CI secrets and adds notarization/stapling without changing the application version in this test branch.
