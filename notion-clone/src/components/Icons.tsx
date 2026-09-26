import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const make = (d: string | string[], fill = false) =>
  function Icon({ size = 16, ...rest }: P) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill ? "currentColor" : "none"}
        stroke={fill ? "none" : "currentColor"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {(Array.isArray(d) ? d : [d]).map((p, i) => (
          <path key={i} d={p} />
        ))}
      </svg>
    );
  };

export const IconSearch = make(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.3-4.3"]);
export const IconPlus = make("M12 5v14M5 12h14");
export const IconChevronRight = make("M9 6l6 6-6 6");
export const IconChevronDown = make("M6 9l6 6 6-6");
export const IconChevronsLeft = make(["M11 17l-5-5 5-5", "M18 17l-5-5 5-5"]);
export const IconMenu = make("M4 6h16M4 12h16M4 18h16");
export const IconTrash = make(["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6M14 11v6"]);
export const IconStar = make("M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z");
export const IconStarFill = make("M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z", true);
export const IconDots = make(["M5 12h.01", "M12 12h.01", "M19 12h.01"]);
export const IconGrip = make(["M9 6h.01", "M15 6h.01", "M9 12h.01", "M15 12h.01", "M9 18h.01", "M15 18h.01"]);
export const IconPage = make(["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5", "M9 13h6M9 17h4"]);
export const IconSettings = make([
  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
]);
export const IconTemplate = make(["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"]);
export const IconHome = make(["M3 11l9-8 9 8", "M5 10v10h14V10"]);
export const IconClock = make(["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"]);
export const IconSun = make(["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"]);
export const IconMoon = make("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z");
export const IconLink = make(["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"]);
export const IconCopy = make(["M9 9h11v11H9z", "M5 15H4V4h11v1"]);
export const IconDownload = make(["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"]);
export const IconUpload = make(["M12 21V9", "M7 14l5-5 5 5", "M5 3h14"]);
export const IconUndo = make(["M9 14L4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"]);
export const IconRedo = make(["M15 14l5-5-5-5", "M20 9H9a5 5 0 0 0 0 10h3"]);
export const IconLock = make(["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"]);
export const IconExpand = make(["M15 3h6v6", "M9 21H3v-6", "M21 3l-7 7", "M3 21l7-7"]);
export const IconClose = make("M18 6L6 18M6 6l12 12");
export const IconTable = make(["M3 4h18v16H3z", "M3 10h18", "M9 4v16"]);
export const IconBoard = make(["M4 4h4v16H4z", "M10 4h4v10h-4z", "M16 4h4v13h-4z"]);
export const IconGallery = make(["M3 3h8v8H3z", "M13 3h8v8h-8z", "M3 13h8v8H3z", "M13 13h8v8h-8z"]);
export const IconList = make(["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]);
export const IconCalendar = make(["M3 5h18v16H3z", "M16 3v4M8 3v4M3 10h18"]);
export const IconSort = make(["M7 4v16", "M3 16l4 4 4-4", "M17 20V4", "M13 8l4-4 4 4"]);
export const IconFilter = make("M3 4h18l-7 8v6l-4 2v-8z");
export const IconText = make(["M4 7V5h16v2", "M12 5v14", "M9 19h6"]);
export const IconHash = make(["M4 9h16", "M4 15h16", "M10 3L8 21", "M16 3l-2 18"]);
export const IconSelect = make(["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 11l4 4 4-4"]);
export const IconTags = make(["M3 12V3h9l9 9-9 9z", "M8 8h.01"]);
export const IconCheckSquare = make(["M4 4h16v16H4z", "M8 12l3 3 5-6"]);
export const IconUrl = IconLink;
export const IconStatus = make(["M12 21a9 9 0 1 0 0-18", "M12 3a9 9 0 0 1 0 18", "M12 8v4l2 2"]);
export const IconEye = make(["M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"]);
export const IconEyeOff = make(["M17.9 17.9A10 10 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 5.1-5.9", "M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2", "M1 1l22 22"]);
export const IconArrowUpRight = make(["M7 17L17 7", "M7 7h10v10"]);
export const IconImage = make(["M3 3h18v18H3z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M21 15l-5-5L5 21"]);
export const IconSmile = make(["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M8 14s1.5 2 4 2 4-2 4-2", "M9 9h.01M15 9h.01"]);
export const IconComment = make("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z");
export const IconBack = make("M15 18l-6-6 6-6");
export const IconForward = make("M9 18l6-6-6-6");
export const IconDatabase = make(["M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z", "M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"]);
