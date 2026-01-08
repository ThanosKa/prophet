import { defineManifest } from "@crxjs/vite-plugin";

const manifest = defineManifest({
  manifest_version: 3,
  name: "Prophet AI - Assistant",
  version: "1.0.0",
  description: "Your AI-powered assistant right in your browser",

  permissions: [
    "sidePanel",
    "storage",
    "cookies",
    "tabs",
    "activeTab",
    "scripting",
    "debugger",
  ],
  host_permissions: [
    "http://localhost:3000/*",
    "http://localhost:3001/*",
    "<all_urls>",
  ],

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
