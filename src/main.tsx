import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App";
import routes from "./router";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <RouterProvider router={createBrowserRouter(routes)} />
);