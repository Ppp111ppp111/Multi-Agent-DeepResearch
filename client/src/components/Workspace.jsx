import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Download,
  FileText,
  Globe,
  ListTodo,
  X,
} from "lucide-react";
import { FileViewerModal } from "./FileViewerModal.jsx";

function downloadFile(file) {
  const blob = new Blob([file.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.path.split("/").pop() || "file.txt";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function Section({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="workspace-section">
      <button type="button" className="workspace-section-header" onClick={() => setIsOpen((value) => !value)}>
        <div className="workspace-section-title">
          <Icon />
          <span>{title}</span>
          {badge > 0 ? <span className="workspace-section-badge">{badge}</span> : null}
        </div>
        {isOpen ? <ChevronDown className="workspace-section-chevron" /> : <ChevronRight className="workspace-section-chevron" />}
      </button>
      {isOpen ? <div className="workspace-section-content">{children}</div> : null}
    </section>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="empty-state">
      <Icon />
      <p>{title}</p>
      <p className="empty-state-subtitle">{subtitle}</p>
    </div>
  );
}

function TodoList({ todos }) {
  if (todos.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks yet" subtitle="Research tasks will appear here" />;
  }

  return (
    <div className="workspace-stack">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className={[
            "todo-item",
            todo.status === "completed"
              ? "todo-item-completed"
              : todo.status === "in_progress"
                ? "todo-item-inprogress"
                : "todo-item-pending",
          ].join(" ")}
        >
          <span
            className={[
              "todo-status",
              todo.status === "completed"
                ? "status-completed"
                : todo.status === "in_progress"
                  ? "status-inprogress"
                  : "status-pending",
            ].join(" ")}
          >
            {todo.status === "completed" ? <Check size={14} /> : todo.status === "in_progress" ? <CircleDot size={14} /> : <Circle size={14} />}
          </span>
          <span>{todo.content}</span>
        </div>
      ))}
    </div>
  );
}

function FileList({ files, onFileClick }) {
  if (files.length === 0) {
    return <EmptyState icon={FileText} title="No files yet" subtitle="Research artifacts will appear here" />;
  }

  return (
    <div className="workspace-stack">
      {files.map((file, index) => (
        <div className="file-item" key={`${file.path}-${index}`} onClick={() => onFileClick(file)}>
          <div className="file-item-main">
            <div className="file-item-icon">
              <FileText />
            </div>
            <div className="file-item-copy">
              <p className="file-item-name">{file.path.split("/").pop()}</p>
              <p className="file-item-path">{file.path}</p>
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={(event) => {
              event.stopPropagation();
              downloadFile(file);
            }}
            aria-label="Download file"
            title="Download file"
          >
            <Download />
          </button>
        </div>
      ))}
    </div>
  );
}

function SourceList({ sources }) {
  if (sources.length === 0) {
    return <EmptyState icon={Globe} title="No sources yet" subtitle="Web sources will appear here" />;
  }

  return (
    <div className="workspace-stack">
      {sources.map((source, index) => (
        <div className={`file-item ${source.status === "failed" ? "source-failed" : ""}`} key={`${source.url}-${index}`}>
          <div className="file-item-main">
            <span
              className={`source-indicator ${
                source.status === "scraped"
                  ? "status-completed"
                  : source.status === "failed"
                    ? "status-error"
                    : "status-pending"
              }`}
            >
              {source.status === "scraped" ? <Check size={14} /> : source.status === "failed" ? <X size={14} /> : <Circle size={14} />}
            </span>

            <div className="file-item-copy">
              <p className="file-item-name">
                {source.title ||
                  (() => {
                    try {
                      return new URL(source.url).hostname;
                    } catch {
                      return source.url.slice(0, 40);
                    }
                  })()}
              </p>
              <a href={source.url} target="_blank" rel="noreferrer" className="file-item-path source-link">
                {source.url}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Workspace({ state }) {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <div className="workspace-panel">
      <div className="workspace-header">
        <h2>Workspace</h2>
        <p>Research progress and artifacts</p>
      </div>

      <Section title="Research Plan" icon={ListTodo} badge={state.todos.length}>
        <TodoList todos={state.todos} />
      </Section>

      <Section title="Files" icon={FileText} badge={state.files.length}>
        <FileList files={state.files} onFileClick={setSelectedFile} />
      </Section>

      <Section title="Sources" icon={Globe} badge={state.sources.length}>
        <SourceList sources={state.sources} />
      </Section>

      <FileViewerModal file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  );
}
