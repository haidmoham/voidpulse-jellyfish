import { VoidpulseApp } from "./app/VoidpulseApp";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app mount element.");
}

const showStartupError = (error: unknown): void => {
  const message =
    error instanceof Error ? error.message : "Voidpulse could not start.";
  console.error(error);
  root.replaceChildren();
  const fallback = document.createElement("p");
  fallback.textContent = message;
  fallback.setAttribute("role", "alert");
  root.append(fallback);
};

const webGpuNavigator = navigator as Navigator & { gpu?: unknown };

if (!webGpuNavigator.gpu) {
  showStartupError(
    new Error(
      "WebGPU is required for the Aurelia visual. Use a current browser with WebGPU enabled.",
    ),
  );
} else {
  VoidpulseApp.create(root).then((app) => app.start()).catch(showStartupError);
}
