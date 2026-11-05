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

test("answer-key removal is case-insensitive and handles snake/kebab/camel forms at every depth", () => {
  const input = {
    CorrectAnswer: "A",
    correct_answer: "A",
    "answer-key": "secret",
    nested: [
      { Is_Correct: true, value: "B" },
      { gradingRubric: "secret", label: "Option B" },
      { model_answer: "secret", value: "C" },
    ],
    choices: [{ value: "A", label: "Choice A" }],
  };
  assert.deepEqual(sanitizeTestQuestionOptions(input), {
    nested: [
      { value: "B" },
      { label: "Option B" },
      { value: "C" },
    ],
    choices: [{ value: "A", label: "Choice A" }],
  });
});

test("question options sanitizer is stable for primitives and arrays", () => {
  assert.deepEqual(sanitizeTestQuestionOptions(["safe", { solution: "hidden", text: "shown" }]), ["safe", { text: "shown" }]);
  assert.equal(sanitizeTestQuestionOptions(null), null);
  assert.equal(sanitizeTestQuestionOptions(0), 0);
});

test("only question types supported by the server auto-grader are accepted as gradable", () => {
  assert.equal(isAutoGradableTestQuestionType("SINGLE_CHOICE"), true);
  assert.equal(isAutoGradableTestQuestionType("number"), true);
  assert.equal(isAutoGradableTestQuestionType("ESSAY"), false);
  assert.equal(isAutoGradableTestQuestionType("SHORT_TEXT"), false);
});
