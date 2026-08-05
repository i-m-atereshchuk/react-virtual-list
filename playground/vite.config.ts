import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "react-virtual-lite": fileURLToPath(
        new URL("../packages/react-virtual-lite/src/index.ts", import.meta.url),
      ),
    },
  },
});
