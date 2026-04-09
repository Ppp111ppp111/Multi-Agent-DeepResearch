import { tavily } from "@tavily/core";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "langchain";
import { z } from "zod";

function contentToText(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return part.text ?? "";
        }

        return "";
      })
      .join("");
  }

  return "";
}

function createSummaryPrompt(query, sources) {
  const sourceDigest = sources
    .map((source, index) => {
      const title = source.title || source.url;
      const preview = (source.content || "").slice(0, 1200);
      return `${index + 1}. ${title}\nURL: ${source.url}\n${preview}`;
    })
    .join("\n\n");

  return [
    new SystemMessage(
      [
        "You are a research specialist.",
        "Summarize the provided findings in 2-3 concise, readable paragraphs.",
        "Do not use bullet points, JSON, or code blocks.",
        "Synthesize across sources and call out the most important takeaways.",
      ].join(" "),
    ),
    new HumanMessage(
      `Research query: ${query}\n\nSource material:\n${sourceDigest || "No source material returned."}`,
    ),
  ];
}

export function createResearchTool({ llm }) {
  return tool(
    async ({ query }) => {
      if (!process.env.TAVILY_API_KEY) {
        throw new Error("Missing TAVILY_API_KEY environment variable.");
      }

      const searchClient = tavily({
        apiKey: process.env.TAVILY_API_KEY,
      });

      const searchResponse = await searchClient.search(query, {
        maxResults: 5,
        topic: "general",
        includeRawContent: false,
      });

      const sources = (searchResponse.results || []).map((result) => ({
        url: result.url || "",
        title: result.title || "",
        content: (result.content || "").slice(0, 3000),
        status: "found",
      }));

      let summary = "I wasn't able to gather enough material to summarize that topic.";

      if (sources.length > 0) {
        const summaryResponse = await llm.invoke(createSummaryPrompt(query, sources));
        summary = contentToText(summaryResponse.content).trim() || summary;
      }

      return {
        summary,
        sources,
      };
    },
    {
      name: "research",
      description:
        "Research a topic on the web and return a concise prose summary plus structured sources.",
      schema: z.object({
        query: z.string().min(1).describe("The research question to investigate."),
      }),
    },
  );
}

export { contentToText };
