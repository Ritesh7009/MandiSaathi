// src/themes/mandisaathi/icons.tsx
import React from "react";
import {
  ArrowDown,
  ArrowsDownUp,
  ArrowSquareOut,
  ArrowUp,
  Calendar,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  Checks,
  Clock,
  Columns,
  Copy,
  DotsThree,
  EyeSlash,
  Funnel,
  Info,
  List,
  MagnifyingGlass,
  Microphone,
  Stop,
  UploadSimple,
  Warning,
  Wrench,
  X,
  XCircle
} from "@phosphor-icons/react";
var ICON_SIZE_PX = {
  xsm: 12,
  sm: 14,
  md: 16,
  lg: 20
};
function phosphorEntry(Component, weight = "regular") {
  return ({ size }) => {
    const px = ICON_SIZE_PX[size ?? "md"] ?? 16;
    return React.createElement(Component, { size: px, weight, "aria-hidden": true });
  };
}
var mandisaathiIcons = {
  close: phosphorEntry(X, "bold"),
  chevronDown: phosphorEntry(CaretDown, "bold"),
  chevronLeft: phosphorEntry(CaretLeft, "bold"),
  chevronRight: phosphorEntry(CaretRight, "bold"),
  chevronsLeft: phosphorEntry(CaretDoubleLeft, "bold"),
  chevronsRight: phosphorEntry(CaretDoubleRight, "bold"),
  check: phosphorEntry(Check, "bold"),
  success: phosphorEntry(CheckCircle, "fill"),
  error: phosphorEntry(XCircle, "fill"),
  warning: phosphorEntry(Warning, "fill"),
  info: phosphorEntry(Info, "fill"),
  calendar: phosphorEntry(Calendar, "regular"),
  clock: phosphorEntry(Clock, "regular"),
  externalLink: phosphorEntry(ArrowSquareOut, "bold"),
  menu: phosphorEntry(List, "bold"),
  moreHorizontal: phosphorEntry(DotsThree, "bold"),
  search: phosphorEntry(MagnifyingGlass, "bold"),
  upload: phosphorEntry(UploadSimple, "bold"),
  arrowUp: phosphorEntry(ArrowUp, "bold"),
  arrowDown: phosphorEntry(ArrowDown, "bold"),
  arrowsUpDown: phosphorEntry(ArrowsDownUp, "bold"),
  funnel: phosphorEntry(Funnel, "regular"),
  eyeSlash: phosphorEntry(EyeSlash, "regular"),
  viewColumns: phosphorEntry(Columns, "regular"),
  copy: phosphorEntry(Copy, "regular"),
  checkDouble: phosphorEntry(Checks, "bold"),
  wrench: phosphorEntry(Wrench, "regular"),
  stop: phosphorEntry(Stop, "fill"),
  microphone: phosphorEntry(Microphone, "fill")
};
var icons_default = mandisaathiIcons;
export {
  icons_default as default,
  mandisaathiIcons
};
