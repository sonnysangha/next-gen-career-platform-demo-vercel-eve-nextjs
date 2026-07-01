import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

// Mounts the Eve agent (agent/) into this Next.js app at same-origin /eve/v1/*.
export default withEve(nextConfig);
