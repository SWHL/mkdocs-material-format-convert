(function (root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MarkdownFindReplace = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findMatches(text, query, matchCase) {
    var source = String(text || "");
    var needle = String(query || "");
    var matches = [];

    if (!needle) {
      return matches;
    }

    var expression = new RegExp(escapeRegExp(needle), matchCase ? "g" : "gi");
    var match;

    while ((match = expression.exec(source)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return matches;
  }

  function replaceMatch(text, match, replacement) {
    var source = String(text || "");
    var nextValue = String(replacement || "");

    if (!match || match.start < 0 || match.end < match.start || match.end > source.length) {
      return source;
    }

    return source.slice(0, match.start) + nextValue + source.slice(match.end);
  }

  function replaceAll(text, matches, replacement) {
    var source = String(text || "");
    var nextValue = String(replacement || "");
    var parts = [];
    var cursor = 0;
    var replacementCount = 0;

    (matches || []).forEach(function (match) {
      if (!match || match.start < cursor || match.end < match.start || match.end > source.length) {
        return;
      }

      parts.push(source.slice(cursor, match.start), nextValue);
      cursor = match.end;
      replacementCount += 1;
    });

    if (replacementCount === 0) {
      return source;
    }

    parts.push(source.slice(cursor));
    return parts.join("");
  }

  return {
    findMatches: findMatches,
    replaceMatch: replaceMatch,
    replaceAll: replaceAll,
  };
});
