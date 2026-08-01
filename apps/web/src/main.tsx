import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter } from "react-router-dom";
import { apolloClient } from "@/lib/apollo";
import { VercelAnalytics } from "@/lib/vercel-analytics";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <VercelAnalytics />
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>,
);
