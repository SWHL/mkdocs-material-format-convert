(function (root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.MkdocsMaterialConverter = api;
})(typeof self !== "undefined" ? self : this, function () {
  var DEFAULT_OPTIONS = {
    tabHeadingLevel: 4,
    stripMaterialIcons: true,
    stripEmojiShortcodes: false,
    stripAttributes: true,
    removeMoreComments: true,
    convertYamlFrontMatter: true,
    convertAnnotations: true,
    convertFormatting: true,
    unwrapHtmlBlocks: true,
    removeSnippetIncludes: true,
    normalizeFenceInfo: true,
    trimTrailingSpaces: true,
  };

  var ADMONITION_TITLES = {
    note: "Note",
    abstract: "Abstract",
    summary: "Summary",
    tldr: "TL;DR",
    info: "Info",
    todo: "Todo",
    tip: "Tip",
    hint: "Hint",
    important: "Important",
    success: "Success",
    check: "Check",
    done: "Done",
    question: "Question",
    help: "Help",
    faq: "FAQ",
    warning: "Warning",
    caution: "Caution",
    attention: "Attention",
    failure: "Failure",
    fail: "Failure",
    missing: "Missing",
    danger: "Danger",
    error: "Error",
    bug: "Bug",
    example: "Example",
    quote: "Quote",
    cite: "Citation",
  };

  var SUBSCRIPT = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "+": "+",
    "-": "-",
    "=": "=",
    "(": "(",
    ")": ")",
    a: "a",
    e: "e",
    h: "h",
    i: "i",
    j: "j",
    k: "k",
    l: "l",
    m: "m",
    n: "n",
    o: "o",
    p: "p",
    r: "r",
    s: "s",
    t: "t",
    u: "u",
    v: "v",
    x: "x",
  };

  var SUPERSCRIPT = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "+": "+",
    "-": "-",
    "=": "=",
    "(": "(",
    ")": ")",
    A: "A",
    B: "B",
    D: "D",
    E: "E",
    G: "G",
    H: "H",
    I: "I",
    J: "J",
    K: "K",
    L: "L",
    M: "M",
    N: "N",
    O: "O",
    P: "P",
    R: "R",
    T: "T",
    U: "U",
    V: "V",
    W: "W",
    a: "a",
    b: "b",
    c: "c",
    d: "d",
    e: "e",
    f: "f",
    g: "g",
    h: "h",
    i: "i",
    j: "j",
    k: "k",
    l: "l",
    m: "m",
    n: "n",
    o: "o",
    p: "p",
    r: "r",
    s: "s",
    t: "t",
    u: "u",
    v: "v",
    w: "w",
    x: "x",
    y: "y",
    z: "z",
  };

  var KEY_LABELS = {
    alt: "Alt",
    backspace: "Backspace",
    cmd: "Command",
    command: "Command",
    ctrl: "Ctrl",
    control: "Ctrl",
    del: "Del",
    delete: "Del",
    down: "Down",
    enter: "Enter",
    esc: "Esc",
    escape: "Esc",
    left: "Left",
    meta: "Meta",
    option: "Option",
    pgdn: "Page Down",
    pgup: "Page Up",
    right: "Right",
    shift: "Shift",
    space: "Space",
    tab: "Tab",
    up: "Up",
    win: "Windows",
  };

  function convert(input, userOptions) {
    var options = Object.assign({}, DEFAULT_OPTIONS, userOptions || {});
    var stats = createStats();
    var source = String(input || "").replace(/\r\n?/g, "\n");
    var lines = source.split("\n");

    if (options.convertYamlFrontMatter) {
      lines = convertYamlFrontMatter(lines, stats);
    }

    var context = {
      annotationLikely: detectAnnotationUsage(lines),
    };

    var blockLines = convertBlocks(lines, options, stats);
    var inlineLines = convertInlineLines(blockLines, options, stats, context);
    var markdown = inlineLines.join("\n");

    if (options.trimTrailingSpaces) {
      markdown = markdown
        .split("\n")
        .map(function (line) {
          return line.replace(/[ \t]+$/g, "");
        })
        .join("\n");
    }

    markdown = markdown.replace(/\n{4,}/g, "\n\n\n");

    return {
      markdown: markdown,
      stats: stats,
      warnings: buildWarnings(stats),
    };
  }

  function createStats() {
    return {
      admonitions: 0,
      contentTabs: 0,
      captions: 0,
      attributes: 0,
      moreComments: 0,
      yamlFrontMatter: 0,
      annotationMarkers: 0,
      codeAnnotationMarkers: 0,
      materialIcons: 0,
      emojiShortcodes: 0,
      formatting: 0,
      htmlWrappers: 0,
      snippetIncludes: 0,
      abbreviations: 0,
      fenceInfo: 0,
      genericBlocks: 0,
    };
  }

  function buildWarnings(stats) {
    var warnings = [];

    if (stats.snippetIncludes > 0) {
      warnings.push(
        "检测到 --8<-- snippet include。浏览器无法读取本地片段文件，已转换为注释占位。"
      );
    }

    if (stats.genericBlocks > 0) {
      warnings.push("检测到未识别的 /// 块语法，已展开保留块内 Markdown。");
    }

    return warnings;
  }

  function convertYamlFrontMatter(lines, stats) {
    if (lines.length < 3 || lines[0].replace(/^\uFEFF/, "").trim() !== "---") {
      return lines;
    }

    var endIndex = -1;

    for (var i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return lines;
    }

    var entries = parseYamlEntries(lines.slice(1, endIndex));
    var body = lines.slice(endIndex + 1);

    if (entries.length === 0) {
      return body;
    }

    stats.yamlFrontMatter += entries.length;

    return formatYamlEntries(entries, body).concat(body);
  }

  function parseYamlEntries(lines) {
    var entries = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      var match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);

      if (!match || line.trim().charAt(0) === "#") {
        i += 1;
        continue;
      }

      var key = match[1];
      var rawValue = (match[2] || "").trim();
      var value;
      var collected = [];
      var next = i + 1;

      if (rawValue === "|" || rawValue === ">") {
        while (next < lines.length && !/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.test(lines[next])) {
          collected.push(lines[next]);
          next += 1;
        }

        value = stripYamlBlockIndent(collected).join(rawValue === ">" ? " " : "\n").trim();
      } else if (rawValue === "") {
        while (next < lines.length && !/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.test(lines[next])) {
          if (lines[next].trim() !== "") {
            collected.push(lines[next]);
          }
          next += 1;
        }

        value = parseYamlCollection(collected);
      } else {
        value = parseYamlScalar(rawValue);
      }

      entries.push({ key: key, value: value });
      i = next;
    }

    return entries;
  }

  function parseYamlCollection(lines) {
    var values = [];

    lines.forEach(function (line) {
      var trimmed = line.trim();

      if (!trimmed || trimmed.charAt(0) === "#") {
        return;
      }

      if (trimmed.indexOf("- ") === 0) {
        values.push(parseYamlScalar(trimmed.slice(2)));
      } else {
        values.push(parseYamlScalar(trimmed));
      }
    });

    if (values.length === 0) {
      return "";
    }

    return values.length === 1 ? values[0] : values;
  }

  function parseYamlScalar(value) {
    var trimmed = String(value || "").trim();

    if (trimmed === "[]" || trimmed === "null" || trimmed === "~") {
      return "";
    }

    if (/^\[[\s\S]*\]$/.test(trimmed)) {
      return splitYamlArray(trimmed.slice(1, -1)).map(parseYamlScalar);
    }

    var quoted = trimmed.match(/^("|')([\s\S]*)\1$/);

    if (quoted) {
      return quoted[2];
    }

    return trimmed;
  }

  function splitYamlArray(value) {
    var items = [];
    var current = "";
    var quote = "";

    for (var i = 0; i < value.length; i += 1) {
      var char = value[i];

      if (quote) {
        if (char === quote) {
          quote = "";
        }
        current += char;
        continue;
      }

      if (char === "\"" || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === ",") {
        items.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      items.push(current.trim());
    }

    return items;
  }

  function stripYamlBlockIndent(lines) {
    var minIndent = null;

    lines.forEach(function (line) {
      if (line.trim() === "") {
        return;
      }

      var indent = countIndent(line);
      minIndent = minIndent === null ? indent : Math.min(minIndent, indent);
    });

    if (minIndent === null) {
      return [];
    }

    return lines.map(function (line) {
      return line.trim() === "" ? "" : line.slice(minIndent);
    });
  }

  function formatYamlEntries(entries, body) {
    var output = [];
    var meta = [];
    var consumed = {};
    var title = findYamlEntry(entries, ["title"]);
    var subtitle = findYamlEntry(entries, ["subtitle"]);
    var summaryEntries = entries.filter(function (entry) {
      return ["description", "summary", "abstract", "excerpt"].indexOf(normalizeYamlKey(entry.key)) !== -1;
    });

    if (title && flattenYamlValue(title.value) && !bodyStartsWithSameH1(body, flattenYamlValue(title.value))) {
      output.push("# " + flattenYamlValue(title.value));
      consumed[normalizeYamlKey(title.key)] = true;
    } else if (title) {
      consumed[normalizeYamlKey(title.key)] = true;
    }

    if (subtitle && flattenYamlValue(subtitle.value)) {
      if (output.length > 0) {
        output.push("");
      }
      output.push("> " + flattenYamlValue(subtitle.value));
      consumed[normalizeYamlKey(subtitle.key)] = true;
    }

    summaryEntries.forEach(function (entry) {
      var value = flattenYamlValue(entry.value);

      if (!value) {
        consumed[normalizeYamlKey(entry.key)] = true;
        return;
      }

      if (output.length > 0) {
        output.push("");
      }

      value.split("\n").forEach(function (line) {
        output.push(line.trim() === "" ? ">" : "> " + line);
      });
      consumed[normalizeYamlKey(entry.key)] = true;
    });

    entries.forEach(function (entry) {
      var normalized = normalizeYamlKey(entry.key);
      var value = flattenYamlValue(entry.value);

      if (consumed[normalized] || !value) {
        return;
      }

      meta.push("- **" + labelYamlKey(normalized) + ":** " + value);
    });

    if (meta.length > 0) {
      if (output.length > 0) {
        output.push("");
      }
      Array.prototype.push.apply(output, meta);
    }

    if (output.length > 0 && bodyHasContent(body)) {
      output.push("");
    }

    return output;
  }

  function findYamlEntry(entries, keys) {
    for (var i = 0; i < entries.length; i += 1) {
      if (keys.indexOf(normalizeYamlKey(entries[i].key)) !== -1) {
        return entries[i];
      }
    }

    return null;
  }

  function normalizeYamlKey(key) {
    return String(key || "").toLowerCase().replace(/_/g, "-");
  }

  function labelYamlKey(key) {
    var labels = {
      author: "Author",
      authors: "Authors",
      categories: "Categories",
      category: "Category",
      created: "Created",
      date: "Date",
      draft: "Draft",
      hide: "Hide",
      modified: "Modified",
      slug: "Slug",
      tags: "Tags",
      updated: "Updated",
    };

    return labels[key] || titleCase(key);
  }

  function flattenYamlValue(value) {
    if (Array.isArray(value)) {
      return value.map(flattenYamlValue).filter(Boolean).join(", ");
    }

    return String(value || "").trim();
  }

  function bodyStartsWithSameH1(body, title) {
    var normalizedTitle = normalizeHeadingText(title);

    for (var i = 0; i < body.length; i += 1) {
      if (body[i].trim() === "") {
        continue;
      }

      var match = body[i].match(/^#\s+(.+)$/);
      return !!match && normalizeHeadingText(match[1]) === normalizedTitle;
    }

    return false;
  }

  function normalizeHeadingText(value) {
    return String(value || "").replace(/#+\s*$/g, "").trim().toLowerCase();
  }

  function bodyHasContent(body) {
    return body.some(function (line) {
      return line.trim() !== "";
    });
  }
  function convertBlocks(lines, options, stats) {
    var output = [];
    var inFence = false;
    var fenceChar = "";
    var fenceSize = 0;
    var gridDepth = 0;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var fence = matchFence(line);

      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceChar = fence.char;
          fenceSize = fence.size;
          output.push(
            options.normalizeFenceInfo
              ? normalizeFenceLine(line, fence, stats)
              : line
          );
          continue;
        }

        if (fence.char === fenceChar && fence.size >= fenceSize) {
          inFence = false;
          fenceChar = "";
          fenceSize = 0;
        }

        output.push(line);
        continue;
      }

      if (inFence) {
        output.push(stripCodeAnnotationMarker(line, options, stats));
        continue;
      }

      if (options.unwrapHtmlBlocks && isMarkdownGridOpen(line)) {
        gridDepth += 1;
        stats.htmlWrappers += 1;
        continue;
      }

      if (options.unwrapHtmlBlocks && gridDepth > 0 && isClosingDiv(line)) {
        gridDepth -= 1;
        stats.htmlWrappers += 1;
        continue;
      }

      if (options.unwrapHtmlBlocks && isFigureWrapper(line)) {
        stats.htmlWrappers += 1;
        continue;
      }

      var figcaption = matchFigcaption(line);
      if (figcaption) {
        output.push("*Caption: " + figcaption + "*");
        stats.captions += 1;
        continue;
      }

      var admonition = matchAdmonition(line);
      if (admonition) {
        var admonitionBlock = gatherIndentedBlock(lines, i, admonition.indent);
        var admonitionBody = stripIndent(
          trimOuterBlankLines(admonitionBlock.body),
          admonition.indent + 4
        );
        var convertedAdmonitionBody = convertBlocks(
          admonitionBody,
          options,
          stats
        );
        var admonitionInfo = parseAdmonitionInfo(admonition.info);
        appendWithSpacing(
          output,
          formatAdmonition(admonitionInfo, convertedAdmonitionBody)
        );
        stats.admonitions += 1;
        i = admonitionBlock.nextIndex - 1;
        continue;
      }

      var tab = matchContentTab(line);
      if (tab) {
        var tabBlock = gatherIndentedBlock(lines, i, tab.indent);
        var tabBody = stripIndent(
          trimOuterBlankLines(tabBlock.body),
          tab.indent + 4
        );
        var convertedTabBody = convertBlocks(tabBody, options, stats);
        appendWithSpacing(output, formatContentTab(tab.title, convertedTabBody, options));
        stats.contentTabs += 1;
        i = tabBlock.nextIndex - 1;
        continue;
      }

      var caption = matchCaptionBlock(line);
      if (caption) {
        var captionBlock = gatherDelimitedBlock(lines, i, caption.indent);
        appendWithSpacing(
          output,
          formatCaptionBlock(
            convertBlocks(
              stripIndent(trimOuterBlankLines(captionBlock.body), caption.indent),
              options,
              stats
            )
          )
        );
        stats.captions += 1;
        i = captionBlock.nextIndex - 1;
        continue;
      }

      var genericBlock = matchGenericSlashBlock(line);
      if (genericBlock) {
        var slashBlock = gatherDelimitedBlock(lines, i, genericBlock.indent);
        appendWithSpacing(
          output,
          convertBlocks(
            stripIndent(trimOuterBlankLines(slashBlock.body), genericBlock.indent),
            options,
            stats
          )
        );
        stats.genericBlocks += 1;
        i = slashBlock.nextIndex - 1;
        continue;
      }

      output.push(line);
    }

    return output;
  }

  function appendWithSpacing(output, lines) {
    if (!lines.length) {
      return;
    }

    if (output.length > 0 && output[output.length - 1].trim() !== "") {
      output.push("");
    }

    Array.prototype.push.apply(output, lines);
  }

  function matchFence(line) {
    var match = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);

    if (!match) {
      return null;
    }

    return {
      indent: match[1].length,
      marker: match[2],
      char: match[2][0],
      size: match[2].length,
      info: (match[3] || "").trim(),
    };
  }

  function normalizeFenceLine(line, fence, stats) {
    if (!fence.info) {
      return line;
    }

    var info = fence.info;
    var language = "";
    var languageMatch = info.match(/^([A-Za-z0-9_+.#-]+)/);

    if (languageMatch) {
      language = languageMatch[1];
    }

    if (language && info !== language) {
      stats.fenceInfo += 1;
      return line.slice(0, line.indexOf(fence.marker)) + fence.marker + language;
    }

    return line;
  }

  function stripCodeAnnotationMarker(line, options, stats) {
    if (!options.convertAnnotations) {
      return line;
    }

    var next = line
      .replace(/[ \t]+#\s*\(\d+\)!\s*$/g, "")
      .replace(/[ \t]+\/\/\s*\(\d+\)!\s*$/g, "")
      .replace(/[ \t]+\/\*\s*\(\d+\)!\s*\*\/\s*$/g, "")
      .replace(/[ \t]+<!--\s*\(\d+\)!\s*-->\s*$/g, "");

    if (next !== line) {
      stats.codeAnnotationMarkers += 1;
    }

    return next;
  }

  function matchAdmonition(line) {
    var match = line.match(/^(\s*)(!!!|\?\?\?\+?)\s*([^\n]*)$/);

    if (!match) {
      return null;
    }

    return {
      indent: match[1].length,
      marker: match[2],
      info: (match[3] || "").trim(),
    };
  }

  function parseAdmonitionInfo(info) {
    var source = info || "note";
    var title = null;
    var quoted = source.match(/(["'])([\s\S]*?)\1\s*$/);
    var beforeQuote = source;

    if (quoted) {
      title = quoted[2];
      beforeQuote = source.slice(0, quoted.index).trim();
    }

    var type = (beforeQuote.split(/\s+/)[0] || "note").toLowerCase();

    if (title === null) {
      title = ADMONITION_TITLES[type] || titleCase(type);
    }

    return {
      type: type,
      title: title,
    };
  }

  function formatAdmonition(info, body) {
    var lines = [];

    if (info.title) {
      lines.push("> **" + info.title + "**");

      if (body.length > 0) {
        lines.push(">");
      }
    }

    body.forEach(function (line) {
      lines.push(line.trim() === "" ? ">" : "> " + line);
    });

    return trimOuterBlankLines(lines);
  }

  function matchContentTab(line) {
    var match = line.match(/^(\s*)===\s+(["'])([\s\S]+?)\2\s*$/);

    if (!match) {
      return null;
    }

    return {
      indent: match[1].length,
      title: match[3],
    };
  }

  function formatContentTab(title, body, options) {
    var level = Math.max(2, Math.min(6, Number(options.tabHeadingLevel) || 4));
    var heading = repeat("#", level) + " " + title;
    return trimOuterBlankLines([heading, ""].concat(body));
  }

  function matchCaptionBlock(line) {
    var match = line.match(/^(\s*)\/\/\/\s*caption\s*$/);

    if (!match) {
      return null;
    }

    return {
      indent: match[1].length,
    };
  }

  function formatCaptionBlock(body) {
    var trimmed = trimOuterBlankLines(body);

    if (trimmed.length === 0) {
      return [];
    }

    if (trimmed.length === 1) {
      return ["*Caption: " + trimmed[0].trim() + "*"];
    }

    return ["*Caption:*", ""].concat(trimmed);
  }

  function matchGenericSlashBlock(line) {
    var match = line.match(/^(\s*)\/\/\/\s+\S+.*$/);

    if (!match) {
      return null;
    }

    return {
      indent: match[1].length,
    };
  }

  function gatherIndentedBlock(lines, startIndex, parentIndent) {
    var body = [];
    var i = startIndex + 1;

    for (; i < lines.length; i += 1) {
      var line = lines[i];

      if (line.trim() === "") {
        body.push(line);
        continue;
      }

      if (countIndent(line) <= parentIndent) {
        break;
      }

      body.push(line);
    }

    return {
      body: body,
      nextIndex: i,
    };
  }

  function gatherDelimitedBlock(lines, startIndex, parentIndent) {
    var body = [];
    var i = startIndex + 1;

    for (; i < lines.length; i += 1) {
      var line = lines[i];

      if (line.trim() === "///" && countIndent(line) <= parentIndent) {
        i += 1;
        break;
      }

      body.push(line);
    }

    return {
      body: body,
      nextIndex: i,
    };
  }

  function stripIndent(lines, size) {
    return lines.map(function (line) {
      var indent = countIndent(line);

      if (line.trim() === "") {
        return "";
      }

      if (indent >= size) {
        return line.slice(size);
      }

      return line.slice(Math.min(indent, size));
    });
  }

  function trimOuterBlankLines(lines) {
    var start = 0;
    var end = lines.length;

    while (start < end && lines[start].trim() === "") {
      start += 1;
    }

    while (end > start && lines[end - 1].trim() === "") {
      end -= 1;
    }

    return lines.slice(start, end);
  }

  function countIndent(line) {
    var match = line.match(/^[ \t]*/);
    var indent = 0;
    var whitespace = match ? match[0] : "";

    for (var i = 0; i < whitespace.length; i += 1) {
      indent += whitespace[i] === "\t" ? 4 : 1;
    }

    return indent;
  }

  function isMarkdownGridOpen(line) {
    return /<div\b/i.test(line) && /\bmarkdown\b/i.test(line) && /\bgrid\b/i.test(line);
  }

  function isClosingDiv(line) {
    return /^\s*<\/div>\s*$/i.test(line);
  }

  function isFigureWrapper(line) {
    return /^\s*<\/?figure\b[^>]*>\s*$/i.test(line);
  }

  function matchFigcaption(line) {
    var match = line.match(/^\s*<figcaption>([\s\S]*?)<\/figcaption>\s*$/i);
    return match ? match[1].trim() : null;
  }

  function convertInlineLines(lines, options, stats, context) {
    var output = [];
    var inFence = false;
    var fenceChar = "";
    var fenceSize = 0;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var fence = matchFence(line);

      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceChar = fence.char;
          fenceSize = fence.size;
        } else if (fence.char === fenceChar && fence.size >= fenceSize) {
          inFence = false;
          fenceChar = "";
          fenceSize = 0;
        }

        output.push(line);
        continue;
      }

      if (inFence) {
        output.push(line);
        continue;
      }

      var converted = convertLine(line, options, stats, context);

      if (converted !== null) {
        output.push(converted);
      }
    }

    return output;
  }

  function convertLine(line, options, stats, context) {
    var abbreviation = line.match(/^\s*\*\[([^\]]+)\]:\s*(.+)$/);

    if (abbreviation) {
      stats.abbreviations += 1;
      return abbreviation[1] + ": " + abbreviation[2];
    }

    if (options.stripAttributes && isStandaloneAttributeList(line)) {
      stats.attributes += 1;
      return null;
    }

    var snippet = line.match(/^(\s*)--8<--\s+(.+)$/);

    if (snippet && options.removeSnippetIncludes) {
      stats.snippetIncludes += 1;
      return snippet[1] + "<!-- Snippet omitted: " + snippet[2].trim() + " -->";
    }

    if (options.removeMoreComments) {
      line = removeMoreComment(line, stats);

      if (line === null) {
        return null;
      }
    }

    return transformInlineSegments(line, function (segment) {
      var next = segment;

      if (options.convertAnnotations && context.annotationLikely) {
        next = replaceAndCount(
          next,
          /\((\d+)\)!?/g,
          function (_, number) {
            return "[" + number + "]";
          },
          stats,
          "annotationMarkers"
        );
      }

      if (options.convertFormatting) {
        next = convertFormatting(next, stats);
      }

      if (options.stripAttributes) {
        next = stripAttributeLists(next, stats);
      }

      if (options.stripMaterialIcons) {
        next = replaceAndCount(
          next,
          /:(?:material|octicons|simpleicons|fontawesome(?:-[a-z0-9]+)*)-[a-z0-9-]+:/gi,
          "",
          stats,
          "materialIcons"
        );
      }

      if (options.stripEmojiShortcodes) {
        next = replaceAndCount(
          next,
          /:[a-z0-9_+-]+:/gi,
          "",
          stats,
          "emojiShortcodes"
        );
      }

      return cleanupInlineSpacing(next);
    });
  }

  function removeMoreComment(line, stats) {
    var next = line.replace(/[ \t]*<!--\s*more\s*-->[ \t]*/gi, function (match, offset, whole) {
      var hasLeftText = /\S$/.test(whole.slice(0, offset));
      var hasRightText = /^\S/.test(whole.slice(offset + match.length));

      stats.moreComments += 1;
      return hasLeftText && hasRightText ? " " : "";
    });

    if (next !== line && next.trim() === "") {
      return null;
    }

    return next;
  }
  function transformInlineSegments(line, transform) {
    var result = "";
    var index = 0;
    var code = /(`+)([\s\S]*?)\1/g;
    var match;

    while ((match = code.exec(line)) !== null) {
      result += transform(line.slice(index, match.index));
      result += match[0];
      index = match.index + match[0].length;
    }

    result += transform(line.slice(index));
    return result;
  }

  function convertFormatting(text, stats) {
    var next = text;

    next = replaceAndCount(
      next,
      /\{~~([\s\S]*?)~>([\s\S]*?)~~\}/g,
      function (_, removed, added) {
        return "~~" + removed + "~~ " + added;
      },
      stats,
      "formatting"
    );
    next = replaceAndCount(next, /\{--([\s\S]*?)--\}/g, "~~$1~~", stats, "formatting");
    next = replaceAndCount(next, /\{\+\+([\s\S]*?)\+\+\}/g, "$1", stats, "formatting");
    next = replaceAndCount(next, /\{==([\s\S]*?)==\}/g, "**$1**", stats, "formatting");
    next = replaceAndCount(
      next,
      /\{>>([\s\S]*?)<<\}/g,
      function (_, comment) {
        return "<!-- " + comment.trim() + " -->";
      },
      stats,
      "formatting"
    );

    if (/^\s*\{==\s*$/.test(next) || /^\s*==\}\s*$/.test(next)) {
      stats.formatting += 1;
      return "";
    }

    next = replaceAndCount(next, /(^|[^=])==([^=\n]+?)==(?![=])/g, "$1**$2**", stats, "formatting");
    next = replaceAndCount(next, /\^\^([^^\n]+?)\^\^/g, "**$1**", stats, "formatting");
    next = replaceSingleDelimited(next, "~", function (value) {
      stats.formatting += 1;
      return toScript(value, SUBSCRIPT);
    });
    next = replaceSingleDelimited(next, "^", function (value) {
      stats.formatting += 1;
      return toScript(value, SUPERSCRIPT);
    });
    next = replaceAndCount(
      next,
      /\+\+([a-z0-9_-]+(?:\+[a-z0-9_-]+)+)\+\+/gi,
      function (_, keys) {
        return keys
          .split("+")
          .map(function (key) {
            return "`" + formatKeyName(key) + "`";
          })
          .join(" + ");
      },
      stats,
      "formatting"
    );

    return next;
  }

  function replaceSingleDelimited(text, marker, replacer) {
    var result = "";
    var i = 0;

    while (i < text.length) {
      var start = text.indexOf(marker, i);

      if (start === -1) {
        result += text.slice(i);
        break;
      }

      if (text[start - 1] === marker || text[start + 1] === marker) {
        result += text.slice(i, start + 1);
        i = start + 1;
        continue;
      }

      var end = text.indexOf(marker, start + 1);

      while (
        end !== -1 &&
        (text[end - 1] === marker || text[end + 1] === marker)
      ) {
        end = text.indexOf(marker, end + 1);
      }

      if (end === -1) {
        result += text.slice(i);
        break;
      }

      var value = text.slice(start + 1, end);

      if (!value.trim()) {
        result += text.slice(i, end + 1);
      } else {
        result += text.slice(i, start) + replacer(value);
      }

      i = end + 1;
    }

    return result;
  }

  function toScript(value, table) {
    var converted = "";

    for (var i = 0; i < value.length; i += 1) {
      converted += table[value[i]] || value[i];
    }

    return converted;
  }

  function formatKeyName(key) {
    var normalized = key.toLowerCase();
    return KEY_LABELS[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function stripAttributeLists(text, stats) {
    return replaceAndCount(
      text,
      /\{[ \t]*(?:(?:[#.][A-Za-z0-9_-]+)|(?:[A-Za-z_:][\w:.-]*=(?:"[^"]*"|'[^']*'|[^\s}]+)))(?:[ \t]+(?:(?:[#.][A-Za-z0-9_-]+)|(?:[A-Za-z_:][\w:.-]*=(?:"[^"]*"|'[^']*'|[^\s}]+))))*[ \t]*\}/g,
      "",
      stats,
      "attributes"
    );
  }

  function isStandaloneAttributeList(line) {
    return /^\s*\{[ \t]*(?:(?:[#.][A-Za-z0-9_-]+)|(?:[A-Za-z_:][\w:.-]*=(?:"[^"]*"|'[^']*'|[^\s}]+)))(?:[ \t]+(?:(?:[#.][A-Za-z0-9_-]+)|(?:[A-Za-z_:][\w:.-]*=(?:"[^"]*"|'[^']*'|[^\s}]+))))*[ \t]*\}\s*$/.test(line);
  }

  function cleanupInlineSpacing(text) {
    var leading = text.match(/^\s*/)[0];
    var body = text.slice(leading.length);

    body = body
      .replace(/\[\s+/g, "[")
      .replace(/\s+\]\(/g, "](")
      .replace(/^([-*+]\s+)\s+/, "$1")
      .replace(/^(\d+\.\s+)\s+/, "$1")
      .replace(/^(>\s+)\s+/, "$1")
      .replace(/\s+([,.;:!?])/g, "$1");

    return leading + body;
  }

  function detectAnnotationUsage(lines) {
    return lines.some(function (line) {
      return /\.annotate\b/.test(line) || /\(\d+\)!/.test(line);
    });
  }

  function replaceAndCount(text, regex, replacement, stats, key) {
    return text.replace(regex, function () {
      stats[key] += 1;

      if (typeof replacement === "function") {
        return replacement.apply(null, arguments);
      }

      var args = arguments;
      return replacement.replace(/\$(\d+)/g, function (_, index) {
        return args[Number(index)] || "";
      });
    });
  }

  function repeat(value, count) {
    var output = "";

    for (var i = 0; i < count; i += 1) {
      output += value;
    }

    return output;
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  return {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    convert: convert,
  };
});
