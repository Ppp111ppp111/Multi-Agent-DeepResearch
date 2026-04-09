import { useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Download, FileText, X } from "lucide-react";

export function FileViewerModal({ file, onClose }) {
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!file) {
      return undefined;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [file, handleKeyDown]);

  if (!file) {
    return null;
  }

  const filename = file.path.split("/").pop() || file.path;

  function handleDownload() {
    const blob = new Blob([file.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="file-viewer-overlay">
      <div className="file-viewer-backdrop" onClick={onClose} aria-hidden="true" />

      <div className="file-viewer-modal" role="dialog" aria-modal="true" aria-labelledby="file-viewer-title">
        <div className="file-viewer-header">
          <div className="file-viewer-title-wrap">
            <div className="file-viewer-icon">
              <FileText />
            </div>
            <h2 id="file-viewer-title" className="file-viewer-title">
              {filename}
            </h2>
          </div>

          <div className="file-viewer-actions">
            <button
              type="button"
              className="icon-button"
              onClick={handleDownload}
              aria-label="Download file"
              title="Download file"
            >
              <Download />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
            >
              <X />
            </button>
          </div>
        </div>

        <div className="file-viewer-content">
          <div className="markdown-body">
            <ReactMarkdown>{file.content}</ReactMarkdown>
          </div>
        </div>

        <div className="file-viewer-footer">
          <code>{file.path}</code>
        </div>
      </div>
    </div>
  );
}
