import { VoidpulseApp } from "./app/VoidpulseApp";
import "./style.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app mount element.");
}

new VoidpulseApp(root).start();
