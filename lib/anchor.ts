export interface AnchorMatch {
  start: number;
  end: number;
}

interface NormalizedText {
  text: string;
  indexMap: number[];
}

function normalizeWithIndexMap(value: string): NormalizedText {
  const characters: string[] = [];
  const indexMap: number[] = [];
  let previousWasSpace = true;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (/\p{L}|\p{N}/u.test(character)) {
      characters.push(character.toLowerCase());
      indexMap.push(index);
      previousWasSpace = false;
    } else if (!previousWasSpace && /\s/u.test(character)) {
      characters.push(" ");
      indexMap.push(index);
      previousWasSpace = true;
    }
  }

  if (characters.at(-1) === " ") {
    characters.pop();
    indexMap.pop();
  }

  return { text: characters.join(""), indexMap };
}

/**
 * Locates a quoted claim in a transcription, returning offsets into the original
 * (not normalized) transcription, or null when the quote is not present.
 *
 * The match is exact. Uploads are plain text, so the transcription is the file
 * the student handed us rather than a reading of an image, and a quote that
 * does not appear in it verbatim is a fabricated quote — not a near miss to be
 * rescued by approximate matching. Normalization folds case and collapses
 * whitespace runs so that formatting alone cannot break an otherwise real
 * quote; it never lets differing characters match.
 */
export function anchorQuote(transcription: string, quote: string): AnchorMatch | null {
  const source = normalizeWithIndexMap(transcription);
  const normalizedQuote = normalizeWithIndexMap(quote).text;

  if (!source.text || !normalizedQuote) return null;

  const start = source.text.indexOf(normalizedQuote);
  if (start < 0) return null;

  const end = start + normalizedQuote.length;
  return { start: source.indexMap[start], end: source.indexMap[end - 1] + 1 };
}
