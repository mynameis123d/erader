import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTextSelection } from "../src/hooks/useTextSelection";
import { useTranslationStore } from "../src/state/translation-store";

// Mock window.getSelection
const mockSelection = {
  toString: vi.fn(),
  isCollapsed: true,
  getRangeAt: vi.fn(),
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  anchorNode: null,
  anchorOffset: 0,
  focusNode: null,
  focusOffset: 0,
};

Object.defineProperty(window, "getSelection", {
  value: vi.fn(() => mockSelection),
  writable: true,
});

// Mock document event listeners
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(document, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, "removeEventListener", {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock setTimeout
vi.useFakeTimers();

describe("useTextSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelection.toString.mockReturnValue("");
    mockSelection.isCollapsed = true;
    
    // Reset store state
    const { result } = renderHook(() => useTranslationStore());
    act(() => {
      result.current.clearSelectedText();
      result.current.hideTooltip();
    });
  });

  it("should return current selected text and clear function", () => {
    const { result } = renderHook(() => useTextSelection());
    
    expect(typeof result.current.selectedText).toBe("string");
    expect(typeof result.current.clearSelectedText).toBe("function");
  });

  it("should set up event listeners on mount", () => {
    renderHook(() => useTextSelection());
    
    expect(mockAddEventListener).toHaveBeenCalledWith("selectionchange", expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith("dblclick", expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("should clean up event listeners on unmount", () => {
    const { unmount } = renderHook(() => useTextSelection());
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith("selectionchange", expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith("dblclick", expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("should handle text selection", () => {
    const { result } = renderHook(() => useTextSelection());
    
    // Mock a text selection
    mockSelection.toString.mockReturnValue("selected text");
    mockSelection.isCollapsed = false;
    mockSelection.getRangeAt.mockReturnValue({
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        bottom: 220,
        right: 300,
      }),
    });

    // Trigger selection change
    const selectionChangeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "selectionchange"
    )?.[1];

    if (selectionChangeHandler) {
      act(() => {
        selectionChangeHandler();
      });

      // Fast forward timers for tooltip delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const translationStore = useTranslationStore.getState();
      expect(translationStore.selectedText).toBe("selected text");
      expect(translationStore.showTranslationTooltip).toBe(true);
    }
  });

  it("should not show tooltip for empty selection", () => {
    renderHook(() => useTextSelection());
    
    // Mock empty selection
    mockSelection.toString.mockReturnValue("");
    mockSelection.isCollapsed = true;

    const selectionChangeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "selectionchange"
    )?.[1];

    if (selectionChangeHandler) {
      act(() => {
        selectionChangeHandler();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const translationStore = useTranslationStore.getState();
      expect(translationStore.showTranslationTooltip).toBe(false);
    }
  });

  it("should handle double-click selection", () => {
    const { result } = renderHook(() => useTextSelection());
    
    // Mock double-click selection
    mockSelection.toString.mockReturnValue("word");
    mockSelection.isCollapsed = false;
    mockSelection.getRangeAt.mockReturnValue({
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        bottom: 220,
        right: 300,
      }),
    });

    const doubleClickHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "dblclick"
    )?.[1];

    if (doubleClickHandler) {
      act(() => {
        doubleClickHandler({ clientX: 150, clientY: 210 } as MouseEvent);
      });

      const translationStore = useTranslationStore.getState();
      expect(translationStore.selectedText).toBe("word");
      expect(translationStore.showTranslationTooltip).toBe(true);
    }
  });

  it("should clear selection when clicking outside", () => {
    const { result } = renderHook(() => useTextSelection());
    
    // First set up a selection
    mockSelection.toString.mockReturnValue("selected text");
    mockSelection.isCollapsed = false;
    mockSelection.getRangeAt.mockReturnValue({
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        bottom: 220,
        right: 300,
      }),
    });

    // Trigger selection
    const selectionChangeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "selectionchange"
    )?.[1];

    if (selectionChangeHandler) {
      act(() => {
        selectionChangeHandler();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now click outside the selection
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === "click"
      )?.[1];

      if (clickHandler) {
        act(() => {
          clickHandler({ clientX: 50, clientY: 150 } as MouseEvent); // Outside selection bounds
        });

        const translationStore = useTranslationStore.getState();
        expect(translationStore.selectedText).toBe("");
        expect(translationStore.showTranslationTooltip).toBe(false);
      }
    }
  });

  it("should handle escape key to clear selection", () => {
    renderHook(() => useTextSelection());
    
    // Set up a selection first
    mockSelection.toString.mockReturnValue("selected text");
    mockSelection.isCollapsed = false;

    const selectionChangeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "selectionchange"
    )?.[1];

    if (selectionChangeHandler) {
      act(() => {
        selectionChangeHandler();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Press escape key
      const keyDownHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === "keydown"
      )?.[1];

      if (keyDownHandler) {
        act(() => {
          keyDownHandler({ key: "Escape" } as KeyboardEvent);
        });

        const translationStore = useTranslationStore.getState();
        expect(translationStore.selectedText).toBe("");
        expect(translationStore.showTranslationTooltip).toBe(false);
      }
    }
  });

  it("should clear tooltip timeout on new selection", () => {
    renderHook(() => useTextSelection());
    
    // First selection
    mockSelection.toString.mockReturnValue("first selection");
    mockSelection.isCollapsed = false;
    mockSelection.getRangeAt.mockReturnValue({
      getBoundingClientRect: () => ({ left: 100, top: 200, bottom: 220, right: 300 }),
    });

    const selectionChangeHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === "selectionchange"
    )?.[1];

    if (selectionChangeHandler) {
      act(() => {
        selectionChangeHandler();
      });

      // Second selection before timeout
      mockSelection.toString.mockReturnValue("second selection");
      
      act(() => {
        selectionChangeHandler();
      });

      // Fast forward - should only show second selection
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const translationStore = useTranslationStore.getState();
      expect(translationStore.selectedText).toBe("second selection");
    }
  });
});