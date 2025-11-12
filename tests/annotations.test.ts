import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextSelection } from "../src/hooks/useTextSelection";
import type { ReadingLocation } from "../src/types";

// Mock window.getSelection
const mockGetSelection = vi.fn();
Object.defineProperty(window, "getSelection", {
  value: mockGetSelection,
  writable: true,
});

// Mock window.scrollX and window.scrollY
Object.defineProperty(window, "scrollX", { value: 0, writable: true });
Object.defineProperty(window, "scrollY", { value: 0, writable: true });

describe("useTextSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle empty selection", () => {
    mockGetSelection.mockReturnValue({
      toString: () => "",
      rangeCount: 0,
    });

    const onSelectionChange = vi.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    expect(result.current.currentSelection).toBeNull();
  });

  it("should handle text selection", () => {
    const mockRange = {
      getBoundingClientRect: () => ({ left: 100, top: 200, bottom: 220 }),
      startContainer: {
        nodeType: Node.TEXT_NODE,
        parentElement: {
          getAttribute: vi.fn().mockReturnValue(null),
          closest: vi.fn().mockReturnValue(null),
        },
      },
    };

    mockGetSelection.mockReturnValue({
      toString: () => "selected text",
      rangeCount: 1,
      getRangeAt: () => mockRange,
    });

    const onAnnotationRequest = vi.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onAnnotationRequest })
    );

    act(() => {
      // Trigger selection change
      const event = new MouseEvent("mouseup");
      document.dispatchEvent(event);
    });

    // Wait for the timeout
    setTimeout(() => {
      expect(onAnnotationRequest).toHaveBeenCalledWith(
        "selected text",
        mockRange,
        expect.any(Object),
        { x: 100, y: 225 }
      );
    }, 150);
  });

  it("should clear selection", () => {
    const mockSelection = {
      removeAllRanges: vi.fn(),
    };

    mockGetSelection.mockReturnValue(mockSelection);

    const onSelectionChange = vi.fn();
    const { result } = renderHook(() => 
      useTextSelection({ onSelectionChange })
    );

    act(() => {
      result.current.clearSelection();
    });

    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });
});