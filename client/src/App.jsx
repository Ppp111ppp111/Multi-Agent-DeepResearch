import { useDefaultTool } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ToolCard } from "./components/ToolCard.jsx";
import { Workspace } from "./components/Workspace.jsx";
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

export function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const processedKeysRef = useRef(new Set());

  const handleNewResearch = () => {
    // Clear out UI state and reload to completely reset Copilot thread and context
    setState(INITIAL_STATE);
    processedKeysRef.current.clear();
    window.location.reload();
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
                <h1 className="text-gradient">Deep Research Assistant</h1>
                <p>Ask me to research any topic</p>
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
                  title: "Deep Research Assistant",
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
