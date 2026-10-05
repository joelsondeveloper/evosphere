import "./style.css";
import { mountDashboard } from "./ui/dashboard";

const app = document.getElementById("app");
if (!app) {
  throw new Error("No app element found");
}

const dispose = mountDashboard(app);
window.addEventListener("pagehide", dispose, { once: true });
