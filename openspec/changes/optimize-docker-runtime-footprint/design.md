## Context

The current Docker build uses `node:22-slim` for both the build and runtime stages, installs dependencies twice, and copies only the compiled output into the production stage. The measured image size is driven mostly by the runtime base layers and the production `node_modules` layer rather than by the compiled service, which is under 1 MB.

The application startup path is intentionally strict for API key authentication, but cache-backed domains currently rely on `UpstashCache` constructor behavior to reject missing Upstash configuration. That produces the desired fail-fast outcome only indirectly. Because all domains are mandatory and the service must not run in a partially available state, startup validation should become an explicit bootstrap contract rather than an incidental side effect.

Constraints:

- The runtime image should be as small as practical, even if that reduces shell/debug tooling inside the container.
- The Node.js process entrypoint remains `node dist/index.js`.
- All domains remain required for a healthy startup.
- Cache-enabled deployments must fail closed when required cache configuration is absent.

## Goals / Non-Goals

**Goals:**

- Produce a materially smaller production image by switching to an ultra-minimal runtime packaging strategy.
- Remove redundant work from the container build where it does not serve the final runtime artifact.
- Make startup validation for cache-enabled deployments explicit and deterministic.
- Preserve externally visible API behavior and route availability.

**Non-Goals:**

- Reworking request handlers, domain service logic, or cache semantics beyond startup validation.
- Making any domain optional or introducing degraded-mode startup.
- Tuning request-time memory usage beyond what naturally follows from the smaller runtime image.

## Decisions

### Use a specialized minimal runtime stage

The production image will move away from the current `node:22-slim` runtime stage to a more minimal Node-compatible runtime image. This aligns with the primary goal because the largest savings come from shrinking the runtime base rather than from TypeScript or application-code changes.

Alternatives considered:

- Keep `node:22-slim`: simplest, but leaves the largest source of image weight intact.
- Use a moderately smaller debuggable base: reduces less size than required for this change.

### Package only runtime necessities in the final image

The final image should contain only the Node runtime, production dependencies, and compiled application files required to serve traffic. Build-only inputs and tooling must remain in the builder stage. This keeps the runtime image aligned with the service contract rather than the development workflow.

Alternatives considered:

- Re-run a standard production install in the runtime stage: straightforward, but retains unnecessary package-manager work and metadata in the final assembly path.
- Keep a more general-purpose container filesystem: easier to inspect, but contrary to the agreed ultra-minimal objective.

### Make cache startup validation an explicit bootstrap responsibility

When caching is enabled, startup should validate the presence of required Upstash configuration before the server begins listening. This preserves fail-fast behavior while removing dependence on service-construction side effects. Validation remains scoped to configuration presence, not remote Redis reachability, so startup does not depend on a successful network round trip.

Alternatives considered:

- Keep lazy validation on first cache use: smaller startup surface, but conflicts with the chosen fail-fast model.
- Probe Redis connectivity at startup: stricter, but couples availability to transient network conditions and goes beyond the current contract.

### Preserve eager domain registration while clarifying startup invariants

The service will continue registering all domains during application bootstrap. The change is not to make dependency wiring lazy; it is to ensure that startup invariants are validated intentionally and consistently before traffic is accepted.

Alternatives considered:

- Lazy-create route dependencies on first request: may reduce startup work slightly, but conflicts with the requirement that every domain be valid before the service is considered healthy.

## Risks / Trade-offs

- [Minimal runtime images are harder to inspect interactively] → Accept the operational trade-off because image size is the top priority and diagnostics can rely on logs and local reproduction.
- [More specialized Docker packaging can become brittle if build outputs change] → Keep the final runtime contract narrow and document exactly which artifacts the runtime stage expects.
- [Explicit startup validation may surface configuration errors earlier in environments that previously started accidentally] → This is intentional and should be reflected in deployment expectations.
- [Switching runtime base images may expose compatibility differences] → Keep the build stage on a familiar Node image and validate the compiled output under the chosen runtime image.

## Migration Plan

1. Update the container build to produce the new minimal runtime image and verify the service still starts with required environment variables.
2. Add explicit startup validation for cache-enabled deployments before the server begins listening.
3. Run the standard repository checks and rebuild the container to compare image size and startup behavior.
4. Deploy the new image through the existing Cloud Run path.

Rollback strategy:

- Revert the Docker/runtime packaging change to the prior runtime image.
- Revert the explicit cache validation change if startup behavior proves incompatible with deployment assumptions.

## Open Questions

- Which exact minimal runtime base offers the best size-to-compatibility trade-off for this repository.
- Whether the final image should copy prebuilt production dependencies from the builder path or assemble them through a dedicated production-dependencies stage.
