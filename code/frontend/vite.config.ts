import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served by `vite preview` behind the workspace's edge proxy, so every URL
// is host-relative and the app never assumes a port.
export default defineConfig({
  plugins: [react()],
  base: "/",
  preview: { allowedHosts: true },
  server: { allowedHosts: true },
});
