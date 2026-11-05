# Deployforge

## Keeping deployment images small

Node projects are built with Railpack dependency pruning enabled by default. To
disable pruning for a project that needs development dependencies at runtime,
send `pruneDevDependencies: false` in the `/api/v1/projects/deploy` request.
The setting is saved on the project and reused for later deployments.

Projects can further reduce image size by committing a `.dockerignore` file that
excludes files not needed at runtime, such as local `node_modules`, `.git`, test
artifacts, and local environment files. Avoid excluding files the app needs to
start.

For Next.js apps, consider `output: "standalone"` in `next.config.js`. Next.js
traces the runtime dependencies into `.next/standalone`; serve the generated
static assets from a CDN or copy `public` and `.next/static` into the standalone
directory when the app needs to serve them itself.
