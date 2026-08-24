/**
 * Cursor AskQuestion tool copy. Pi ships the strict invocation variant only
 * (`enableAntiAskQuestionToolDescription` in Cursor Desktop). Dual short/strict
 * descriptions would recreate the over-asking vs gated-asking split.
 */
export const CURSOR_ASK_QUESTION_DESCRIPTION = [
	"Collect structured multiple-choice answers from the user.",
	"",
	"STRICT INVOCATION RULES (must follow):",
	"- ALWAYS use common sense and context discovery (including the codebase, file system, and web when relevant) to understand what the user means and predict what they want.",
	"- Use this tool ONLY in exceptional and consequential circumstances, after extensive research, when a decision is genuinely the user's to make and cannot be resolved from context or sensible defaults. (Or when Q&A is explicitly requested.)",
	"- Do NOT use this tool to ask for help, inquire into details, solicit feedback on suggestions, seek rubber-stamps on unimportant decisions, or ask for confirmation.",
].join("\n");

export const CURSOR_ASK_QUESTION_PROMPT_SNIPPET =
	"Ask the user through pi UI only in exceptional blocked circumstances, after writing the analysis in assistant text";

export const CURSOR_ASK_QUESTION_PROMPT_GUIDELINES: readonly string[] = [
	"Each question should have at least 2 options for the user to choose from.",
	'Users can type a custom answer when allowCustom is true; do not add extra "Other" or "Skip" options.',
	'If you recommend a specific option, make that the first option and add "(Recommended)" at the end of the label.',
	"Write the analysis in assistant text first. The question must be a short blocked decision, not a compressed status or tradeoff dump.",
];

export const CURSOR_ASK_QUESTION_BOOTSTRAP_GUIDANCE =
	"Use pi__cursor_ask_question only in exceptional blocked circumstances if exposed.";
