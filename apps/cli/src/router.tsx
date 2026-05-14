import { createMemoryRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { About } from "./screens/about";
import { Home } from "./screens/home";
import { NotFound } from "./screens/not-found";
import { Settings } from "./screens/settings";
import { Status } from "./screens/status";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "settings", element: <Settings /> },
      { path: "status", element: <Status /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
