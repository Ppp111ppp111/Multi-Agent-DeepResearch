import { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Pencil,
  Save,
  Search,
} from "lucide-react";

const TOOL_CONFIG = {
  write_todos: {
    icon: Pencil,
    getDisplayText: () => "Updating research plan...",
    getResultSummary: (_result, args) => {
      const todos = args?.todos;
      if (Array.isArray(todos)) {
        return `${todos.length} todo${todos.length !== 1 ? "s" : ""} updated`;
      }
      return null;
    },
  },
  read_todos: {
    icon: ClipboardList,
    getDisplayText: () => "Checking research plan...",
    getResultSummary: (result) => {
      const todos = result?.todos;
      if (Array.isArray(todos)) {
        return `${todos.length} todo${todos.length !== 1 ? "s" : ""} found`;
      }
      return null;
    },
  },
  research: {
    icon: Search,
    getDisplayText: (args) => {
      const query = args?.query || "...";
      return `Researching: ${query.slice(0, 50)}${query.length > 50 ? "..." : ""}`;
    },
    getResultSummary: (result) => {
      if (result && typeof result === "object" && Array.isArray(result.sources)) {
        return `Found ${result.sources.length} source${result.sources.length !== 1 ? "s" : ""}`;
      }
      return "Research complete";
    },
  },
  write_file: {
    icon: Save,
    getDisplayText: (args) => {
      const path = args?.path || args?.file_path;
      const filename = path?.split("/").pop() || args?.filename || "file";
      return `Writing: ${filename}`;
    },
    getResultSummary: (_result, args) => {
      const content = args?.content;
      if (typeof content === "string" && content.length > 0) {
        const firstLine = content.split("\n")[0].slice(0, 50);
        return `${firstLine}${content.length > 50 ? "..." : ""}`;
      }
      return "File written";
    },
  },
  read_file: {
    icon: BookOpen,
    getDisplayText: (args) => {
      const path = args?.path || args?.file_path;
      const filename = path?.split("/").pop() || args?.filename || "file";
      return `Reading: ${filename}`;
    },
    getResultSummary: (result) => {
      const content = result?.content;
      if (typeof content === "string" && content.length > 0) {
        const preview = content.slice(0, 50);
        return `${preview}${content.length > 50 ? "..." : ""}`;
      }
      return null;
    },
  },
};

function ExpandedDetails({ name, result, args }) {
  if (name === "research") {
    const summary =
      result && typeof result === "object" && "summary" in result
        ? result.summary
        : typeof result === "string"
          ? result
          : "";

    if (!summary) {
      return <p className="tool-detail-empty">No findings</p>;
    }

    return (
      <div className="tool-detail-stack">
        <p className="tool-detail-label">Query</p>
        <p className="tool-detail-text">{args?.query || "..."}</p>
        <p className="tool-detail-label">Findings</p>
        <p className="tool-detail-text tool-detail-text-prewrap">{summary}</p>
      </div>
    );
  }

  if (name === "write_todos") {
    const todos = args?.todos;
    if (!Array.isArray(todos) || todos.length === 0) {
      return <p className="tool-detail-empty">No todos</p>;
    }

    return (
      <div className="tool-detail-list">
        {todos.map((todo, index) => (
          <div className="tool-detail-row" key={todo.id || index}>
            <span className={`tool-detail-status tool-detail-status-${todo.status}`}>
              {todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "●" : "○"}
            </span>
            <span className={todo.status === "completed" ? "tool-detail-completed" : ""}>
              {todo.content}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="tool-detail-code">
      {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
    </pre>
  );
}

function DefaultToolCard({ name, status, args, result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tool-card tool-card-default">
      <div className="tool-card-row">
        <div className="tool-card-meta">
          <div className={`tool-card-badge ${status === "complete" ? "is-complete" : "is-running"}`}>
            {status === "complete" ? "✓" : "⚙"}
          </div>
          <div className="tool-card-heading">
            <code>{name}</code>
            <span className={`tool-card-pill ${status === "complete" ? "is-complete" : "is-running"}`}>
              {status}
            </span>
          </div>
        </div>
        <button type="button" className="tool-card-toggle" onClick={() => setExpanded((value) => !value)}>
          <ChevronDown className={expanded ? "is-rotated" : ""} />
        </button>
      </div>

      {expanded ? (
        <div className="tool-card-expanded">
          <div>
            <p className="tool-detail-label">Arguments</p>
            <pre className="tool-detail-code">{JSON.stringify(args, null, 2)}</pre>
          </div>
          {result !== undefined && result !== null ? (
            <div>
              <p className="tool-detail-label">Result</p>
              <pre className="tool-detail-code">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SpecializedToolCard({ name, status, args, result, config }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = status === "complete";
  const isExecuting = status === "inProgress" || status === "executing";
  const Icon = config.icon;
  const hasExpandableContent = isComplete && (name === "research" || name === "write_todos");
  const resultSummary = isComplete && config.getResultSummary ? config.getResultSummary(result, args) : null;

  return (
    <div
      className={`tool-card tool-card-specialized ${hasExpandableContent ? "tool-card-clickable" : ""}`}
      onClick={hasExpandableContent ? () => setExpanded((value) => !value) : undefined}
    >
      <div className="tool-card-row">
        <div className="tool-card-meta">
          <div className={`tool-card-icon-wrap ${isComplete ? "is-complete" : "is-running"}`}>
            {isComplete ? (
              <Check className="tool-card-icon" />
            ) : (
              <Icon className={`tool-card-icon ${isExecuting ? "spin-slow" : ""}`} />
            )}
          </div>

          <div className="tool-card-text">
            <p className={`tool-card-title ${isComplete ? "is-muted" : ""}`}>{config.getDisplayText(args)}</p>
            {resultSummary ? <p className="tool-card-summary">{resultSummary}</p> : null}
          </div>
        </div>

        {hasExpandableContent ? (
          <ChevronDown className={`tool-card-chevron ${expanded ? "is-rotated" : ""}`} />
        ) : null}
      </div>

      {expanded && isComplete ? (
        <div className="tool-card-expanded">
          <ExpandedDetails name={name} result={result} args={args} />
        </div>
      ) : null}
    </div>
  );
}

export function ToolCard({ name, status, args, result }) {
  const config = TOOL_CONFIG[name];

  if (!config) {
    return <DefaultToolCard name={name} status={status} args={args} result={result} />;
  }

  return <SpecializedToolCard name={name} status={status} args={args} result={result} config={config} />;
}
