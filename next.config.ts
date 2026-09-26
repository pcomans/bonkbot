import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Keep the dev badge out of screenshots and demo recordings.
  devIndicators: false,
};

export default withEve(nextConfig);
