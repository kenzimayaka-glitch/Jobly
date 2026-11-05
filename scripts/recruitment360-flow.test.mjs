import test from "node:test";
import assert from "node:assert/strict";
import { isAutoGradableTestQuestionType, sanitizeTestQuestionOptions } from "../lib/recruitment360/test-runtime.ts";

test("test question options never expose answer keys or grading metadata", () => {
  const input = {
    choices: [
      { value: "A", label: "Choice A", correct: true },
      { value: "B", label: "Choice B", correct: false },
    ],
    correct: "A",
    explanation: "Private grading rationale",
    nested: { answer: 42, visible: "ok" },
  };
  assert.deepEqual(sanitizeTestQuestionOptions(input), {
    choices: [
      { value: "A", label: "Choice A" },
      { value: "B", label: "Choice B" },
    ],
    nested: { visible: "ok" },
  });
});

test("question options sanitizer is stable for primitives and arrays", () => {
  assert.deepEqual(sanitizeTestQuestionOptions(["safe", { solution: "hidden", text: "shown" }]), ["safe", { text: "shown" }]);
  assert.equal(sanitizeTestQuestionOptions(null), null);
});

test("only question types supported by the server auto-grader are accepted as gradable", () => {
  assert.equal(isAutoGradableTestQuestionType("SINGLE_CHOICE"), true);
  assert.equal(isAutoGradableTestQuestionType("number"), true);
  assert.equal(isAutoGradableTestQuestionType("ESSAY"), false);
  assert.equal(isAutoGradableTestQuestionType("SHORT_TEXT"), false);
});
