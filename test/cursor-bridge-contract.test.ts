import { describe, expect, it } from "vitest";
import {
	CURSOR_ASK_QUESTION_DESCRIPTION,
	CURSOR_ASK_QUESTION_PROMPT_GUIDELINES,
} from "../src/cursor-ask-question-copy.js";
import {
	buildCursorPiBridgeMcpToolDescription,
	getCursorPiBridgeContractText,
} from "../src/cursor-bridge-contract.js";

describe("cursor bridge contract", () => {
	it("keeps the full bridge contract available for tests and exports", () => {
		const text = getCursorPiBridgeContractText();
		expect(text).toContain("Pi bridge contract:");
		expect(text).toContain("pi__* names are live Cursor MCP bridge tool names");
		expect(text).toContain("prefer pi__mcp for MCP work and pi__subagent for delegation");
		expect(text).toContain("only when the matching pi__ tool is not exposed or unavailable");
	});

	it("uses a one-line MCP description pointer instead of repeating the full contract", () => {
		const description = buildCursorPiBridgeMcpToolDescription({
			piToolDescription: "Ask the user a question.",
			piToolName: "cursor_ask_question",
			mcpToolName: "pi__cursor_ask_question",
		});
		expect(description).toContain("Ask the user a question.");
		expect(description).toContain("Call MCP name pi__cursor_ask_question (pi tool: cursor_ask_question)");
		expect(description).toContain("Full tool-surface rules are in the session bootstrap prompt.");
		expect(description).not.toContain("Pi bridge contract:");
	});

	it("carries Cursor's strict AskQuestion copy into the pi__cursor_ask_question MCP description", () => {
		const description = buildCursorPiBridgeMcpToolDescription({
			piToolDescription: CURSOR_ASK_QUESTION_DESCRIPTION,
			piToolName: "cursor_ask_question",
			mcpToolName: "pi__cursor_ask_question",
			piToolPromptGuidelines: CURSOR_ASK_QUESTION_PROMPT_GUIDELINES,
		});
		expect(description).toContain("STRICT INVOCATION RULES");
		expect(description).toContain("ONLY in exceptional and consequential circumstances");
		expect(description).toContain("Do NOT use this tool to ask for help");
		expect(description).toContain("Write the analysis in assistant text first");
		expect(description).toContain("Call MCP name pi__cursor_ask_question (pi tool: cursor_ask_question)");
		expect(description).not.toContain("materially affect the next step");
		expect(description).not.toContain("instead of guessing");
	});
});
