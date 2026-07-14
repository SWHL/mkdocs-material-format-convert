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
    } catch (_) {
      return;
    }
  }

  function convertNow() {
    var input = sourceInput.value;
    var result = window.MkdocsMaterialConverter.convert(input, readOptions());

    resultOutput.value = result.markdown;
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
  convertNow();
})();