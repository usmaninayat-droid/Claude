// @ts-check
/**
 * yaml-lite — a tiny, dependency-free YAML parser for the block-style subset the
 * repo's GitHub workflows use (block mappings, block sequences, scalars, quoted
 * strings, `#` comments, blank lines, and `|`/`>` block scalars). It exists ONLY
 * to LINT the workflow YAML in a test (the brief: "lint it with a YAML parse")
 * without adding a dependency (decision #5, no new deps). It is intentionally
 * strict where GitHub Actions is strict — it THROWS on:
 *   - a literal tab used for indentation (illegal in YAML),
 *   - indentation that is not consistent within a block,
 *   - an unterminated quoted string.
 * It is NOT a general YAML implementation; do not use it for arbitrary input.
 */

/** @param {string} text @returns {any} */
export function parseYaml(text) {
  const lines = [];
  text.split('\n').forEach((raw, i) => {
    if (/^\s*#/.test(raw) || /^\s*$/.test(raw)) return; // comment / blank
    if (/^\t/.test(raw) || /^ *\t/.test(raw)) {
      throw new Error(`yaml-lite: tab used for indentation on line ${i + 1}`);
    }
    const indent = raw.length - raw.replace(/^ +/, '').length;
    lines.push({ n: i + 1, indent, content: stripComment(raw.trim()) });
  });
  const [value] = parseBlock(lines, 0, 0);
  return value;
}

/** Strip a trailing ` # comment` that is not inside quotes. */
function stripComment(s) {
  let inS = false; let inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD && (i === 0 || s[i - 1] === ' ')) return s.slice(0, i).trim();
  }
  return s;
}

/**
 * Parse a block whose items are at exactly `indent`. Returns [value, nextIdx].
 * @returns {[any, number]}
 */
function parseBlock(lines, start, indent) {
  if (start >= lines.length) return [null, start];
  const isSeq = lines[start].content.startsWith('- ') || lines[start].content === '-';
  return isSeq ? parseSeq(lines, start, indent) : parseMap(lines, start, indent);
}

function parseMap(lines, start, indent) {
  /** @type {Record<string, any>} */
  const obj = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`yaml-lite: unexpected indent on line ${line.n}`);
    const m = /^([^:]+):(?:\s+(.*))?$/.exec(line.content);
    if (!m) throw new Error(`yaml-lite: expected "key: value" on line ${line.n}: ${line.content}`);
    const key = unquote(m[1].trim());
    const inline = m[2] != null ? m[2].trim() : '';
    if (inline.startsWith('|') || inline.startsWith('>')) {
      // Block scalar: absorb every following line indented deeper than the key.
      const text = [];
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) { text.push(lines[j].content); j++; }
      obj[key] = text.join('\n');
      i = j;
    } else if (inline !== '') {
      obj[key] = scalar(inline);
      i++;
    } else {
      // Nested block (deeper indent) or empty value.
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [child, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
        obj[key] = child;
        i = next;
      } else if (i + 1 < lines.length && lines[i + 1].indent === indent
                 && (lines[i + 1].content.startsWith('- ') || lines[i + 1].content === '-')) {
        // A sequence whose items sit at the SAME indent as the key (common YAML).
        const [child, next] = parseSeq(lines, i + 1, indent);
        obj[key] = child;
        i = next;
      } else {
        obj[key] = null;
        i++;
      }
    }
  }
  return [obj, i];
}

function parseSeq(lines, start, indent) {
  const arr = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) break;
    if (line.indent > indent) throw new Error(`yaml-lite: unexpected indent on line ${line.n}`);
    if (!(line.content.startsWith('- ') || line.content === '-')) break;
    const rest = line.content === '-' ? '' : line.content.slice(2).trim();
    if (rest === '') {
      const [child, next] = parseBlock(lines, i + 1, lines[i + 1]?.indent ?? indent + 2);
      arr.push(child);
      i = next;
    } else if (/^([^:]+):(\s+.*)?$/.test(rest)) {
      // Inline map opener: "- key: value" — synthesize a map block by treating
      // the item content plus deeper lines as a mapping.
      const synthetic = [{ n: line.n, indent: indent + 2, content: rest }];
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) { synthetic.push(lines[j]); j++; }
      const [child] = parseMap(synthetic, 0, indent + 2);
      arr.push(child);
      i = j;
    } else {
      arr.push(scalar(rest));
      i++;
    }
  }
  return [arr, i];
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function scalar(s) {
  if (s.startsWith('|') || s.startsWith('>')) return s; // block scalar marker — keep raw
  if ((s.startsWith('"') && !s.endsWith('"')) || (s.startsWith("'") && !s.endsWith("'"))) {
    throw new Error(`yaml-lite: unterminated quoted string: ${s}`);
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((x) => scalar(x.trim()));
  }
  const u = unquote(s);
  if (u === s) {
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    if (/^-?\d+$/.test(s)) return Number(s);
  }
  return u;
}
