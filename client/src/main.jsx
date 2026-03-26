import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="research_assistant"
      useSingleEndpoint={true}
    >
      <App />
    </CopilotKit>
  </React.StrictMode>,
);
