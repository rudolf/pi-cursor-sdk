import { getCursorSessionScopeKey } from "./cursor-session-scope.js";

/**
 * Matches `@earendil-works/pi-coding-agent` `COMPACTION_SUMMARY_PREFIX` (0.84.0).
 * Pi's `convertToLlm()` rewrites `compactionSummary` to a user message with this prefix
 * and drops `tokensBefore` before the provider sees `context.messages`.
 */
export const CURSOR_COMPACTION_SUMMARY_PREFIX =
	"The conversation history before this point was compacted into the following summary:\n\n<summary>\n";

export interface CursorSessionCompactionWatermark {
	tokensBefore: number;
	timestamp?: string;
}

/**
 * Session-scoped rejection threshold for pre-compact occupancy. Applied until a
 * later `session_compact` overwrites it, tests reset it, or the first accepted
 * post-compact local occupancy below `tokensBefore` retires it so legitimate
 * context regrowth can exceed the old watermark.
 */
const watermarksByScope = new Map<string, CursorSessionCompactionWatermark>();
const forceCreateScopeKeys = new Set<string>();

function normalizeTokensBefore(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

export function recordCursorSessionCompactionWatermark(
	tokensBefore: unknown,
	timestamp?: string,
	scopeKey: string = getCursorSessionScopeKey(),
): CursorSessionCompactionWatermark | undefined {
	const normalized = normalizeTokensBefore(tokensBefore);
	if (normalized === undefined) return undefined;
	const watermark: CursorSessionCompactionWatermark = {
		tokensBefore: normalized,
		...(typeof timestamp === "string" && timestamp ? { timestamp } : {}),
	};
	watermarksByScope.set(scopeKey, watermark);
	return watermark;
}

export function getCursorSessionCompactionWatermark(
	scopeKey: string = getCursorSessionScopeKey(),
): CursorSessionCompactionWatermark | undefined {
	return watermarksByScope.get(scopeKey);
}

export function retireCursorSessionCompactionWatermarkAfterAcceptedOccupancy(
	occupancy: number,
	scopeKey: string = getCursorSessionScopeKey(),
): void {
	const watermark = watermarksByScope.get(scopeKey);
	if (!watermark) return;
	if (!Number.isFinite(occupancy) || occupancy <= 0 || occupancy >= watermark.tokensBefore) return;
	watermarksByScope.delete(scopeKey);
}

export function requireSessionCursorAgentCreateAfterCompaction(
	scopeKey: string = getCursorSessionScopeKey(),
): void {
	forceCreateScopeKeys.add(scopeKey);
}

export function sessionCursorAgentCreateRequiredAfterCompaction(
	scopeKey: string = getCursorSessionScopeKey(),
): boolean {
	return forceCreateScopeKeys.has(scopeKey);
}

export function noteSessionCursorAgentCreatedAfterCompaction(
	scopeKey: string = getCursorSessionScopeKey(),
): void {
	forceCreateScopeKeys.delete(scopeKey);
}

export function resetCursorSessionCompactionWatermarksForTests(): void {
	watermarksByScope.clear();
	forceCreateScopeKeys.clear();
}

export const __testUtils = {
	reset: resetCursorSessionCompactionWatermarksForTests,
};
