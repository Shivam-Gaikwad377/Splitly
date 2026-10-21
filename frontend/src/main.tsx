import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider } from "./providers/theme-provider";
import { AuthProvider } from "./providers/auth-provider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
      />
    </ThemeProvider>
  </StrictMode>,
);