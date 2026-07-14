const assert = require("node:assert/strict");
const { convert } = require("../converter.js");

function run(name, fn) {
  try {
    fn();
    console.log("ok - " + name);
  } catch (error) {
    console.error("not ok - " + name);
    throw error;
  }
}

run("converts admonitions and details to blockquotes", () => {
  const input = [
    "!!! note \"Readable title\"",
    "    Keep this paragraph.",
    "",
    "???+ warning",
    "    Be careful.",
  ].join("\n");
  const output = convert(input).markdown;

  assert.match(output, /> \*\*Readable title\*\*/);
  assert.match(output, /> Keep this paragraph\./);
  assert.match(output, /> \*\*Warning\*\*/);
  assert.match(output, /> Be careful\./);
});

run("converts content tabs and normalizes fenced code info", () => {
  const input = [
    "=== \"Python\"",
    "    ``` py linenums=\"1\" title=\"demo.py\"",
    "    print(\"hi\")  # (1)!",
    "    ```",
  ].join("\n");
  const output = convert(input).markdown;

  assert.match(output, /#### Python/);
  assert.match(output, /```py/);
  assert.match(output, /print\("hi"\)$/m);
  assert.doesNotMatch(output, /linenums/);
  assert.doesNotMatch(output, /\(1\)!/);
});

run("removes button attributes and Material icon shortcodes", () => {
  const input = [
    "[Open](https://example.com){ .md-button .md-button--primary }",
    "- :fontawesome-solid-paper-plane: Send it",
    "![Alt](image.png){ width=\"320\" }",
  ].join("\n");
  const output = convert(input).markdown;

  assert.match(output, /\[Open\]\(https:\/\/example\.com\)/);
  assert.match(output, /- Send it/);
  assert.match(output, /!\[Alt\]\(image\.png\)/);
  assert.doesNotMatch(output, /md-button|fontawesome|width=/);
});

run("keeps list indentation while stripping standalone annotation attributes", () => {
  const input = [
    "Text with annotation.(1)",
    "{ .annotate }",
    "",
    "1. First",
    "   - Nested item",
  ].join("\n");
  const output = convert(input).markdown;

  assert.match(output, /annotation\.\[1\]/);
  assert.doesNotMatch(output, /annotate/);
  assert.match(output, /^   - Nested item$/m);
});

run("converts pymdownx formatting to portable markdown", () => {
  const input = "==mark== {--old--} {++new++} {~~bad~>good~~} ++ctrl+alt+del++ H~2~O x^2^";
  const output = convert(input).markdown;

  assert.match(output, /\*\*mark\*\*/);
  assert.match(output, /~~old~~/);
  assert.match(output, /new/);
  assert.match(output, /~~bad~~ good/);
  assert.match(output, /`Ctrl` \+ `Alt` \+ `Del`/);
  assert.match(output, /H2O/);
  assert.match(output, /x2/);
});

run("unwraps caption and snippet blocks", () => {
  const input = [
    "/// caption",
    "A figure caption",
    "///",
    "",
    "--8<-- \"includes/example.md\"",
  ].join("\n");
  const result = convert(input);

  assert.match(result.markdown, /\*Caption: A figure caption\*/);
  assert.match(result.markdown, /<!-- Snippet omitted: \"includes\/example\.md\" -->/);
  assert.equal(result.warnings.length, 1);
});
run("removes more marker comments", () => {
  const input = [
    "Intro paragraph.",
    "<!--more-->",
    "More content.",
    "Keep <!-- more --> inline text.",
  ].join("\n");
  const result = convert(input);

  assert.doesNotMatch(result.markdown, /<!--\s*more\s*-->/i);
  assert.match(result.markdown, /Intro paragraph\.\nMore content\./);
  assert.match(result.markdown, /Keep inline text\./);
  assert.equal(result.stats.moreComments, 2);
});

run("converts YAML front matter to markdown elements", () => {
  const input = [
    "---",
    "title: Portable Markdown",
    "date: 2026-07-14",
    "tags: [mkdocs, material]",
    "description: A short summary.",
    "draft: false",
    "---",
    "",
    "Body text.",
  ].join("\n");
  const result = convert(input);

  assert.match(result.markdown, /^# Portable Markdown/);
  assert.match(result.markdown, /> A short summary\./);
  assert.match(result.markdown, /- \*\*Date:\*\* 2026-07-14/);
  assert.match(result.markdown, /- \*\*Tags:\*\* mkdocs, material/);
  assert.match(result.markdown, /- \*\*Draft:\*\* false/);
  assert.doesNotMatch(result.markdown, /^---$/m);
  assert.equal(result.stats.yamlFrontMatter, 5);
});