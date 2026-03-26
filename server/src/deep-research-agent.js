import { AbstractAgent, EventType } from "@ag-ui/client";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { Observable } from "rxjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createResearchTool, contentToText } from "./tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const reportDir = path.resolve(rootDir, "reports");
const reportDiskPath = path.join(reportDir, "final_report.md");
const reportAppPath = "/reports/final_report.md";

const PLAN_SYSTEM_PROMPT = [
  "You are a research planner.",
  "Create a concise research plan with 3 to 5 steps.",
  "Return only the plan items, one per line.",
  "Do not use markdown headings, bullets, JSON, or commentary.",
].join(" ");

const REPORT_SYSTEM_PROMPT = [
  "You are a senior research analyst.",
  "Write a polished markdown report with a title, executive summary, key findings, analysis, and sources.",
  "Use natural language only.",
  "Do not include code blocks or JSON.",
].join(" ");

const RESPONSE_SYSTEM_PROMPT = [
  "You are a helpful research assistant.",
  "Write a concise answer to the user in 2 short paragraphs.",
  "Summarize the most important findings and mention that the full report was saved to /reports/final_report.md.",
  "Do not use bullet points, JSON, or code blocks.",
].join(" ");

function getConversationTranscript(messages) {
  return (messages || [])
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-8)
    .map((message) => {
      const speaker = message.role === "user" ? "User" : "Assistant";
      const content = typeof message.content === "string" ? message.content.trim() : "";
      return content ? `${speaker}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function getLatestUserPrompt(messages) {
  const latestUserMessage = [...(messages || [])].reverse().find((message) => message?.role === "user");
  return (typeof latestUserMessage?.content === "string" ? latestUserMessage.content : "").trim();
}

function sanitizePlanLine(line) {
  return line
    .trim()
    .replace(/^\d+[\).\s-]+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\s+/g, " ");
}

function parsePlan(planText, userPrompt) {
  const tasks = planText
    .split("\n")
    .map(sanitizePlanLine)
    .filter(Boolean)
    .slice(0, 5);

  if (tasks.length > 0) {
    return tasks;
  }

  return [
    `Clarify the main scope and research questions behind: ${userPrompt}`,
    "Gather reliable, recent background information and examples",
    "Compare the most important findings, tradeoffs, and patterns",
    "Synthesize the results into a final report",
  ];
}

function createTodos(tasks, activeIndex = -1, completedCount = 0) {
  return tasks.map((content, index) => ({
    id: `todo-${index + 1}`,
    content,
    status: index < completedCount ? "completed" : index === activeIndex ? "in_progress" : "pending",
  }));
}

function chunkText(text, wordsPerChunk = 18) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(`${words.slice(index, index + wordsPerChunk).join(" ")} `);
  }

  return chunks;
}

function dedupeSources(sources) {
  const seen = new Set();

  return sources.filter((source) => {
    const key = source?.url || `${source?.title || ""}-${source?.content?.slice?.(0, 80) || ""}`;

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function stringifyToolPayload(payload) {
  return JSON.stringify(payload ?? {});
}

async function buildPlan({ llm, transcript, userPrompt }) {
  if (!llm?.invoke) {
    return parsePlan("", userPrompt);
  }

  const response = await llm.invoke([
    new SystemMessage(PLAN_SYSTEM_PROMPT),
    new HumanMessage(
      [
        `Conversation:\n${transcript || `User: ${userPrompt}`}`,
        "",
        "Create a research plan for the latest user request.",
      ].join("\n"),
    ),
  ]);

  return parsePlan(contentToText(response.content), userPrompt);
}

async function buildFinalReport({ llm, transcript, userPrompt, findings }) {
  if (!llm?.invoke) {
    return [
      "# Final Report",
      "",
      `## Request`,
      userPrompt,
      "",
      "## Findings",
      ...findings.map((finding, index) => `${index + 1}. ${finding.task}: ${finding.summary}`),
    ].join("\n");
  }

  const researchDigest = findings
    .map((finding, index) => {
      const sourceList = finding.sources
        .map((source, sourceIndex) => `${sourceIndex + 1}. ${source.title || source.url} (${source.url})`)
        .join("\n");

      return [
        `Research Item ${index + 1}: ${finding.task}`,
        `Query: ${finding.query}`,
        `Summary: ${finding.summary}`,
        `Sources:\n${sourceList || "No sources returned."}`,
      ].join("\n");
    })
    .join("\n\n");

  const response = await llm.invoke([
    new SystemMessage(REPORT_SYSTEM_PROMPT),
    new HumanMessage(
      [
        `Conversation:\n${transcript || `User: ${userPrompt}`}`,
        "",
        `Latest user request: ${userPrompt}`,
        "",
        `Research findings:\n${researchDigest}`,
      ].join("\n"),
    ),
  ]);

  return contentToText(response.content).trim();
}

