/* Skin saisonnier autonome du 1er au 30 novembre 2026, fuseau de Québec. */
(function () {
  'use strict';

  var ROOT_CLASS = 'cardi-november';
  var MARKER = 'data-november-decor';
  var START = Date.parse('2026-11-01T00:00:00-04:00');
  var END = Date.parse('2026-12-01T00:00:00-05:00');
  var CHANGE_TIMES = [
    '2026-11-01T00:00:00-04:00',
    '2026-11-11T00:00:00-05:00',
    '2026-11-12T00:00:00-05:00',
    '2026-11-15T00:00:00-05:00',
    '2026-11-24T00:00:00-05:00',
    '2026-12-01T00:00:00-05:00'
  ].map(function (date) { return Date.parse(date); });
  var formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var observer = null;
  var schedule = null;
  var layer = null;
  var stopped = false;
  var particleKey = '';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Silhouette d'érable à cinq lobes, nervures et pétiole, non une étoile stylisée. */
  var leafSvg = "<svg viewBox=\"0 0 64 76\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></svg>";
  var leafSvgVariants = [leafSvg,leafSvg,leafSvg];
  var snowSvg = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><path d="M20 4v32M4 20h32M9 9l22 22M31 9L9 31"/><path d="M15 8l5 5 5-5M15 32l5-5 5 5M8 15l5 5-5 5M32 15l-5 5 5 5"/></g></svg>';
  var branchSvg = "<svg viewBox=\"0 0 260 140\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><path d=\"M265-4C234 14 217 35 190 55S142 78 102 98S56 122 24 140\" fill=\"none\" stroke=\"#997562\" stroke-width=\"3\" stroke-linecap=\"round\"/><g fill=\"none\" stroke=\"#ae8870\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M220 33Q212 20 204 8M184 60Q180 39 162 26M149 79Q144 59 131 49M113 95Q105 84 87 80M74 113Q85 129 81 142\"/></g><g transform=\"translate(206 13) rotate(-34) scale(0.474) translate(-32 -38)\" style=\"color:#b44638\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(158 30) rotate(20) scale(0.513) translate(-32 -38)\" style=\"color:#d69a4d\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(129 50) rotate(-18) scale(0.474) translate(-32 -38)\" style=\"color:#943947\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(85 84) rotate(35) scale(0.474) translate(-32 -38)\" style=\"color:#c2673d\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(78 128) rotate(-40) scale(0.382) translate(-32 -38)\" style=\"color:#d8a35c\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(32 126) rotate(21) scale(0.368) translate(-32 -38)\" style=\"color:#b8513e\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g></svg>";
  var frostSvg = "<svg viewBox=\"0 0 132 116\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><g fill=\"none\" stroke=\"#d6edf1\" stroke-width=\"1.5\" stroke-linecap=\"round\"><path d=\"M132 0L28 99M105 23L98 5M105 23L126 23M83 44L69 32M83 44L102 52M60 67L44 56M60 67L69 84M132 37L92 76M108 60L105 43M108 60L127 64M94 74L78 73M94 74L98 94\"/><path d=\"M132 70L112 92M124 78L117 67M124 78L132 82\"/></g></svg>";
  var garlandSvg = "<svg viewBox=\"0 0 620 62\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><path d=\"M10 7Q310 105 610 7\" fill=\"none\" stroke=\"#f4d6b6\" stroke-width=\"1.6\" opacity=\".58\"/><g transform=\"translate(31 17) rotate(-22) scale(0.342) translate(-32 -38)\" style=\"color:#d7a04c\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(111 39) rotate(35) scale(0.395) translate(-32 -38)\" style=\"color:#a9393a\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(195 48) rotate(-32) scale(0.368) translate(-32 -38)\" style=\"color:#bd7042\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(277 50) rotate(22) scale(0.368) translate(-32 -38)\" style=\"color:#d29852\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(355 50) rotate(-14) scale(0.382) translate(-32 -38)\" style=\"color:#9c3844\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(436 44) rotate(29) scale(0.355) translate(-32 -38)\" style=\"color:#cf8948\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(517 32) rotate(-23) scale(0.368) translate(-32 -38)\" style=\"color:#b7523d\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(586 16) rotate(20) scale(0.342) translate(-32 -38)\" style=\"color:#d5a158\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g></svg>";
  var pileSvg = "<svg viewBox=\"0 0 190 86\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><g transform=\"translate(21 64) rotate(-43) scale(0.737) translate(-32 -38)\" style=\"color:#a23b41\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(52 38) rotate(15) scale(0.645) translate(-32 -38)\" style=\"color:#cf8b4b\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(87 62) rotate(-15) scale(0.789) translate(-32 -38)\" style=\"color:#b25d3b\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(129 40) rotate(40) scale(0.632) translate(-32 -38)\" style=\"color:#daa357\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(161 65) rotate(-26) scale(0.737) translate(-32 -38)\" style=\"color:#a83d45\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g><g transform=\"translate(102 72) rotate(32) scale(0.579) translate(-32 -38)\" style=\"color:#c56a42\"><path d=\"M32 3 C34.2 8.5 35.2 13.5 37.8 17 C40.7 15.1 43.1 12.4 46.8 11.7 C46.1 16.4 44.7 19 45 22.1 C49.4 20.7 55.4 17.9 58.7 18.2 C57.9 22.3 55.3 24.5 55.2 26.4 C59.4 27.7 62 29.1 62.4 31.4 C59.5 34.8 54 37.7 50.2 39.8 C52.1 42.7 53.6 46.1 51.1 47.3 C47.1 47.3 43.3 46 39.6 45.6 C37.3 49.5 34.8 52.4 34.1 56.4 L33.8 67.2 Q32 69.6 30.2 67.2 L29.9 56.4 C29.2 52.4 26.7 49.5 24.4 45.6 C20.7 46 16.9 47.3 12.9 47.3 C10.4 46.1 11.9 42.7 13.8 39.8 C10 37.7 4.5 34.8 1.6 31.4 C2 29.1 4.6 27.7 8.8 26.4 C8.7 24.5 6.1 22.3 5.3 18.2 C8.6 17.9 14.6 20.7 19 22.1 C19.3 19 17.9 16.4 17.2 11.7 C20.9 12.4 23.3 15.1 26.2 17 C28.8 13.5 29.8 8.5 32 3 Z\" fill=\"currentColor\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\".8\"/><path d=\"M32 11V55 M32 42L16 32 M32 42L48 32 M32 34L22 20 M32 34L42 20\" fill=\"none\" stroke=\"#ffe5b1\" stroke-width=\"1.1\" stroke-linecap=\"round\" opacity=\".48\"/></g></svg>";
  var poppySvg = '<svg viewBox="0 0 50 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M25 30C27 40 26 46 22 55" fill="none" stroke="#557c52" stroke-width="2"/>' +
    '<path d="M25 23C9 6-3 19 12 29 1 40 17 47 25 33c10 16 25 4 16-6C53 13 35 5 25 23z" fill="#b82236"/>' +
    '<path d="M25 23C13 16 8 24 19 29c-6 8 4 12 7 4 5 8 13 1 7-5 8-7-1-13-8-5z" fill="#e0464d" opacity=".55"/>' +
    '<circle cx="26" cy="28" r="6" fill="#292429"/><circle cx="26" cy="28" r="2.4" fill="#d2a44f"/></svg>';

  function dateAtSchool() {
    var parts = {};
    formatter.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return parts.year + '-' + parts.month + '-' + parts.day;
  }
  function isActive(date) {
    return date >= '2026-11-01' && date <= '2026-11-30' && Date.now() < END;
  }
  function phaseFor(date) {
    if (date < '2026-11-15') return 'autumn';
    if (date < '2026-11-24') return 'transition';
    return 'winter';
  }
  function addArt(parent, type, cssClass, svg) {
    if (parent.querySelector('[' + MARKER + '="' + type + '"]')) return;
    var element = document.createElement('div');
    element.className = cssClass;
    element.setAttribute(MARKER, type);
    element.setAttribute('aria-hidden', 'true');
    element.innerHTML = svg;
    parent.appendChild(element);
  }
  function decoratePortal(date) {
    var masthead = document.querySelector('#app .masthead');
    var stage = document.querySelector('#app .search-stage');
    if (!masthead || !stage) return false;

    addArt(masthead, 'branch', 'november-branch', branchSvg);
    addArt(masthead, 'branch-left', 'november-branch november-branch--left', branchSvg);
    addArt(stage, 'frost', 'november-frost', frostSvg);
    addArt(stage, 'frost-left', 'november-frost november-frost--left', frostSvg);
    addArt(stage, 'garland', 'november-garland', garlandSvg);
    addArt(stage, 'pile-left', 'november-stage-pile november-stage-pile--left', pileSvg);
    addArt(stage, 'pile-right', 'november-stage-pile november-stage-pile--right', pileSvg);
    addArt(document.body, 'ground-left', 'november-ground-pile november-ground-pile--left', pileSvg);
    addArt(document.body, 'ground-right', 'november-ground-pile november-ground-pile--right', pileSvg);
    addCardLeaves();

    var poppy = masthead.querySelector('[' + MARKER + '="poppy"]');
    if (date === '2026-11-11') {
      addArt(masthead, 'poppy', 'november-poppy', poppySvg);
    } else if (poppy) {
      poppy.remove();
    }
    return true;
  }
  function addCardLeaves() {
    /* Feuilles statiques seulement sur quelques rubriques, jamais dans les résultats. */
    var cards = document.querySelectorAll('#app .procedure summary, #app .procedure-direct-row');
    for (var i = 4; i < cards.length && i < 110; i += 9) {
      var card = cards[i];
      if (card.querySelector('[' + MARKER + '="card-leaf"]')) continue;
      var leaf = document.createElement('span');
      leaf.className = 'november-card-leaf';
      leaf.setAttribute(MARKER, 'card-leaf');
      leaf.setAttribute('aria-hidden', 'true');
      leaf.style.color = ['#b9553d','#d19b4f','#a63b48'][i % 3];
      leaf.innerHTML = leafSvg;
      card.appendChild(leaf);
    }
  }
  function observePortal(date) {
    if (decoratePortal(date)) {
      if (observer) observer.disconnect();
      observer = null;
      return;
    }
    if (observer) return;
    var root = document.getElementById('app');
    if (!root) return;
    observer = new MutationObserver(function () {
      if (stopped) return;
      if (decoratePortal(dateAtSchool())) {
        observer.disconnect();
        observer = null;
      }
    });
    observer.observe(root, { childList:true, subtree:true });
  }
  function deviceTier() {
    return window.innerWidth <= 720 ? 'mobile' : window.innerWidth <= 1000 ? 'tablet' : 'desktop';
  }
  function addParticle(type, index) {
    var point = [6,92,16,82,26,73,38,62,9,88,49,57][index % 12];
    var element = document.createElement('div');
    var isSnow = type === 'snow';
    var isGust = type === 'gust';
    element.className = 'november-particle november-particle--' + type;
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('--november-x', point + '%');
    element.style.setProperty('--november-size', (isSnow ? 10 + (index % 3) * 3 : 16 + (index % 4) * 3) + 'px');
    element.style.setProperty('--november-duration', (isGust ? 38 : isSnow ? 20 + (index % 4) * 3 : 18 + (index % 4) * 4) + 's');
    element.style.setProperty('--november-delay', '-' + (2 + index * 3.8) + 's');
    element.style.setProperty('--november-drift', ((index % 2 ? -1 : 1) * (20 + index * 5)) + 'px');
    element.style.setProperty('--november-color',
      isSnow ? '#9dbbc6' : ['#b6593c','#d59b50','#9c3440','#ba7241'][index % 4]);
    element.innerHTML = isSnow ? snowSvg : leafSvgVariants[index % leafSvgVariants.length];
    layer.appendChild(element);
  }
  function renderParticles(phase) {
    var tier = deviceTier();
    var key = phase + '|' + tier + '|' + (reducedMotion.matches ? 'still' : 'motion');
    if (particleKey === key) return;
    particleKey = key;
    layer.textContent = '';
    if (reducedMotion.matches) return;
    var counts = {
      autumn: { desktop:[9,0,1], tablet:[7,0,1], mobile:[5,0,0] },
      transition: { desktop:[6,3,1], tablet:[5,2,0], mobile:[3,2,0] },
      winter: { desktop:[3,7,0], tablet:[2,5,0], mobile:[1,4,0] }
    }[phase][tier];
    for (var i = 0; i < counts[0]; i++) addParticle('leaf',i);
    for (var j = 0; j < counts[1]; j++) addParticle('snow',counts[0] + j);
    for (var k = 0; k < counts[2]; k++) addParticle('gust', counts[0] + counts[1] + k);
  }
  function nextWake() {
    if (schedule) clearTimeout(schedule);
    var now = Date.now();
    var next = CHANGE_TIMES.find(function (time) { return time > now; }) || END;
    schedule = setTimeout(sync, Math.max(1,Math.min(86400000,next - now)));
  }
  function cleanUp() {
    if (stopped) return;
    stopped = true;
    if (schedule) clearTimeout(schedule);
    if (observer) observer.disconnect();
    document.documentElement.classList.remove(ROOT_CLASS,'november-paused');
    document.documentElement.removeAttribute('data-november-phase');
    document.querySelectorAll('[' + MARKER + ']').forEach(function (node) { node.remove(); });
    layer = null;
  }
  function sync() {
    if (stopped) return;
    var date = dateAtSchool();
    if (!isActive(date)) {
      if (Date.now() < START) { nextWake(); return; }
      cleanUp(); return;
    }

    document.documentElement.classList.add(ROOT_CLASS);
    document.documentElement.classList.toggle('november-paused',document.hidden);
    var phase = phaseFor(date);
    document.documentElement.setAttribute('data-november-phase',phase);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'november-ambient';
      layer.setAttribute(MARKER,'layer');
      layer.setAttribute('aria-hidden','true');
      document.body.appendChild(layer);
    }
    renderParticles(phase);
    observePortal(date);
    nextWake();
  }
  if (Date.now() >= END) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  } else {
    sync();
  }
  window.addEventListener('pageshow',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',function () {
    if (!stopped && layer && !document.hidden) renderParticles(phaseFor(dateAtSchool()));
  },{passive:true});
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change',sync);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(sync);
  }
})();
