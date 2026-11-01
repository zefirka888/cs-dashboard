// Иконки в виде готовой SVG-разметки (константы, не пользовательский ввод).
const svg = (inner, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  todo: svg(
    '<path d="M9 6h11M9 12h11M9 18h11"/>' +
    '<path d="M3.5 6.2l1.2 1.2 2-2.2M3.5 12.2l1.2 1.2 2-2.2M3.5 18.2l1.2 1.2 2-2.2"/>'
  ),
  skins: svg('<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M4 8l8 5 8-5M12 13v8"/>'),
  deals: svg('<path d="M3 12.5V4h8.5L21 13.5 13.5 21z"/><circle cx="7.8" cy="8.3" r="1.3"/>'),
  profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>'),

  grip: svg(
    '<circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/>' +
    '<circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/>' +
    '<circle cx="4" cy="16" r="1.6"/><circle cx="10" cy="16" r="1.6"/>',
    "0 0 14 20"
  ),
  chevronUp: svg('<path d="M6 15l6-6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};