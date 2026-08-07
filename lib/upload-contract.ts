/**
 * Anchor Lines only accepts formats whose text is recoverable exactly. That is
 * plain text and nothing else: an image needs OCR, and a PDF reconstructs word
 * spacing from glyph kerning and reading order from page geometry, neither of
 * which is exact on the table-shaped letters this tool exists to read.
 */
export const ACCEPTED_UPLOAD_TYPES = ["text/plain"] as const;

export type AcceptedUploadType = (typeof ACCEPTED_UPLOAD_TYPES)[number];

/**
 * The transcription is echoed back inside the model's JSON response, so the
 * upload ceiling is an output-token budget rather than a transport limit. A
 * 32 KiB letter is far longer than any real award letter and still leaves room
 * for the extracted line items within the extraction call's max_tokens.
 */
export const MAX_UPLOAD_KIB = 32;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_KIB * 1024;

/** Browsers append a charset to text uploads, so compare the media type alone. */
export function isAcceptedUploadType(value: string): value is AcceptedUploadType {
  const mediaType = value.split(";")[0].trim().toLowerCase();
  return (ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(mediaType);
}

const utf8Bom = [0xef, 0xbb, 0xbf] as const;

const tab = 9;
const lineFeed = 10;
const carriageReturn = 13;
const firstPrintable = 32;

/**
 * Binary files relabelled as text/plain still decode when their bytes happen to
 * be valid UTF-8, so reject the control characters that real letters never
 * contain. Tab, line feed, and carriage return are ordinary letter formatting.
 */
function hasBinaryControlCharacter(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= firstPrintable) continue;
    if (code !== tab && code !== lineFeed && code !== carriageReturn) return true;
  }
  return false;
}

/**
 * Decodes an upload to text, or returns null when the bytes are not exactly
 * recoverable as UTF-8. Text has no leading signature to check the way PNG and
 * PDF did, so the guarantee we verify instead is that every byte round-trips:
 * a strict decode rejects invalid sequences, and the control-character sweep
 * catches binary files that were merely relabelled as text.
 */
export function decodeUploadText(bytes: Uint8Array): string | null {
  const body =
    bytes.length >= utf8Bom.length && utf8Bom.every((byte, index) => bytes[index] === byte)
      ? bytes.subarray(utf8Bom.length)
      : bytes;

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  }

  return hasBinaryControlCharacter(text) ? null : text;
}
