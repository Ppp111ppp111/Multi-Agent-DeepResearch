# Deep Research Assistant Clone

React + Express + Deep Agents + CopilotKit clone of the CopilotKit deep agents demo.

## Stack

- React with Vite
- Node.js + Express
- `deepagents` for the research agent
- CopilotKit chat UI
- AG-UI style agent integration through a custom `AbstractAgent`

## Run

1. Copy `.env.example` to `.env`
2. Set `NVIDIA_API_KEY` and `TAVILY_API_KEY`
3. Run `npm install`
4. Run `npm run dev`

## Build

Run `npm run build`

## Notes

- The app keeps the split layout, workspace panel, research plan updates, source tracking, and file output flow from the original demo.
- The client proxies `/api/*` to the Express server during local development.
- The agent now uses NVIDIA's OpenAI-compatible chat API via `https://integrate.api.nvidia.com/v1` while keeping the LangChain client layer unchanged.
