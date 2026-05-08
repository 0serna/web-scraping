## 1. Minimal Runtime Packaging

- [ ] 1.1 Replace the current production Docker runtime stage with an ultra-minimal Node-compatible runtime image.
- [ ] 1.2 Restructure the Docker build so the final image contains only compiled application artifacts and production runtime dependencies.
- [ ] 1.3 Verify the production container still starts the compiled service directly with `node dist/index.js`.

## 2. Explicit Startup Validation

- [ ] 2.1 Add explicit startup validation for cache-enabled deployments so missing Upstash configuration fails before the server accepts traffic.
- [ ] 2.2 Preserve existing mandatory domain registration while removing reliance on incidental cache-constructor failure for startup correctness.
- [ ] 2.3 Add or update tests that cover successful startup with valid cache configuration and failed startup when cache is enabled but required configuration is missing.

## 3. Validation

- [ ] 3.1 Run the repository check suite and confirm the change passes.
- [ ] 3.2 Rebuild the production container and compare the resulting image size against the current baseline.
- [ ] 3.3 Confirm the rebuilt container starts successfully with required runtime configuration and does not run in a partially available state.
