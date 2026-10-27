import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import AutoImport from "unplugin-auto-import/vite";
// import { readdyJsxRuntimeProxyPlugin } from "./vite.jsx-runtime-proxy";

const base = process.env.BASE_PATH || "/";
const isPreview = process.env.IS_PREVIEW ? true : false;
const manifestCategory = process.env.KF_MANIFEST_CATEGORY || "Component";
const zipBuild = process.env.ZIP_BUILD === "1";
//const proxyPlugins = isPreview ? [readdyJsxRuntimeProxyPlugin()] : [];
// https://vite.dev/config/
export default defineConfig({
  define: {
    __BASE_PATH__: JSON.stringify(base),
    __IS_PREVIEW__: JSON.stringify(isPreview),
    __READDY_PROJECT_ID__: JSON.stringify(process.env.PROJECT_ID || ""),
    __READDY_VERSION_ID__: JSON.stringify(process.env.VERSION_ID || ""),
    __READDY_AI_DOMAIN__: JSON.stringify(process.env.READDY_AI_DOMAIN || ""),
  },
  plugins: [
    // ...proxyPlugins,
    react(),
    AutoImport({
      imports: [
        {
          react: [
            ["default", "React"],
            "useState",
            "useEffect",
            "useContext",
            "useReducer",
            "useCallback",
            "useMemo",
            "useRef",
            "useImperativeHandle",
            "useLayoutEffect",
            "useDebugValue",
            "useDeferredValue",
            "useId",
            "useInsertionEffect",
            "useSyncExternalStore",
            "useTransition",
            "startTransition",
            "lazy",
            "memo",
            "forwardRef",
            "createContext",
            "createElement",
            "cloneElement",
            "isValidElement",
          ],
        },
        {
          "react-router-dom": [
            "useNavigate",
            "useLocation",
            "useParams",
            "useSearchParams",
            "Link",
            "NavLink",
            "Navigate",
            "Outlet",
          ],
        },
        // React i18n
        {
          "react-i18next": ["useTranslation", "Trans"],
        },
      ],
      dts: true,
    }),
    {
      name: "emit-manifest-vite-plugin",
      writeBundle() {
        const manifestContent = {
          Category: manifestCategory,
          Framework: "React",
        };
        const outputPath = resolve(__dirname, "dist/manifest.json");
        writeFileSync(outputPath, JSON.stringify(manifestContent, null, 2));
      },
    },
    {
      name: "define-resolve-attachment-url",
      generateBundle(_opts, bundle) {
        const prelude = `function resolveAttachmentUrl(file){if(!file||typeof file!=="object")return null;var c=[file.url,file.URL,file.Url,file.download_url,file.downloadUrl,file.File_URL,file.file_url,file.href,file.link,file.preview_url,file.previewUrl],photos=Array.isArray(file.photos)?file.photos:[],i,t;for(i=0;i<photos.length;i++){if(photos[i]&&typeof photos[i]==="object")c.push(photos[i].url,photos[i].URL,photos[i].Url,photos[i].href,photos[i].link)}for(i=0;i<c.length;i++){t=String(c[i]==null?"":c[i]).trim();if(t&&(t.indexOf("http")===0||t.charAt(0)==="/"))return t}return null;}\n`;
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk" && chunk.fileName.endsWith(".js") && !chunk.code.startsWith("function resolveAttachmentUrl(")) {
            chunk.code = prelude + chunk.code;
          }
        }
      },
    },
    {
      name: "kissflow-cache-bust-html",
      closeBundle() {
        if (!zipBuild) return;
        const htmlPath = resolve(__dirname, "dist/index.html");
        const stamp = process.env.ITSM_PACK_STAMP || `itsm-${Date.now()}`;
        let html = "";
        try {
          html = readFileSync(htmlPath, "utf8");
        } catch {
          return;
        }
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>ITSM ${stamp}</title>`,
        );
        if (!html.includes('name="itsm-pack"')) {
          html = html.replace(
            "<head>",
            `<head>\n    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">\n    <meta http-equiv="Pragma" content="no-cache">\n    <meta name="itsm-pack" content="${stamp}">`,
          );
        }
        // Kissflow hosts the zip on GCS. A ?v= query on ./assets/* is treated as
        // a different object key → NoSuchKey and a blank iframe (raw S3 XML).
        html = html.replace(/<link[^>]+href="\/vite\.svg"[^>]*>/g, "");
        writeFileSync(htmlPath, html);
      },
    },
  ],
  base: process.env.VITE_GCP_CEO_HOST === "1" ? "/" : "",
  build: {
    sourcemap: zipBuild ? false : true,
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});
