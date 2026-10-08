import { defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Prophet: AI Side Panel Agent",
  version: "1.0.6",
  description:
    "Works with Claude Haiku, Sonnet and Opus. Lives in your side panel, acts on the page you're on, and bills pay per use.",

  permissions: [
    "sidePanel",
    "storage",
    "cookies",
    "tabs",
    "activeTab",
    "scripting",
    "debugger",
  ],
  host_permissions: ["https://prophetchrome.com/*", "<all_urls>"],

  side_panel: {
    default_path: "sidepanel.html",
  },
  options_page: "options.html",

  action: {
    default_title: "Prophet",
    default_icon: {
      16: "images/icon-16.png",
      48: "images/icon-48.png",
      128: "images/icon-128.png",
    },
  },

  icons: {
    16: "images/icon-16.png",
    48: "images/icon-48.png",
    128: "images/icon-128.png",
  },

  background: {
    service_worker: "src/background.ts",
  },

  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.ts"],
    },
  ],
});

export default manifest;
