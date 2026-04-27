// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CI gates restored (C13). TypeScript and ESLint now block builds again so
  // regressions like (req as any).ip — silently undefined in Next 15+ — get
  // caught before they ship.
};

export default nextConfig;
