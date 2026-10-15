# Configuration and scoring

[简体中文](configuration.md) · **English**

Project files use JSON with `schemaVersion: 1`. Use the editor to create configurations; browser answer caches are not project files.

## Top-level fields

| Field           | Purpose                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| `schemaVersion` | Configuration format version; unsupported versions cannot be imported           |
| `id`            | Project ID for separating local drafts; generated when starting from a template |
| `site`          | Page name, text, and accent color                                               |
| `settings`      | Scale, pagination, sampling, and editor visibility                              |
| `dimensions`    | Ordered list of two-pole dimensions                                             |
| `questions`     | Question bank, up to 500 questions                                              |
| `profiles`      | Optional custom result combinations, up to 1,024 entries                        |
| `credits`       | Original and project author details                                             |

Dimensions, questions, and custom results have stable IDs. A pole’s `code` is editable display content. Questions refer to `dimensionId` and `poleId`, so changing letters does not change their assignments. Codes accept 1–4 letters, characters, or digits. Codes must differ within a dimension; different dimensions may reuse the same letter.

## Scoring

Answers range from `1` to `scalePoints`, which must be 5 or 7.

```text
midpoint = (scalePoints + 1) / 2
question direction = (answer - midpoint) / (midpoint - 1)
```

If agreement favors the left pole, the direction multiplied by the question’s weight contributes positively to the dimension. If it favors the right pole, the sign is reversed. Weights must be greater than zero and no higher than 10; decimals are allowed.

```text
left percentage = round(50 + 50 × weighted direction sum / selected question weight sum)
right percentage = 100 - left percentage
```

Only questions selected for the current test are scored. Neutral answers contribute no direction. Positive and reverse-keyed questions use the same formula. All selected questions must be answered before producing a result, and every dimension must have questions.

A tie displays `50% / 50%` and uses the dimension’s `tiePoleId` to choose its result code. The tie rule does not change the percentages or depend on random question order. Very small nonzero differences can also display 50/50 after rounding; in that case, the code follows the actual unrounded score.

## Question selection

- `selection: "all"` uses every question.
- `selection: "balanced"` selects `perPole` questions from each pole of every dimension. Required questions count toward this limit.
- `required: true` ensures a question appears in balanced sampling.
- `shuffle: true` randomizes the selected questions; otherwise, their question-bank order is preserved.

If the bank lacks enough questions or has too many required questions, the editor blocks export and identifies the affected pole. Reloading restores the selected question order and saved answers. Configuration changes invalidate incompatible answer sessions.

A question may have a `labels` array that overrides `settings.scaleLabels`. Its length must equal the scale size. This changes the visible labels, not the numeric scoring. Changing the scale size resets question-specific labels to avoid applying old labels to different options.

## Codes and feedback

Dimensions with `role: "main"` form the main code in their configured order. Dimensions with `role: "suffix"` are grouped at the end, separated from the main code by a hyphen. At least one main dimension is required.

A custom result’s `match` must cover exactly the current main dimensions using their pole IDs. Suffixes do not participate in that match; their selected pole descriptions appear separately.

```json
{
  "id": "profile-acxm",
  "match": {
    "rhythm": "left",
    "energy": "left",
    "exploration": "left",
    "decision": "left"
  },
  "name": "Inspiration explorer",
  "text": "Your custom feedback."
}
```

Without a custom match, the result combines the selected main poles’ names and descriptions. Adding a main dimension or changing a main dimension into a suffix requires updating existing custom combinations. The editor lists any affected entries. Before deleting a dimension, it shows how many linked questions and custom results will also be deleted. Undo restores them.

## Credits, drafts, and exports

`credits.original` and `credits.project` each contain `name`, `url`, and `visible`. They are independent. With `visible: false`, a credit is omitted from both the page and the share image. Links must be complete HTTP/HTTPS URLs.

Drafts may contain unfinished text. Imports and exports must pass full validation. Exported HTML contains only the configuration and application, with authored input rendered as text and JSON characters escaped to prevent premature script termination. The original file is not silently overwritten.

The app does not submit answers. Copying, PNG generation, and file export happen in the browser. Author and source-code links open external websites when clicked. Access logs maintained by a hosting provider are governed by that provider.

## Interface language is separate from content

Interface language is not a project configuration field and does not affect its fingerprint or scoring. The browser preference uses a separate storage key, `umbti:ui-language`, with `auto`, `zh`, or `en` values. Auto checks the browser’s ordered language preferences, recognizes Chinese and English variants, and defaults to English if neither is supported.

Changing the interface language preserves the current page, selected editor section, answers, draft, undo history, and authored text. The exported configuration is unchanged. Validation messages use translatable message templates while inserting user-provided names verbatim.
