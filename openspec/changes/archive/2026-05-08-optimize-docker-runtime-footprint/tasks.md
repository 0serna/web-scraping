## 1. Minimal Runtime Packaging

- [x] 1.1 Replace the current production Docker runtime stage with an ultra-minimal Node-compatible runtime image.
- [x] 1.2 Restructure the Docker build so the final image contains only compiled application artifacts and production runtime dependencies.
- [x] 1.3 Verify the production container still starts the compiled service directly with `node dist/index.js`.

## 2. Explicit Startup Validation

- [x] 2.1 Add explicit startup validation for cache-enabled deployments so missing Upstash configuration fails before the server accepts traffic.
- [x] 2.2 Preserve existing mandatory domain registration while removing reliance on incidental cache-constructor failure for startup correctness.
- [x] 2.3 Add or update tests that cover successful startup with valid cache configuration and failed startup when cache is enabled but required configuration is missing.

## 3. Validation

- [x] 3.1 Run the repository check suite and confirm the change passes.
- [x] 3.2 Rebuild the production container and compare the resulting image size against the current baseline.
- [x] 3.3 Confirm the rebuilt container starts successfully with required runtime configuration and does not run in a partially available state.
