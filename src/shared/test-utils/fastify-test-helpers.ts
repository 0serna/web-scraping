import { afterEach } from "vitest";

export function createFastifyAppTracker<
  T extends { close: () => Promise<void> },
>() {
  const apps: T[] = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    apps.length = 0;
  });

  return (app: T): T => {
    apps.push(app);
    return app;
  };
}
