// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { NON_LETTER_MESSAGE, UploadPanel, validateUpload } from "./upload-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  push.mockReset();
});

describe("upload panel helpers", () => {
  test("accepts plain text through the exact 32 KiB boundary", () => {
    expect(validateUpload(new File(["letter"], "letter.txt", { type: "text/plain" }))).toBeNull();
    expect(
      validateUpload(
        new File(["letter"], "letter.txt", { type: "text/plain; charset=utf-8" }),
      ),
    ).toBeNull();
    expect(
      validateUpload(
        new File(["a".repeat(32 * 1024)], "boundary.txt", { type: "text/plain" }),
      ),
    ).toBeNull();
  });

  test.each([
    ["letter.png", "image/png"],
    ["letter.jpg", "image/jpeg"],
    ["letter.pdf", "application/pdf"],
  ])("rejects %s, whose text cannot be recovered exactly", (name, type) => {
    expect(validateUpload(new File(["bytes"], name, { type }))).toBe(
      "Choose a plain-text (.txt) award letter.",
    );
  });

  test("rejects oversized files with clear copy", () => {
    expect(
      validateUpload(
        new File(["a".repeat(32 * 1024 + 1)], "letter.txt", { type: "text/plain" }),
      ),
    ).toBe("Choose a file that is 32 KB or smaller.");
  });

  test("shows the shared plain-text contract in upload copy", () => {
    const { container } = render(createElement(UploadPanel));
    expect(container.textContent).toContain("32 KB max");
    expect(container.textContent).toContain("Plain text (.txt)");
    expect(container.textContent).not.toContain("PNG");
  });

  test("discloses provider processing, byte retention, tab storage, and local samples", () => {
    const { container } = render(createElement(UploadPanel));

    expect(container.textContent).toContain("sent to Anthropic");
    expect(container.textContent).toContain("does not persist the file bytes");
    expect(container.textContent).toContain("this tab’s sessionStorage until the tab closes");
    expect(container.textContent).toContain("Samples stay local and key-free");
  });

  test("keeps the exact non-letter message", () => {
    expect(NON_LETTER_MESSAGE).toBe("This doesn't look like an award letter");
  });

  test("ignores a second drop while extraction is pending", async () => {
    const pendingResponse = new Promise<Response>(() => undefined);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => pendingResponse);
    const { container } = render(createElement(UploadPanel));
    const dropTarget = container.querySelector(".upload-panel");
    expect(dropTarget).not.toBeNull();

    fireEvent.drop(dropTarget!, {
      dataTransfer: {
        files: [new File(["first"], "first.txt", { type: "text/plain" })],
      },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.drop(dropTarget!, {
      dataTransfer: {
        files: [new File(["second"], "second.txt", { type: "text/plain" })],
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
