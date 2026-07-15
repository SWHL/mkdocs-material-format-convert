(function () {
  var STORAGE_KEY = "mkdocs-material-converter-state-v1";
  var OPTION_IDS = [
    "stripAttributes",
    "removeMoreComments",
    "convertYamlFrontMatter",
    "stripMaterialIcons",
    "stripEmojiShortcodes",
    "convertAnnotations",
    "convertFormatting",
    "unwrapHtmlBlocks",
    "removeSnippetIncludes",
    "normalizeFenceInfo",
  ];

  var STAT_LABELS = [
    ["admonitions", "Admonitions / details"],
    ["contentTabs", "Content tabs"],
    ["attributes", "Attribute lists"],
    ["moreComments", "<!--more-->"],
    ["yamlFrontMatter", "YAML 属性"],
    ["annotationMarkers", "Annotation 标记"],
    ["codeAnnotationMarkers", "代码 annotation"],
    ["materialIcons", "Material 图标"],
    ["emojiShortcodes", "Emoji shortcode"],
    ["formatting", "Formatting / keys"],
    ["htmlWrappers", "Grid / figure 包装"],
    ["captions", "Captions"],
    ["snippetIncludes", "Snippet includes"],
    ["abbreviations", "Abbreviations"],
    ["fenceInfo", "代码块参数"],
    ["genericBlocks", "其他 /// 块"],
  ];

  var SAMPLE = [
    "---",
    "title: 示例文档",
    "date: 2026-07-14",
    "tags: [MkDocs, Markdown, Migration]",
    "description: 这段 YAML 属性会转换为标题、摘要和元信息列表。",
    "---",
    "",
    "<!--more-->",
    "",
    "!!! note \"自定义提示\"",
    "    Material 的 admonition 会被转换为标准 blockquote。",
    "",
    "???+ warning \"折叠警告\"",
    "    折叠状态无法在标准 Markdown 中表达，所以保留标题和正文。",
    "",
    "=== \"Python\"",
    "    ``` py linenums=\"1\" title=\"demo.py\"",
    "    print(\"hello\")  # (1)!",
    "    ```",
    "",
    "=== \"JavaScript\"",
    "    ``` js hl_lines=\"1\"",
    "    console.log(\"hello\") // (1)!",
    "    ```",
    "",
    "[打开文档](https://squidfunk.github.io/mkdocs-material/){ .md-button .md-button--primary }",
    "",
    "这是一段带 annotation 的文字。(1)",
    "{ .annotate }",
    "",
    "1. :material-information-outline: annotation 的解释文字。",
    "",
    "- :fontawesome-solid-paper-plane: 图标会被移除，列表内容保留。",
    "- ==高亮==、{--删除--}、{++新增++}、++ctrl+alt+del++ 会降级。",
    "- 化学式 H~2~O 和 x^2^ 会转成普通可读文本。",
    "",
    "/// caption",
    "示例图片说明文字",
    "///",
    "",
    "--8<-- \"includes/example.md\"",
  ].join("\n");

  var sourceInput = document.getElementById("sourceInput");
  var resultOutput = document.getElementById("resultOutput");
  var previewOutput = document.getElementById("previewOutput");
  var markdownView = document.getElementById("markdownView");
  var previewView = document.getElementById("previewView");
  var outputViewTabs = Array.prototype.slice.call(
    document.querySelectorAll("[data-output-view]")
  );
  var statsGrid = document.getElementById("statsGrid");
  var warnings = document.getElementById("warnings");
  var inputMeta = document.getElementById("inputMeta");
  var outputMeta = document.getElementById("outputMeta");
  var convertStatus = document.getElementById("convertStatus");
  var copyStatus = document.getElementById("copyStatus");
  var copyButton = document.getElementById("copyButton");
  var downloadButton = document.getElementById("downloadButton");
  var clearButton = document.getElementById("clearButton");
  var sampleButton = document.getElementById("sampleButton");
  var tabHeadingLevel = document.getElementById("tabHeadingLevel");
  var activeOutputView = "markdown";

  function readOptions() {
    var options = {
      tabHeadingLevel: Number(tabHeadingLevel.value),
    };

    OPTION_IDS.forEach(function (id) {
      options[id] = document.getElementById(id).checked;
    });

    return options;
  }

  function saveState() {
    var state = {
      source: sourceInput.value,
      options: readOptions(),
      outputView: activeOutputView,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      return;
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return;
      }

      var state = JSON.parse(raw);

      if (typeof state.source === "string") {
        sourceInput.value = state.source;
      }

      if (state.options) {
        OPTION_IDS.forEach(function (id) {
          if (typeof state.options[id] === "boolean") {
            document.getElementById(id).checked = state.options[id];
          }
        });

        if (state.options.tabHeadingLevel) {
          tabHeadingLevel.value = String(state.options.tabHeadingLevel);
        }
      }

      if (state.outputView === "preview") {
        activeOutputView = "preview";
      }
    } catch (_) {
      return;
    }
  }

  function convertNow() {
    var input = sourceInput.value;
    var result = window.MkdocsMaterialConverter.convert(input, readOptions());

    resultOutput.value = result.markdown;
    renderPreview(result.markdown);
    renderMeta(inputMeta, input);
    renderMeta(outputMeta, result.markdown);
    renderStats(result.stats);
    renderWarnings(result.warnings);
    convertStatus.textContent = input.trim() ? "已转换" : "等待输入";
    saveState();
  }

  function renderMeta(node, text) {
    var chars = text.length;
    var lines = chars === 0 ? 0 : text.split("\n").length;
    node.textContent = chars + " 字符，" + lines + " 行";
  }

  function renderStats(stats) {
    statsGrid.innerHTML = "";

    var hasAny = STAT_LABELS.some(function (entry) {
      return stats[entry[0]] > 0;
    });

    if (!hasAny) {
      var empty = document.createElement("div");
      empty.className = "stat-chip";
      empty.innerHTML = "<strong>0</strong><span>暂无命中的扩展语法</span>";
      statsGrid.appendChild(empty);
      return;
    }

    STAT_LABELS.forEach(function (entry) {
      var value = stats[entry[0]] || 0;

      if (value === 0) {
        return;
      }

      var chip = document.createElement("div");
      chip.className = "stat-chip";
      chip.innerHTML = "<strong>" + value + "</strong><span>" + entry[1] + "</span>";
      statsGrid.appendChild(chip);
    });
  }

  function renderWarnings(items) {
    if (!items.length) {
      warnings.hidden = true;
      warnings.textContent = "";
      return;
    }

    warnings.hidden = false;
    warnings.innerHTML = items.map(escapeHtml).join("<br />");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderPreview(markdown) {
    var rendered = renderMarkdown(markdown);
    previewOutput.innerHTML = rendered || '<p class="preview-empty">暂无预览内容</p>';
  }

  function renderMarkdown(markdown) {
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    return renderBlocks(lines).trim();
  }

  function renderBlocks(lines) {
    var html = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];

      if (!line.trim()) {
        index += 1;
        continue;
      }

      if (isFenceStart(line)) {
        var codeBlock = renderCodeBlock(lines, index);
        html.push(codeBlock.html);
        index = codeBlock.next;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        var quoteBlock = renderBlockquote(lines, index);
        html.push(quoteBlock.html);
        index = quoteBlock.next;
        continue;
      }

      if (isTableStart(lines, index)) {
        var tableBlock = renderTable(lines, index);
        html.push(tableBlock.html);
        index = tableBlock.next;
        continue;
      }

      if (isListStart(line)) {
        var listBlock = renderList(lines, index);
        html.push(listBlock.html);
        index = listBlock.next;
        continue;
      }

      if (/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.test(line)) {
        html.push(renderHeading(line));
        index += 1;
        continue;
      }

      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr />");
        index += 1;
        continue;
      }

      var paragraph = collectParagraph(lines, index);
      html.push("<p>" + renderInline(paragraph.text) + "</p>");
      index = paragraph.next;
    }

    return html.join("\n");
  }

  function isFenceStart(line) {
    return /^\s{0,3}```/.test(line);
  }

  function renderCodeBlock(lines, start) {
    var first = lines[start].trim();
    var language = first.replace(/^```+/, "").trim().split(/\s+/)[0] || "";
    var content = [];
    var index = start + 1;

    while (index < lines.length && !/^\s{0,3}```\s*$/.test(lines[index])) {
      content.push(lines[index]);
      index += 1;
    }

    if (index < lines.length) {
      index += 1;
    }

    var languageClass = language ? ' class="language-' + escapeAttribute(language) + '"' : "";

    return {
      html: "<pre><code" + languageClass + ">" + escapeHtml(content.join("\n")) + "</code></pre>",
      next: index,
    };
  }

  function renderBlockquote(lines, start) {
    var content = [];
    var index = start;

    while (index < lines.length) {
      if (!lines[index].trim()) {
        content.push("");
        index += 1;
        continue;
      }

      if (!/^\s{0,3}>/.test(lines[index])) {
        break;
      }

      content.push(lines[index].replace(/^\s{0,3}>\s?/, ""));
      index += 1;
    }

    return {
      html: "<blockquote>" + renderBlocks(content) + "</blockquote>",
      next: index,
    };
  }

  function isTableStart(lines, index) {
    return (
      index + 1 < lines.length &&
      /\|/.test(lines[index]) &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
    );
  }

  function renderTable(lines, start) {
    var headers = splitTableRow(lines[start]);
    var alignments = splitTableRow(lines[start + 1]).map(function (cell) {
      var value = cell.trim();

      if (/^:-+:$/.test(value)) {
        return "center";
      }

      if (/^-+:$/.test(value)) {
        return "right";
      }

      return /^:-+$/.test(value) ? "left" : "";
    });
    var rows = [];
    var index = start + 2;

    while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
      rows.push(splitTableRow(lines[index]));
      index += 1;
    }

    var head = headers
      .map(function (cell, cellIndex) {
        return renderTableCell("th", cell, alignments[cellIndex]);
      })
      .join("");
    var body = rows
      .map(function (row) {
        return (
          "<tr>" +
          row
            .map(function (cell, cellIndex) {
              return renderTableCell("td", cell, alignments[cellIndex]);
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");

    return {
      html: "<table><thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>",
      next: index,
    };
  }

  function splitTableRow(row) {
    var cells = row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return cells.map(function (cell) {
      return cell.trim();
    });
  }

  function renderTableCell(tag, cell, alignment) {
    var style = alignment ? ' style="text-align: ' + alignment + '"' : "";
    return "<" + tag + style + ">" + renderInline(cell) + "</" + tag + ">";
  }

  function isListStart(line) {
    return /^\s{0,3}(?:[-*+]\s+|\d+\.\s+)/.test(line);
  }

  function renderList(lines, start) {
    var ordered = /^\s{0,3}\d+\.\s+/.test(lines[start]);
    var tag = ordered ? "ol" : "ul";
    var items = [];
    var index = start;

    while (index < lines.length && isListStart(lines[index])) {
      var item = lines[index].replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/, "");
      index += 1;

      while (
        index < lines.length &&
        lines[index].trim() &&
        !startsNewBlock(lines[index]) &&
        /^\s{2,}/.test(lines[index])
      ) {
        item += "\n" + lines[index].trim();
        index += 1;
      }

      items.push("<li>" + renderInline(item).replace(/\n/g, "<br />") + "</li>");
    }

    return {
      html: "<" + tag + ">" + items.join("") + "</" + tag + ">",
      next: index,
    };
  }

  function renderHeading(line) {
    var match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    var level = match[1].length;
    return "<h" + level + ">" + renderInline(match[2]) + "</h" + level + ">";
  }

  function collectParagraph(lines, start) {
    var parts = [];
    var index = start;

    while (index < lines.length && lines[index].trim() && !startsNewBlock(lines[index], lines[index + 1])) {
      parts.push(lines[index].trim());
      index += 1;
    }

    return {
      text: parts.join(" "),
      next: index,
    };
  }

  function startsNewBlock(line, nextLine) {
    return (
      isFenceStart(line) ||
      /^\s{0,3}>/.test(line) ||
      /^\s{0,3}(#{1,6})\s+/.test(line) ||
      /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line) ||
      isListStart(line) ||
      (typeof nextLine === "string" && isTableStart([line, nextLine], 0))
    );
  }

  function renderInline(text) {
    var tokens = [];
    var source = String(text || "");

    function hold(html) {
      tokens.push(html);
      return "\u0000" + (tokens.length - 1) + "\u0000";
    }

    source = source.replace(/`([^`]+)`/g, function (_, code) {
      return hold("<code>" + escapeHtml(code) + "</code>");
    });

    source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+\"([^\"]*)\")?\)/g, function (
      _,
      alt,
      url,
      title
    ) {
      var safe = sanitizeUrl(url);

      if (!safe) {
        return alt;
      }

      var titleAttr = title ? ' title="' + escapeAttribute(title) + '"' : "";
      return hold(
        '<img src="' +
          escapeAttribute(safe) +
          '" alt="' +
          escapeAttribute(alt) +
          '"' +
          titleAttr +
          " />"
      );
    });

    source = source.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+\"([^\"]*)\")?\)/g, function (
      _,
      label,
      url,
      title
    ) {
      var safe = sanitizeUrl(url);

      if (!safe) {
        return label;
      }

      var titleAttr = title ? ' title="' + escapeAttribute(title) + '"' : "";
      return hold(
        '<a href="' +
          escapeAttribute(safe) +
          '"' +
          titleAttr +
          ' target="_blank" rel="noopener noreferrer">' +
          renderInline(label) +
          "</a>"
      );
    });

    var html = escapeHtml(source)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>")
      .replace(/_([^_\s][^_]*?)_/g, "<em>$1</em>");

    return html.replace(/\u0000(\d+)\u0000/g, function (_, index) {
      return tokens[Number(index)] || "";
    });
  }

  function sanitizeUrl(url) {
    var value = String(url || "").trim().replace(/[\u0000-\u001f\u007f\s]/g, "");

    if (
      /^(https?:|mailto:)/i.test(value) ||
      /^#/.test(value) ||
      /^\//.test(value) ||
      /^\.\.?\//.test(value) ||
      /^[^:]+$/.test(value)
    ) {
      return value;
    }

    return "";
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function setOutputView(view) {
    activeOutputView = view === "preview" ? "preview" : "markdown";

    outputViewTabs.forEach(function (button) {
      var isActive = button.dataset.outputView === activeOutputView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    markdownView.hidden = activeOutputView !== "markdown";
    previewView.hidden = activeOutputView !== "preview";
    saveState();
  }

  function copyResult() {
    var text = resultOutput.value;

    if (!text) {
      copyStatus.textContent = "无内容";
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          flashCopyStatus("已复制");
        },
        fallbackCopy
      );
      return;
    }

    fallbackCopy();
  }

  function fallbackCopy() {
    resultOutput.focus();
    resultOutput.select();
    document.execCommand("copy");
    flashCopyStatus("已复制");
  }

  function flashCopyStatus(text) {
    copyStatus.textContent = text;
    window.clearTimeout(flashCopyStatus.timer);
    flashCopyStatus.timer = window.setTimeout(function () {
      copyStatus.textContent = "本地转换";
    }, 1600);
  }

  function downloadResult() {
    var text = resultOutput.value;
    var blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "converted.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  var isSyncingScroll = false;

  function syncScroll(from, to) {
    if (isSyncingScroll) {
      return;
    }

    var maxFrom = from.scrollHeight - from.clientHeight;
    var maxTo = to.scrollHeight - to.clientHeight;

    if (maxFrom <= 0 || maxTo <= 0) {
      return;
    }

    isSyncingScroll = true;
    to.scrollTop = (from.scrollTop / maxFrom) * maxTo;
    window.requestAnimationFrame(function () {
      isSyncingScroll = false;
    });
  }

  function bindEvents() {
    sourceInput.addEventListener("input", convertNow);
    sourceInput.addEventListener("scroll", function () {
      syncScroll(sourceInput, resultOutput);
    });
    resultOutput.addEventListener("scroll", function () {
      syncScroll(resultOutput, sourceInput);
    });
    tabHeadingLevel.addEventListener("change", convertNow);

    OPTION_IDS.forEach(function (id) {
      document.getElementById(id).addEventListener("change", convertNow);
    });

    outputViewTabs.forEach(function (button) {
      button.addEventListener("click", function () {
        setOutputView(button.dataset.outputView);
      });
    });

    copyButton.addEventListener("click", copyResult);
    downloadButton.addEventListener("click", downloadResult);
    clearButton.addEventListener("click", function () {
      sourceInput.value = "";
      convertNow();
      sourceInput.focus();
    });
    sampleButton.addEventListener("click", function () {
      sourceInput.value = SAMPLE;
      convertNow();
      sourceInput.focus();
    });
  }

  loadState();
  bindEvents();
  setOutputView(activeOutputView);
  convertNow();
})();
