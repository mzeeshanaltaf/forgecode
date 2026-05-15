import { createMemoryRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Chat } from "./screens/chat";
import { Home } from "./screens/home";
import { NotFound } from "./screens/not-found";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "chat", element: <Chat /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
