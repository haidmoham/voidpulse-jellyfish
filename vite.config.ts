import { defineConfig } from "vite";
import tslOperator from "vite-plugin-tsl-operator";

export default defineConfig({
  clearScreen: false,
  plugins: [tslOperator({ logs: false })],
});
