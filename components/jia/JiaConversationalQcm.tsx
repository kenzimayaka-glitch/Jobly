"use client";

import { useMemo, useState } from "react";
import type { JiaQcmQuestion } from "@/lib/jia/qcm";

type Props = {
  question: JiaQcmQuestion;
  onSubmit: (answer: { selectedIds: string[]; freeText: string }) => void;
  onVoice?: () => void;
  disabled?: boolean;
};

export function JiaConversationalQcm({
  question,
  onSubmit,
  onVoice,
  disabled = false,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const canSubmit = selected.length > 0 || otherText.trim().length > 0;

  const visibleOptions = useMemo(
    () => question.options.slice(0, 4),
    [question.options],
  );

  function toggle(id: string) {
    setSelected((current) => {
      if (question.multiple) {
        return current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id];
      }
      return current[0] === id ? [] : [id];
    });
  }

  function submit() {
    if (!canSubmit || disabled) return;
    onSubmit({ selectedIds: selected, freeText: otherText.trim() });
  }

  return (
    <section aria-label="Question J’IA" className="space-y-3">
      <p className="text-sm font-medium">{question.prompt}</p>

      <div className="grid gap-2">
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={checked}
              onClick={() => toggle(option.id)}
              className="rounded-xl border px-3 py-2 text-left text-sm transition"
            >
              <span className="mr-2" aria-hidden>
                {checked ? "☑" : "☐"}
              </span>
              {option.label}
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          aria-pressed={otherText.trim().length > 0}
          onClick={() => setOtherText((value) => value)}
          className="rounded-xl border px-3 py-2 text-left text-sm"
        >
          <span className="mr-2" aria-hidden>☐</span>
          {question.other.label}
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={otherText}
          onChange={(event) => setOtherText(event.target.value)}
          rows={2}
          maxLength={300}
          placeholder={question.other.placeholder}
          aria-label="Réponse libre"
          className="min-h-16 flex-1 resize-none rounded-xl border px-3 py-2 text-sm"
        />
        {question.voiceEnabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={onVoice}
            aria-label="Répondre vocalement"
            title="Répondre vocalement"
            className="rounded-full border px-3 py-3"
          >
            🎙️
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={!canSubmit || disabled}
        onClick={submit}
        className="rounded-xl px-4 py-2 text-sm font-medium"
      >
        Continuer
      </button>
    </section>
  );
}
