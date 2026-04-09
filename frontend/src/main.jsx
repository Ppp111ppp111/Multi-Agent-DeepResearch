import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import { getResearchRouteKey } from "./lib/research-session.js";
import "./styles.css";

function SessionRoot() {
  const [providerSessionKey, setProviderSessionKey] = useState(() => getResearchRouteKey());

  useEffect(() => {
    const syncSession = () => {
      setProviderSessionKey(getResearchRouteKey());
    };

    window.addEventListener("popstate", syncSession);
    window.addEventListener("research:navigate", syncSession);

    return () => {
      window.removeEventListener("popstate", syncSession);
      window.removeEventListener("research:navigate", syncSession);
    };
  }, []);

  return (
    <CopilotKit
      key={providerSessionKey}
      runtimeUrl={import.meta.env.VITE_API_URL || "/api/copilotkit"}
      agent="research_assistant"
      useSingleEndpoint={true}
    >
      <App routeKey={providerSessionKey} />
    </CopilotKit>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionRoot />
  </React.StrictMode>,
);
