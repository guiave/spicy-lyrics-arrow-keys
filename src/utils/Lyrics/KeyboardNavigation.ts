import { SpotifyPlayer } from "../../components/Global/SpotifyPlayer.ts";
import { isExperimentEnabled } from "../experiments.ts";
import { $currentLyricsType, $lyricsContainerExists } from "../stores.ts";
import {
  LyricsObject,
  type LyricsLine,
  type LyricsSyllable,
  type LyricsType,
} from "./lyrics.ts";

type NavigableLine = LyricsLine | LyricsSyllable;

const SEEK_TOLERANCE_MS = 100;
let initialized = false;

const isEditableTarget = (target: EventTarget | null): boolean => {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") ||
      target.closest("input, textarea, select, [contenteditable='true']") !== null)
  );
};

const getNavigableLines = (type: LyricsType): NavigableLine[] => {
  if (type === "Syllable") {
    return LyricsObject.Types.Syllable.Lines.filter(line => !line.DotLine && !line.BGLine);
  }
  if (type === "Line") {
    return LyricsObject.Types.Line.Lines.filter(line => !line.DotLine);
  }
  return [];
};

const seekToAdjacentLine = (direction: "previous" | "next"): boolean => {
  const type = $currentLyricsType.get();
  if (type !== "Syllable" && type !== "Line") return false;

  const lines = getNavigableLines(type);
  if (lines.length === 0) return false;

  const position = SpotifyPlayer.GetPosition();
  let currentIndex = -1;

  for (let index = 0; index < lines.length; index++) {
    if (lines[index].StartTime <= position + SEEK_TOLERANCE_MS) {
      currentIndex = index;
    } else {
      break;
    }
  }

  const targetIndex =
    direction === "next" ? currentIndex + 1 : Math.max(currentIndex - 1, 0);
  const targetLine = lines[targetIndex];

  if (direction === "previous" && currentIndex <= 0) {
    if (position > 0) {
      SpotifyPlayer.Seek(0);
    }
    return true;
  }

  if (!targetLine) {
    return true;
  }

  SpotifyPlayer.Seek(targetLine.StartTime);
  return true;
};

export function initializeLyricsKeyboardNavigation(): void {
  if (initialized) return;
  initialized = true;

  window.addEventListener("keydown", event => {
    if (
      !isExperimentEnabled("lyricsKeyboardNavigation") ||
      !$lyricsContainerExists.get() ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    const direction =
      event.key === "ArrowLeft"
        ? "previous"
        : event.key === "ArrowRight"
          ? "next"
          : null;
    if (!direction || !seekToAdjacentLine(direction)) return;

    event.preventDefault();
  });
}