async function buildFinalResponse({ llm, userPrompt, report }) {
  if (!llm?.invoke) {
    return `I finished the research and saved the full report to ${reportAppPath}.`;
  }

  const response = await llm.invoke([
    new SystemMessage(RESPONSE_SYSTEM_PROMPT),
    new HumanMessage(
      [
        `User request: ${userPrompt}`,
        "",
        `Full report:\n${report}`,
      ].join("\n"),
    ),
  ]);

  return contentToText(response.content).trim();
}

class DeepResearchAgUiAgent extends AbstractAgent {
  constructor() {
    super({
      agentId: "research_assistant",
      description:
        "A deep research assistant that plans, searches, and writes polished research reports.",
    });

    this.llm = undefined;
    this.researchTool = undefined;
    this.initializeRuntime();
  }

  initializeRuntime() {
    const modelName = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

    this.llm = new ChatOpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      model: modelName,
      temperature: 0.4,
      configuration: {
        baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      },
    });

    this.researchTool = createResearchTool({ llm: this.llm });
  }

  ensureRuntime() {
    if (!this.llm?.invoke) {
      this.initializeRuntime();
    }

    if (!this.researchTool?.invoke) {
      this.researchTool = createResearchTool({ llm: this.llm });
    }
  }

  emitToolCall(subscriber, assistantMessageId, toolCallName, args, result) {
    const toolCallId = crypto.randomUUID();

    subscriber.next({
      type: EventType.TOOL_CALL_START,
      toolCallId,
      toolCallName,
      parentMessageId: assistantMessageId,
    });

    subscriber.next({
      type: EventType.TOOL_CALL_ARGS,
      toolCallId,
      delta: stringifyToolPayload(args),
    });

    subscriber.next({
      type: EventType.TOOL_CALL_END,
      toolCallId,
    });

    subscriber.next({
      type: EventType.TOOL_CALL_RESULT,
      messageId: crypto.randomUUID(),
      toolCallId,
      content: stringifyToolPayload(result),
      role: "tool",
    });
  }

  emitAssistantText(subscriber, assistantMessageId, text) {
    const chunks = chunkText(text);

    subscriber.next({
      type: EventType.TEXT_MESSAGE_START,
      messageId: assistantMessageId,
      role: "assistant",
    });

    if (chunks.length === 0) {
      subscriber.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: assistantMessageId,
        delta: text,
      });
    } else {
      for (const chunk of chunks) {
        subscriber.next({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: assistantMessageId,
          delta: chunk,
        });
      }
    }

    subscriber.next({
      type: EventType.TEXT_MESSAGE_END,
      messageId: assistantMessageId,
    });
  }

  async writeReportToDisk(content) {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(reportDiskPath, content, "utf8");
  }

  run(input) {
    return new Observable((subscriber) => {
      const execute = async () => {
        if (!process.env.NVIDIA_API_KEY) {
          throw new Error("Missing NVIDIA_API_KEY environment variable.");
        }

        if (!process.env.TAVILY_API_KEY) {
          throw new Error("Missing TAVILY_API_KEY environment variable.");
        }

        this.ensureRuntime();

        const threadId = input.threadId;
        const runId = input.runId;
        const assistantMessageId = crypto.randomUUID();
        const conversationMessages =
          Array.isArray(input.messages) && input.messages.length > 0 ? input.messages : this.messages;
        const transcript = getConversationTranscript(conversationMessages);
        const userPrompt = getLatestUserPrompt(conversationMessages);

        if (!userPrompt) {
          throw new Error("No user message was provided to the research agent.");
        }

        subscriber.next({
          type: EventType.RUN_STARTED,
          threadId,
          runId,
          input,
        });

        const tasks = await buildPlan({
          llm: this.llm,
          transcript,
          userPrompt,
        });

        this.emitToolCall(
          subscriber,
          assistantMessageId,
          "write_todos",
          { todos: createTodos(tasks, 0, 0) },
          { success: true },
        );

        const findings = [];
        const allSources = [];

        for (let index = 0; index < tasks.length; index += 1) {
          const task = tasks[index];

          this.emitToolCall(
            subscriber,
            assistantMessageId,
            "write_todos",
            { todos: createTodos(tasks, index, index) },
            { success: true },
          );

          const query = `${userPrompt}\nFocus area: ${task}`;
          let researchResult;

          try {
            researchResult = this.researchTool?.invoke
              ? await this.researchTool.invoke({ query })
              : {
                  summary: "Research is temporarily unavailable because the tool runtime was not initialized.",
                  sources: [],
                };
          } catch (error) {
            researchResult = {
              summary:
                error instanceof Error
                  ? `Research failed for this step: ${error.message}`
                  : "Research failed for this step due to an unknown error.",
              sources: [],
            };
          }

          const normalizedResult = {
            summary: researchResult?.summary || "No summary returned.",
            sources: Array.isArray(researchResult?.sources) ? researchResult.sources : [],
          };

          findings.push({
            task,
            query,
            summary: normalizedResult.summary,
            sources: normalizedResult.sources,
          });
          allSources.push(...normalizedResult.sources);

          this.emitToolCall(
            subscriber,
            assistantMessageId,
            "research",
            { query },
            normalizedResult,
          );

          this.emitToolCall(
            subscriber,
            assistantMessageId,
            "write_todos",
            {
              todos: createTodos(
                tasks,
                index + 1 < tasks.length ? index + 1 : -1,
                index + 1,
              ),
            },
            { success: true },
          );
        }

        const dedupedSources = dedupeSources(allSources);
        const report =
          (await buildFinalReport({
            llm: this.llm,
            transcript,
            userPrompt,
            findings,
          })) || "# Final Report\n\nI was unable to generate the final report.";

        await this.writeReportToDisk(report);

        this.emitToolCall(
          subscriber,
          assistantMessageId,
          "write_file",
          {
            file_path: reportAppPath,
            content: report,
          },
          {
            success: true,
            path: reportAppPath,
            sourceCount: dedupedSources.length,
          },
        );

        const finalResponse =
          (await buildFinalResponse({
            llm: this.llm,
            userPrompt,
            report,
          })) ||
          `I finished the research and saved the full report to ${reportAppPath}.`;

        this.emitAssistantText(subscriber, assistantMessageId, finalResponse);

        subscriber.next({
          type: EventType.RUN_FINISHED,
          threadId,
          runId,
        });

        subscriber.complete();
      };

      execute().catch((error) => {
        subscriber.next({
          type: EventType.RUN_ERROR,
          message: error instanceof Error ? error.message : "Unknown agent error.",
        });
        subscriber.error(error);
      });

      return () => {};
    });
  }
}

export function createResearchAgent() {
  return new DeepResearchAgUiAgent();
}
