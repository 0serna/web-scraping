## Why

The current container image is dominated by the runtime base image and a second production dependency install, while the compiled application itself is small. At the same time, cache-backed domains rely on startup-time wiring that should align explicitly with the service's fail-fast operating model rather than depending on incidental constructor behavior.

## What Changes

- Replace the current runtime image strategy with a smaller production container focused on shipping only the files and dependencies required to serve requests.
- Define container packaging requirements for an ultra-minimal runtime image while preserving the current Node.js service entrypoint behavior.
- Update cache startup requirements so cache-enabled deployments fail closed during startup when required Upstash configuration is missing.
- Preserve all existing domains as mandatory startup dependencies so the service does not run in a partially available state.

## Capabilities

### New Capabilities

- `container-runtime-footprint`: Defines the production container packaging and runtime-image expectations for the service.

### Modified Capabilities

- `cache-architecture`: Change cache startup behavior so cache-enabled deployments validate required Redis configuration during application startup instead of waiting for first cache use.

## Impact

- Affected code: `Dockerfile`, container build inputs, startup/config validation, shared cache wiring, and domain bootstrap paths.
- Affected systems: local Docker builds, Cloud Run deployment image, and runtime startup validation.
- Dependencies: container base image/runtime packaging choices and Upstash cache configuration handling.
