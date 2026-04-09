import { useCopilotChat, useDefaultTool } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ToolCard } from "./components/ToolCard.jsx";
import { Workspace } from "./components/Workspace.jsx";
import { navigateToNewResearchRoute } from "./lib/research-session.js";
import { INITIAL_STATE } from "./types/research.js";

function parseMaybeJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function App({ routeKey }) {
  const [state, setState] = useState(INITIAL_STATE);
  const processedKeysRef = useRef(new Set());
  const { isLoading, reset, stopGeneration } = useCopilotChat();

  useEffect(() => {
    document.title =
      routeKey === "home" ? "Deep Research Assistant" : "Deep Research Assistant | New Research";
  }, [routeKey]);

  const handleNewResearch = () => {
    if (isLoading) {
      stopGeneration();
    }

    setState(INITIAL_STATE);
    processedKeysRef.current.clear();
    reset();
    navigateToNewResearchRoute();
  };

  useDefaultTool({
    render: (props) => {
      const { name, status } = props;
      const args = parseMaybeJson(props.args);
      const result = parseMaybeJson(props.result);

      if (status === "complete") {
        const resultString = result ? JSON.stringify(result) : "";
        const resultHash = resultString ? `${resultString.length}-${resultString.slice(0, 100)}` : "";
        const key = `${name}-${JSON.stringify(args)}-${resultHash}`;

        if (processedKeysRef.current.has(key)) {
          return <ToolCard {...props} args={args} result={result} />;
        }

        processedKeysRef.current.add(key);
      }

      if (name === "research" && status === "complete" && result?.sources?.length) {
        queueMicrotask(() => {
          setState((previousState) => ({
            ...previousState,
            sources: [...previousState.sources, ...result.sources],
          }));
        });
      }

      if (name === "write_todos" && status === "complete" && Array.isArray(args?.todos)) {
        const todosWithIds = args.todos.map((todo, index) => ({
          ...todo,
          id: todo.id || `todo-${Date.now()}-${index}`,
        }));

        queueMicrotask(() => {
          setState((previousState) => ({
            ...previousState,
            todos: todosWithIds,
          }));
        });
      }

      if (name === "write_file" && status === "complete" && (args?.file_path || args?.path)) {
        const filePath = args.file_path || args.path;

        queueMicrotask(() => {
          setState((previousState) => ({
            ...previousState,
            files: [
              ...previousState.files,
              {
                path: filePath,
                content: args.content || "",
                createdAt: new Date().toISOString(),
              },
            ],
          }));
        });
      }

      return <ToolCard {...props} args={args} result={result} />;
    },
  });

  return (
    <div className="app-shell">
      <div className="abstract-bg">
        <div className="blob-3" />
      </div>

      <main className="main-layout">
        <section className="chat-panel">
          <div className="chat-panel-inner">
            <header className="chat-header">
              <div className="chat-header-title">
                <h1 className="text-gradient">
                  {routeKey === "home" ? "Deep Research Assistant" : "New Research"}
                </h1>
                <p>
                  {routeKey === "home"
                    ? "Ask me to research any topic"
                    : "A fresh research workspace is ready"}
                </p>
              </div>
              <button 
                type="button" 
                className="new-research-button" 
                onClick={handleNewResearch}
                title="Start New Research"
              >
                <Plus size={20} />
                <span>New Research</span>
              </button>
            </header>

            <div className="chat-body">
              <CopilotChat
                className="copilot-chat-fill"
                labels={{
                  title: routeKey === "home" ? "Deep Research Assistant" : "New Research",
                  initial: "What topic would you like me to research?",
                  placeholder: "Ask me to research any topic...",
                }}
              />
            </div>
          </div>
        </section>

        <section className="workspace-column">
          <Workspace state={state} />
        </section>
      </main>
    </div>
  );
}
