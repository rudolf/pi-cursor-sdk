import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeCursorContextFingerprint } from "../src/context.js";
import {
	acquireSessionCursorAgent,
	CURSOR_LOCAL_AGENT_IDLE_MS,
	CURSOR_LOCAL_AGENT_IDLE_MS_ENV,
	resolveCursorLocalAgentIdleMs,
	__testUtils as sessionAgentTestUtils,
} from "../src/cursor-session-agent.js";
import { __testUtils as resumeTestUtils } from "../src/cursor-session-agent-resume.js";
import { __testUtils as cursorSessionScopeTestUtils } from "../src/cursor-session-scope.js";
import { makeContext } from "./helpers/pi-harness.js";
import { installCursorSessionStoreMock } from "./helpers/cursor-session-store.js";

describe("cursor-session-agent idle eviction", () => {
	beforeEach(async () => {
		installCursorSessionStoreMock();
		cursorSessionScopeTestUtils.reset();
		resumeTestUtils.reset();
		await sessionAgentTestUtils.disposeAllSessionCursorAgents();
		vi.clearAllMocks();
	});

	it("reuses a pooled agent last used inside the idle window", async () => {
		const createAgent = vi.fn().mockResolvedValue({
			agentId: "agent-1",
			[Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined),
		});
		cursorSessionScopeTestUtils.set("/tmp/project", "/tmp/sessions/test.jsonl");
		const params = {
			apiKey: "test-key",
			agentMode: "agent" as const,
			cwd: "/tmp/project",
			modelSelection: { id: "composer-2.5" },
			createAgent,
		};

		sessionAgentTestUtils.setNowMs(1_000);
		const first = await acquireSessionCursorAgent(params);
		first.commitSend(makeContext(), true);
		sessionAgentTestUtils.setNowMs(1_000 + CURSOR_LOCAL_AGENT_IDLE_MS - 1);
		const second = await acquireSessionCursorAgent(params);

		expect(second.created).toBe(false);
		expect(second.agent).toBe(first.agent);
		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it("resumes the persisted agent after idle instead of force-creating", async () => {
		const firstDispose = vi.fn().mockResolvedValue(undefined);
		const resumedAgent = { agentId: "agent-1", [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined) };
		const createAgent = vi.fn().mockResolvedValue({
			agentId: "agent-1",
			[Symbol.asyncDispose]: firstDispose,
		});
		const resumeAgent = vi.fn().mockResolvedValue(resumedAgent);
		const scopeKey = "/tmp/sessions/test.jsonl";
		cursorSessionScopeTestUtils.set("/tmp/project", scopeKey);
		const params = {
			apiKey: "test-key",
			agentMode: "agent" as const,
			cwd: "/tmp/project",
			modelSelection: { id: "composer-2.5" },
			localResume: true,
			createAgent,
			resumeAgent,
		};

		sessionAgentTestUtils.setNowMs(1_000);
		const first = await acquireSessionCursorAgent(params);
		const context = makeContext();
		first.commitSend(context, true);
		resumeTestUtils.set({
			scopeKey,
			sessionFile: scopeKey,
			cwd: "/tmp/project",
			activeHandle: {
				version: 2,
				runtime: "local",
				agentId: "agent-1",
				scopeKey,
				sessionFile: scopeKey,
				cwd: "/tmp/project",
				poolKey: first.poolKey,
				branchPathHash: resumeTestUtils.EMPTY_BRANCH_HASH,
				compactionGeneration: 0,
				sendState: {
					bootstrapped: true,
					contextFingerprint: computeCursorContextFingerprint(context),
					incrementalSendCount: 0,
				},
				createdAt: "2026-08-18T00:00:00.000Z",
				storeIdentity: first.storeIdentity,
			},
		});
		sessionAgentTestUtils.setNowMs(1_000 + CURSOR_LOCAL_AGENT_IDLE_MS);
		const second = await acquireSessionCursorAgent(params);

		expect(second.created).toBe(true);
		expect(second.resumed).toBe(true);
		expect(second.agent).toBe(resumedAgent);
		expect(second.agent).not.toBe(first.agent);
		expect(createAgent).toHaveBeenCalledTimes(1);
		expect(resumeAgent).toHaveBeenCalledWith("agent-1", expect.any(Object));
		expect(firstDispose).toHaveBeenCalledTimes(1);
	});

	it("creates a replacement when idle resume fails", async () => {
		const firstDispose = vi.fn().mockResolvedValue(undefined);
		const replacement = { agentId: "agent-2", [Symbol.asyncDispose]: vi.fn().mockResolvedValue(undefined) };
		const createAgent = vi
			.fn()
			.mockResolvedValueOnce({ agentId: "agent-1", [Symbol.asyncDispose]: firstDispose })
			.mockResolvedValueOnce(replacement);
		const resumeAgent = vi.fn().mockRejectedValue(new Error("resume unavailable"));
		const scopeKey = "/tmp/sessions/test.jsonl";
		cursorSessionScopeTestUtils.set("/tmp/project", scopeKey);
		const params = {
			apiKey: "test-key",
			agentMode: "agent" as const,
			cwd: "/tmp/project",
			modelSelection: { id: "composer-2.5" },
			localResume: true,
			createAgent,
			resumeAgent,
		};

		sessionAgentTestUtils.setNowMs(1_000);
		const first = await acquireSessionCursorAgent(params);
		const context = makeContext();
		first.commitSend(context, true);
		resumeTestUtils.set({
			scopeKey,
			sessionFile: scopeKey,
			cwd: "/tmp/project",
			activeHandle: {
				version: 2,
				runtime: "local",
				agentId: "agent-1",
				scopeKey,
				sessionFile: scopeKey,
				cwd: "/tmp/project",
				poolKey: first.poolKey,
				branchPathHash: resumeTestUtils.EMPTY_BRANCH_HASH,
				compactionGeneration: 0,
				sendState: {
					bootstrapped: true,
					contextFingerprint: computeCursorContextFingerprint(context),
					incrementalSendCount: 0,
				},
				createdAt: "2026-08-18T00:00:00.000Z",
				storeIdentity: first.storeIdentity,
			},
		});
		sessionAgentTestUtils.setNowMs(1_000 + CURSOR_LOCAL_AGENT_IDLE_MS);
		const second = await acquireSessionCursorAgent(params);

		expect(second.created).toBe(true);
		expect(second.resumed).toBeFalsy();
		expect(second.agent).toBe(replacement);
		expect(createAgent).toHaveBeenCalledTimes(2);
		expect(resumeAgent).toHaveBeenCalledWith("agent-1", expect.any(Object));
		expect(firstDispose).toHaveBeenCalledTimes(1);
	});

	it("resolves PI_CURSOR_LOCAL_AGENT_IDLE_MS and ignores invalid values", () => {
		expect(resolveCursorLocalAgentIdleMs({})).toBe(CURSOR_LOCAL_AGENT_IDLE_MS);
		expect(resolveCursorLocalAgentIdleMs({ [CURSOR_LOCAL_AGENT_IDLE_MS_ENV]: "8000" })).toBe(8000);
		expect(resolveCursorLocalAgentIdleMs({ [CURSOR_LOCAL_AGENT_IDLE_MS_ENV]: "0" })).toBe(CURSOR_LOCAL_AGENT_IDLE_MS);
		expect(resolveCursorLocalAgentIdleMs({ [CURSOR_LOCAL_AGENT_IDLE_MS_ENV]: "0.5" })).toBe(CURSOR_LOCAL_AGENT_IDLE_MS);
		expect(resolveCursorLocalAgentIdleMs({ [CURSOR_LOCAL_AGENT_IDLE_MS_ENV]: "nope" })).toBe(CURSOR_LOCAL_AGENT_IDLE_MS);
	});
});
