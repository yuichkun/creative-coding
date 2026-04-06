import { describe, expect, it } from "vitest";

import {
  buildProjectDetailPage,
  parsePortfolioHomepage,
  parsePortfolioHomepageModel,
  type HomepageProject,
  type ProjectDetailPage,
  resolveProjectDetailPage,
  resolveProjectReadmePath,
} from "../readmeContracts";
import { normalizeReadmeMedia } from "../media";
import { parseReadmeBody } from "../readmeBody";

import rootReadme from "../../../README.md?raw";
import intervalExplorerReadme from "../../../prototypes/interval-explorer/README.md?raw";
import musicTaxonomyGraphReadme from "../../../prototypes/music-taxonomy-graph/README.md?raw";
import pitchDropperReadme from "../../../prototypes/pitch-dropper/README.md?raw";
import sunaReadme from "../../../prototypes/suna/README.md?raw";
import invalidProjectReadme from "./fixtures/invalid-project-readme.md?raw";
import validProjectReadme from "./fixtures/valid-project-readme.md?raw";

function simplifyHomepageProject(project: HomepageProject) {
  return {
    title: project.title,
    summary: project.summary,
    primaryLink: project.primaryLink
      ? { label: project.primaryLink.label, url: project.primaryLink.url }
      : null,
  };
}

function simplifyDetailPage(page: ProjectDetailPage) {
  return {
    title: page.title,
    summary: page.summary,
    primaryLink: page.primaryLink,
    media: page.media,
    imageUrls: page.imageUrls,
    contentMarkdown: page.contentMarkdown,
    source: page.source,
  };
}

function toAssetFileNamePattern(fileName: string): RegExp {
  const lastDotIndex = fileName.lastIndexOf(".");
  const name = fileName.slice(0, lastDotIndex).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const extension = fileName.slice(lastDotIndex + 1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`${name}(?:-[^/.]+)?\\.${extension}$`);
}

function expectNormalizedAssetUrl(url: string, fileName: string) {
  expect(url).not.toBe(fileName);
  expect(url).toMatch(toAssetFileNamePattern(fileName));
}

function normalizeWithMockAssets(
  contentMarkdown: string,
  readmePath: string,
  assetUrls: Record<string, string>,
) {
  return normalizeReadmeMedia(contentMarkdown, readmePath, {
    resolveAssetUrl: (workspaceRelativeAssetPath) => assetUrls[workspaceRelativeAssetPath] ?? null,
  });
}

function getProject(projects: HomepageProject[], title: string): HomepageProject {
  const project = projects.find((candidate) => candidate.title === title);

  expect(project, `Expected project "${title}" to exist in root README`).toBeDefined();

  return project as HomepageProject;
}

describe("README parsing contracts", () => {
  const projects = parsePortfolioHomepage(rootReadme);
  const homepage = parsePortfolioHomepageModel(rootReadme);

  it("preserves exact root README ordering, titles, summaries, and primary links", () => {
    expect(projects.map(simplifyHomepageProject)).toStrictEqual([
      {
        title: "Single Motion Granular",
        summary:
          "A granular synthesis experiment with an intuitive XY pad interface. Transform audio samples into rich, evolving textures through fluid motion control. Built with RNBO, featuring DSP by [kentaro tools](https://kentaro.tools/).",
        primaryLink: { label: "🔗 Demo", url: "https://kentaro-granular-web.vercel.app/" },
      },
      {
        title: "n4m Feature Extractor",
        summary:
          "A Max/MSP-based real-time neural network training interface. Create custom image classification models by feeding webcam streams through ml5.js. Built for Max 8.0.0+, enabling interactive machine learning experimentation.",
        primaryLink: {
          label: "📝 Learn more",
          url: "https://github.com/yuichkun/n4m-feature-extractor",
        },
      },
      {
        title: "PoseNet for Max",
        summary:
          "A Max/MSP integration of TensorFlow.js PoseNet model via Electron. Enables real-time body tracking and pose estimation directly within Max patches. Features configurable detection parameters and outputs skeletal data as Max-friendly dictionaries.",
        primaryLink: { label: "📝 Learn more", url: "https://github.com/yuichkun/n4m-posenet" },
      },
      {
        title: "Chromesthizer",
        summary:
          "An audio-visual experiment that transforms images into sound using Web Audio API. Upload images and hear their sonic representation with real-time filter controls.",
        primaryLink: { label: "🔗 Demo", url: "https://chromesthizer.vercel.app/" },
      },
      {
        title: "Web Audio Pitch Dropper",
        summary:
          "A vinyl turntable simulator enabling real-time audio playback speed manipulation through Web Audio API's AudioWorklet. Features variable-speed playback from -2x to 2x with reverse capability, and a distinctive pitch-drop effect with smooth 3-second cubic ease-out deceleration. Built with Vue and TypeScript, featuring drag-and-drop audio upload, sample-accurate interpolation, and an animated record visualization synchronized to playback speed.",
        primaryLink: { label: "🔗 Demo", url: "https://web-audio-pitch-dropper.vercel.app/" },
      },
      {
        title: "Building Audio Apps with JavaScript",
        summary:
          "An interactive presentation exploring professional audio application development in JavaScript. Covers Web Audio API graph-based architecture, AudioWorklet's high-priority processing thread, and WebAssembly integration via JUCE and RNBO. Features live demonstrations of custom reverb implementations, convolution reverb, and experimental WebGPU-accelerated audio processing. Built with Slidev, supporting English, Japanese, and Chinese.",
        primaryLink: { label: "🔗 Demo", url: "https://building-audio-apps-with-js.vercel.app/" },
      },
      {
        title: "Kodama",
        summary:
          'A digital delay audio plugin with a shared Rust DSP core supporting dual runtimes: native plugins (VST3/AU via JUCE) and web-based audio processing (WASM + AudioWorklet). Features 4 parameters including Voices (1-16) for multi-tap "mountain echo" effect, delay time, feedback, and dry/wet mix. Includes real-time waveform visualization with per-voice color coding and adjustable zoom. Built with Vue 3 + TypeScript + Tailwind CSS.',
        primaryLink: { label: "📝 Learn more", url: "https://github.com/yuichkun/kodama-vst" },
      },
      {
        title: "Suna",
        summary:
          "A delay effect plugin (VST3/AU) with DSP written in MoonBit compiled to WebAssembly. Runs on dual runtimes: native via JUCE + WAMR AOT, and browser via AudioWorklet + WASM. Features delay time (0–2000ms), feedback, and dry/wet mix controls. Shares a single Vue 3 UI and a single MoonBit DSP core across all platforms.",
        primaryLink: { label: "🔗 Demo", url: "https://suna-eight-chi.vercel.app/" },
      },
      {
        title: "Interval Explorer",
        summary:
          "A Max for Live MIDI device for exploring musical interval combinations and chord voicings. Features combinatorial interval generation and real-time MIDI processing for experimental composition.",
        primaryLink: {
          label: "📝 Learn more",
          url: "https://github.com/yuichkun/interval-explorer",
        },
      },
      {
        title: "Extreme VJ Camp 2026",
        summary:
          "A browser-based real-time VJ performance tool driven by microphone input and gamepad control. Web Audio API captures audio and feeds FFT spectrum, waveform, and frequency band energies into GLSL fragment shaders as uniforms. A custom beat detection system—spectral flux onset detection, autocorrelation tempo estimation, and a phase-locked loop—keeps visuals tightly synced to rhythm. Shader scenes include a 2D audio-reactive waveform visualizer and a raymarched 3D scene with 8 smoothly morphable SDF shapes, tiled repetition, and beat-reactive scaling.",
        primaryLink: { label: "🔗 Demo", url: "https://yogo-extreme-vj-camp-2026.vercel.app/" },
      },
      {
        title: "People",
        summary:
          "An interactive art installation exploring communication and artificial consciousness through networked string telephones with embedded AI. Each ESP32-powered cup displays text on OLED screens and plays audio, while modifying word vectors to reinterpret messages as they pass through the chain—creating a technological game of telephone that questions the nature of communication and personhood.",
        primaryLink: { label: "🎥 Video", url: "https://www.youtube.com/watch?v=v-NETHnK0Mo" },
      },
      {
        title: "Music Taxonomy Graph",
        summary:
          "An interactive radial mind-map for exploring 430+ music genres across English, Japanese, and Chinese. Click a genre to fan out its sub-genres, watch inline YouTube examples in a draggable detail panel, and navigate freely through the taxonomy. Built with React 19, TypeScript, and React Flow with vanilla layout and drag/resize logic.",
        primaryLink: { label: "🔗 Demo", url: "https://music-taxonomy-graph.vercel.app/" },
      },
      {
        title: "Kokuyo Design Award 2022 Virtual Trophy",
        summary:
          "A [Next.js](https://nextjs.org/)-based 3D trophy viewer that displays time-evolving models using [model-viewer](https://modelviewer.dev/). Features daily model transitions with extensive [Playwright](https://playwright.dev/) testing to ensure consistent rendering across 366 days.",
        primaryLink: { label: "🔗 Demo", url: "https://www.kokuyo.co.jp/trophy2022/" },
      },
      {
        title: "Layered Pixelation",
        summary:
          "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
        primaryLink: { label: "🔗 Demo", url: "https://layered-pixelation.vercel.app/" },
      },
      {
        title: "Image Tessellation",
        summary:
          "A [Processing](https://processing.org/)-based mosaic art generator that reconstructs images using collections of thematically related photos. Features real-time image analysis and dynamic grid adjustments.",
        primaryLink: {
          label: "📝 Learn more",
          url: "https://github.com/yuichkun/mosaic-by-image-gathering/blob/master/README.md",
        },
      },
      {
        title: "Text-Masked Video",
        summary:
          'A web experiment that uses SVG masking to reveal video through text. The text "Not Found?" gradually appears character by character, creating a mask that reveals the video underneath. Built with SVG masks and vanilla JavaScript for text animation.',
        primaryLink: { label: "🔗 Demo", url: "https://css-mask-video-with-text.vercel.app/" },
      },
      {
        title: "Animated URL Bar",
        summary:
          "An experimental browser interface that turns the URL bar into an animation canvas. Uses `window.history.pushState()` to create flowing animations with emojis and text, demonstrating unconventional uses of browser APIs. Features multiple animation effects including character code manipulation and wave-like patterns running at 7 FPS.",
        primaryLink: {
          label: "📝 Learn more",
          url: "https://github.com/yuichkun/animated-url-bar",
        },
      },
      {
        title: "ASCII Art Generator",
        summary:
          "A web-based image to ASCII art converter using Canvas API. Features intelligent character density analysis - each character in the custom character set is rendered to canvas to calculate its visual weight, creating more accurate brightness mapping. Maintains image aspect ratio through different horizontal and vertical sampling rates (5px × 10px), with real-time preview on character set changes.",
        primaryLink: { label: "🔗 Demo", url: "https://codepen.io/yuichkun/pen/yLGGrOv" },
      },
      {
        title: "Reference Graph",
        summary:
          'A VS Code extension that visualizes code references as an interactive graph. Built with React Flow and ELKjs for smart automatic layout. Features syntax-highlighted code previews in each node, glob-based file filtering, PNG export, and click-to-navigate functionality. Works with any language that has LSP "Find All References" support.',
        primaryLink: {
          label: "🔗 VS Code Marketplace",
          url: "https://marketplace.visualstudio.com/items?itemName=yuichkun.reference-graph",
        },
      },
    ]);
  });

  it("emits the canonical homepage schema with preserved section and subsection hierarchy", () => {
    expect(homepage.sections.map((section) => section.title)).toStrictEqual([
      "Audio",
      "Visuals",
      "Developer Tools",
    ]);

    expect(homepage.sections).toStrictEqual([
      {
        title: "Audio",
        slug: "audio",
        projects: [
          getProject(projects, "Chromesthizer"),
          getProject(projects, "Web Audio Pitch Dropper"),
          getProject(projects, "Building Audio Apps with JavaScript"),
        ],
        subsections: [
          {
            title: "Cycling '74 Max",
            slug: "cycling-74-max",
            projects: [
              getProject(projects, "Single Motion Granular"),
              getProject(projects, "n4m Feature Extractor"),
              getProject(projects, "PoseNet for Max"),
            ],
          },
          {
            title: "Plugins",
            slug: "plugins",
            projects: [
              getProject(projects, "Kodama"),
              getProject(projects, "Suna"),
              getProject(projects, "Interval Explorer"),
            ],
          },
        ],
      },
      {
        title: "Visuals",
        slug: "visuals",
        projects: [
          getProject(projects, "Extreme VJ Camp 2026"),
          getProject(projects, "People"),
          getProject(projects, "Music Taxonomy Graph"),
          getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy"),
          getProject(projects, "Layered Pixelation"),
          getProject(projects, "Image Tessellation"),
          getProject(projects, "Text-Masked Video"),
          getProject(projects, "Animated URL Bar"),
          getProject(projects, "ASCII Art Generator"),
        ],
        subsections: [],
      },
      {
        title: "Developer Tools",
        slug: "developer-tools",
        projects: [getProject(projects, "Reference Graph")],
        subsections: [],
      },
    ]);
  });

  it("derives stable slugs, route ids, and normalized link metadata", () => {
    expect(getProject(projects, "Single Motion Granular")).toMatchObject({
      section: { title: "Audio", slug: "audio" },
      subsection: { title: "Cycling '74 Max", slug: "cycling-74-max" },
      slug: "single-motion-granular",
      routeId: "single-motion-granular",
      primaryLink: {
        label: "🔗 Demo",
        normalizedLabel: "Demo",
        type: "demo",
        url: "https://kentaro-granular-web.vercel.app/",
      },
    });

    expect(getProject(projects, "People").links).toStrictEqual([
      {
        label: "🎥 Video",
        normalizedLabel: "Video",
        type: "video",
        url: "https://www.youtube.com/watch?v=v-NETHnK0Mo",
      },
      {
        label: "📝 Learn more",
        normalizedLabel: "Learn more",
        type: "learn-more",
        url: "https://github.com/yuichkun/people",
      },
    ]);

    expect(getProject(projects, "Reference Graph").primaryLink).toStrictEqual({
      label: "🔗 VS Code Marketplace",
      normalizedLabel: "VS Code Marketplace",
      type: "marketplace",
      url: "https://marketplace.visualstudio.com/items?itemName=yuichkun.reference-graph",
    });
  });

  it("keeps flat project ordering identical to the root README while exposing hierarchy", () => {
    expect(homepage.projects.map((project) => project.title)).toStrictEqual(
      projects.map((project) => project.title),
    );
    expect(homepage.sections[1]?.projects.map((project) => project.title)).toStrictEqual([
      "Extreme VJ Camp 2026",
      "People",
      "Music Taxonomy Graph",
      "Kokuyo Design Award 2022 Virtual Trophy",
      "Layered Pixelation",
      "Image Tessellation",
      "Text-Masked Video",
      "Animated URL Bar",
      "ASCII Art Generator",
    ]);
  });

  it("captures markdown image syntax from the root README", () => {
    expect(getProject(projects, "Single Motion Granular").imageUrls).toStrictEqual([
      "https://raw.githubusercontent.com/yuichkun/kentaro-granular-web/master/single-motion-granular.gif",
    ]);
    expect(getProject(projects, "Single Motion Granular").media).toStrictEqual([
      {
        kind: "image",
        syntax: "markdown",
        alt: "",
        originalUrl:
          "https://raw.githubusercontent.com/yuichkun/kentaro-granular-web/master/single-motion-granular.gif",
        url: "https://raw.githubusercontent.com/yuichkun/kentaro-granular-web/master/single-motion-granular.gif",
      },
    ]);
  });

  it("captures raw HTML img tags from the root README", () => {
    expect(getProject(projects, "Extreme VJ Camp 2026").imageUrls).toStrictEqual([
      "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/1.gif",
      "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/2.gif",
    ]);
    expect(getProject(projects, "Extreme VJ Camp 2026").media).toStrictEqual([
      {
        kind: "image",
        syntax: "html",
        alt: "",
        originalUrl:
          "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/1.gif",
        url: "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/1.gif",
      },
      {
        kind: "image",
        syntax: "html",
        alt: "",
        originalUrl:
          "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/2.gif",
        url: "https://raw.githubusercontent.com/yuichkun/extreme-vj-camp-2026/main/screenshots/2.gif",
      },
    ]);
  });

  it("normalizes local relative asset URLs from the root README", () => {
    const kokuyoProject = getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy");
    const layeredPixelationProject = getProject(projects, "Layered Pixelation");

    expect(kokuyoProject.media).toStrictEqual([
      {
        kind: "image",
        syntax: "html",
        alt: "",
        originalUrl: "./assets/kokuyo-design-award-2022.gif",
        url: kokuyoProject.imageUrls[0]!,
      },
    ]);
    expectNormalizedAssetUrl(kokuyoProject.imageUrls[0]!, "kokuyo-design-award-2022.gif");

    expect(layeredPixelationProject.media).toStrictEqual([
      {
        kind: "image",
        syntax: "html",
        alt: "",
        originalUrl: "./prototypes/layered-pixelation/screenshot.gif",
        url: layeredPixelationProject.imageUrls[0]!,
      },
    ]);
    expectNormalizedAssetUrl(layeredPixelationProject.imageUrls[0]!, "screenshot.gif");
    expect(getProject(projects, "Layered Pixelation").primaryLink).toStrictEqual({
      label: "🔗 Demo",
      normalizedLabel: "Demo",
      type: "demo",
      url: "https://layered-pixelation.vercel.app/",
    });
    expect(getProject(projects, "Layered Pixelation").links[1]).toStrictEqual({
      label: "📝 Learn more",
      normalizedLabel: "Learn more",
      type: "learn-more",
      url: "./prototypes/layered-pixelation/README.md",
    });
  });

  it("preserves external image URLs from the root README", () => {
    expect(getProject(projects, "Reference Graph").imageUrls).toStrictEqual([
      "https://raw.githubusercontent.com/yuichkun/reference-graph/main/screenshot.gif",
    ]);
    expect(getProject(projects, "Reference Graph").media).toStrictEqual([
      {
        kind: "image",
        syntax: "markdown",
        alt: "",
        originalUrl:
          "https://raw.githubusercontent.com/yuichkun/reference-graph/main/screenshot.gif",
        url: "https://raw.githubusercontent.com/yuichkun/reference-graph/main/screenshot.gif",
      },
    ]);
  });

  it("normalizes markdown and HTML image nodes through one shared media model", () => {
    const normalizedRootMarkdownImage = normalizeWithMockAssets(
      "![](https://raw.githubusercontent.com/example/demo.gif)",
      "/workspace/README.md",
      {},
    );
    const normalizedRootHtmlImage = normalizeWithMockAssets(
      '<img src="https://raw.githubusercontent.com/example/demo-2.gif" width="500">',
      "/workspace/README.md",
      {},
    );

    expect(normalizedRootMarkdownImage.media).toStrictEqual([
      {
        kind: "image",
        syntax: "markdown",
        alt: "",
        originalUrl: "https://raw.githubusercontent.com/example/demo.gif",
        url: "https://raw.githubusercontent.com/example/demo.gif",
      },
    ]);
    expect(normalizedRootHtmlImage.media).toStrictEqual([
      {
        kind: "image",
        syntax: "html",
        alt: "",
        originalUrl: "https://raw.githubusercontent.com/example/demo-2.gif",
        url: "https://raw.githubusercontent.com/example/demo-2.gif",
      },
    ]);
  });

  it("rewrites local asset references relative to the source README while preserving mixed links", () => {
    const rootNormalization = normalizeWithMockAssets(
      [
        '<img src="./assets/kokuyo-design-award-2022.gif" width="500">',
        "",
        '<img src="./prototypes/layered-pixelation/screenshot.gif" width="500">',
        "",
        "[🔗 Demo](https://layered-pixelation.vercel.app/) • [📝 Learn more](./prototypes/layered-pixelation/README.md)",
      ].join("\n"),
      "/workspace/README.md",
      {
        "assets/kokuyo-design-award-2022.gif": "/static/root/kokuyo-design-award-2022.gif",
        "prototypes/layered-pixelation/screenshot.gif":
          "/static/root/layered-pixelation-screenshot.gif",
      },
    );
    const projectMarkdownNormalization = normalizeWithMockAssets(
      "![Layered Pixelation](./screenshot.gif)",
      "/workspace/prototypes/layered-pixelation/README.md",
      { "prototypes/layered-pixelation/screenshot.gif": "/static/project/screenshot.gif" },
    );
    const projectBareSiblingNormalization = normalizeWithMockAssets(
      pitchDropperReadme,
      "/workspace/prototypes/pitch-dropper/README.md",
      {
        "prototypes/pitch-dropper/screenshot.gif": "/static/project/pitch-dropper-screenshot.gif",
      },
    );
    const nestedGifNormalization = normalizeWithMockAssets(
      sunaReadme,
      "/workspace/prototypes/suna/README.md",
      {
        "prototypes/suna/docs/screenshot.gif": "/static/project/suna-docs-screenshot.gif",
      },
    );
    const nestedPngNormalization = normalizeWithMockAssets(
      musicTaxonomyGraphReadme,
      "/workspace/prototypes/music-taxonomy-graph/README.md",
      {
        "prototypes/music-taxonomy-graph/docs/screenshot.png":
          "/static/project/music-taxonomy-screenshot.png",
      },
    );
    const localHtmlGifNormalization = normalizeWithMockAssets(
      '<p align="center">\n  <img src="./screenshots/1.gif" width="600" alt="Scene A">\n</p>',
      "/workspace/prototypes/extreme-vj-camp-2026/README.md",
      {
        "prototypes/extreme-vj-camp-2026/screenshots/1.gif":
          "/static/project/extreme-vj-camp-scene-a.gif",
      },
    );
    const linkedImageNormalization = normalizeWithMockAssets(
      intervalExplorerReadme,
      "/workspace/prototypes/interval-explorer/README.md",
      {
        "prototypes/interval-explorer/interval-explorer.png":
          "/static/project/interval-explorer.png",
        "prototypes/interval-explorer/pianoid-ii.jpg": "/static/project/pianoid-ii.jpg",
      },
    );

    expect(rootNormalization.imageUrls).toStrictEqual([
      "/static/root/kokuyo-design-award-2022.gif",
      "/static/root/layered-pixelation-screenshot.gif",
    ]);
    expect(rootNormalization.contentMarkdown).toContain(
      '<img src="/static/root/kokuyo-design-award-2022.gif" width="500">',
    );
    expect(rootNormalization.contentMarkdown).toContain(
      '<img src="/static/root/layered-pixelation-screenshot.gif" width="500">',
    );
    expect(rootNormalization.contentMarkdown).toContain(
      "[🔗 Demo](https://layered-pixelation.vercel.app/) • [📝 Learn more](./prototypes/layered-pixelation/README.md)",
    );

    expect(projectMarkdownNormalization).toStrictEqual({
      imageUrls: ["/static/project/screenshot.gif"],
      media: [
        {
          kind: "image",
          syntax: "markdown",
          alt: "Layered Pixelation",
          originalUrl: "./screenshot.gif",
          url: "/static/project/screenshot.gif",
        },
      ],
      contentMarkdown: "![Layered Pixelation](/static/project/screenshot.gif)",
    });
    expect(projectBareSiblingNormalization.contentMarkdown).toContain(
      '<img src="/static/project/pitch-dropper-screenshot.gif" alt="Demo">',
    );
    expect(projectBareSiblingNormalization.imageUrls).toContain(
      "/static/project/pitch-dropper-screenshot.gif",
    );
    expect(nestedGifNormalization.contentMarkdown).toContain(
      '<img src="/static/project/suna-docs-screenshot.gif" alt="suna delay plugin" width="600">',
    );
    expect(nestedGifNormalization.imageUrls).toContain("/static/project/suna-docs-screenshot.gif");
    expect(nestedPngNormalization.contentMarkdown).toContain(
      "![screenshot](/static/project/music-taxonomy-screenshot.png)",
    );
    expect(nestedPngNormalization.imageUrls).toContain(
      "/static/project/music-taxonomy-screenshot.png",
    );
    expect(localHtmlGifNormalization.contentMarkdown).toContain(
      '<img src="/static/project/extreme-vj-camp-scene-a.gif" width="600" alt="Scene A">',
    );
    expect(linkedImageNormalization.contentMarkdown).toContain(
      "[![Pianoid II](/static/project/pianoid-ii.jpg)](https://www.youtube.com/watch?v=56ylqLaRp0c)",
    );
    expect(linkedImageNormalization.media).toContainEqual({
      kind: "image",
      syntax: "markdown",
      alt: "Pianoid II",
      originalUrl: "pianoid-ii.jpg",
      url: "/static/project/pianoid-ii.jpg",
      linkUrl: "https://www.youtube.com/watch?v=56ylqLaRp0c",
    });
  });

  it("omits broken local asset references safely instead of throwing", () => {
    const normalizedBrokenStandaloneImage = normalizeWithMockAssets(
      "![Missing](./missing.gif)\n\nBody text remains.",
      "/workspace/prototypes/layered-pixelation/README.md",
      {},
    );
    const normalizedBrokenLinkedImage = normalizeWithMockAssets(
      "[![Missing](missing.gif)](https://example.com/demo)",
      "/workspace/prototypes/pitch-dropper/README.md",
      {},
    );
    const normalizedBrokenHtmlImage = normalizeWithMockAssets(
      '<p><img src="./missing.gif" alt="Missing"></p>',
      "/workspace/prototypes/suna/README.md",
      {},
    );

    expect(normalizedBrokenStandaloneImage.media).toStrictEqual([]);
    expect(normalizedBrokenStandaloneImage.imageUrls).toStrictEqual([]);
    expect(normalizedBrokenStandaloneImage.contentMarkdown).toBe("Body text remains.");

    expect(normalizedBrokenLinkedImage.media).toStrictEqual([]);
    expect(normalizedBrokenLinkedImage.contentMarkdown).toBe("[Missing](https://example.com/demo)");

    expect(normalizedBrokenHtmlImage.media).toStrictEqual([]);
    expect(normalizedBrokenHtmlImage.imageUrls).toStrictEqual([]);
    expect(normalizedBrokenHtmlImage.contentMarkdown).toBe("<p></p>");
  });

  it("preserves mixed link types from the root README", () => {
    expect(getProject(projects, "People").links).toStrictEqual([
      {
        label: "🎥 Video",
        normalizedLabel: "Video",
        type: "video",
        url: "https://www.youtube.com/watch?v=v-NETHnK0Mo",
      },
      {
        label: "📝 Learn more",
        normalizedLabel: "Learn more",
        type: "learn-more",
        url: "https://github.com/yuichkun/people",
      },
    ]);
    expect(getProject(projects, "Reference Graph").links).toStrictEqual([
      {
        label: "🔗 VS Code Marketplace",
        normalizedLabel: "VS Code Marketplace",
        type: "marketplace",
        url: "https://marketplace.visualstudio.com/items?itemName=yuichkun.reference-graph",
      },
      {
        label: "📝 Learn more",
        normalizedLabel: "Learn more",
        type: "learn-more",
        url: "https://github.com/yuichkun/reference-graph",
      },
    ]);
  });

  it("uses per-project README content for the detail page when available", () => {
    const homepageProject = getProject(projects, "Layered Pixelation");
    const detailPage = buildProjectDetailPage(
      homepageProject,
      validProjectReadme,
      "/workspace/prototypes/layered-pixelation/README.md",
    );

    expect(simplifyDetailPage(detailPage)).toStrictEqual({
      title: "Layered Pixelation",
      summary:
        "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
      primaryLink: {
        label: "🔗 Demo",
        normalizedLabel: "Demo",
        type: "demo",
        url: "https://layered-pixelation.vercel.app/",
      },
      media: [
        {
          kind: "image",
          syntax: "markdown",
          alt: "Detail screenshot",
          originalUrl: "./screenshot.gif",
          url: detailPage.imageUrls[0]!,
        },
      ],
      imageUrls: [detailPage.imageUrls[0]!],
      contentMarkdown: `![Detail screenshot](${detailPage.imageUrls[0]!})\n\n[🔗 Demo](https://layered-pixelation-detail.example.com/) • [📝 Learn more](https://example.com/layered-pixelation)\n\nThis detailed README content should drive the detail page instead of the homepage summary.\n\nIt documents the rendering pipeline, the shader layering approach, and the interaction model.`,
      source: "project-readme",
    });
    expectNormalizedAssetUrl(detailPage.imageUrls[0]!, "screenshot.gif");
  });

  it("parses normalized README bodies into a safe supported block subset", () => {
    const homepageProject = getProject(projects, "Web Audio Pitch Dropper");
    const detailPage = buildProjectDetailPage(
      homepageProject,
      pitchDropperReadme,
      "/workspace/prototypes/pitch-dropper/README.md",
    );
    const blocks = parseReadmeBody(detailPage.contentMarkdown);

    expect(blocks.some((block) => block.type === "image")).toBe(true);
    expect(
      blocks.some(
        (block) =>
          block.type === "heading" && block.level === 2 && block.content[0]?.type === "text",
      ),
    ).toBe(true);
    expect(
      blocks.some((block) => block.type === "list" && !block.ordered && block.items.length >= 4),
    ).toBe(true);
    expect(
      blocks.some(
        (block) =>
          block.type === "code" &&
          block.language === "mermaid" &&
          block.value.includes("sequenceDiagram"),
      ),
    ).toBe(true);
    expect(() =>
      parseReadmeBody("<table><tr><td>unsupported</td></tr></table>\n\nBody text."),
    ).not.toThrow();
  });

  it("falls back to a minimal detail page when the project README is missing or unparseable", () => {
    const homepageProject = getProject(projects, "Layered Pixelation");
    const fallbackPage = buildProjectDetailPage(homepageProject, null);
    const expectedFallback = {
      title: "Layered Pixelation",
      summary:
        "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
      primaryLink: {
        label: "🔗 Demo",
        normalizedLabel: "Demo",
        type: "demo",
        url: "https://layered-pixelation.vercel.app/",
      },
      media: [
        {
          kind: "image",
          syntax: "html",
          alt: "",
          originalUrl: "./prototypes/layered-pixelation/screenshot.gif",
          url: fallbackPage.imageUrls[0]!,
        },
      ],
      imageUrls: [fallbackPage.imageUrls[0]!],
      contentMarkdown: `![](${fallbackPage.imageUrls[0]!})\n\n[🔗 Demo](https://layered-pixelation.vercel.app/) • [📝 Learn more](./prototypes/layered-pixelation/README.md)\n\nInteractive WebGL experiment with dynamic pixelation effects and mouse-based distortion.`,
      source: "homepage-fallback" as const,
    };

    expect(simplifyDetailPage(fallbackPage)).toStrictEqual(expectedFallback);
    expectNormalizedAssetUrl(fallbackPage.imageUrls[0]!, "screenshot.gif");
    expect(
      simplifyDetailPage(buildProjectDetailPage(homepageProject, invalidProjectReadme)),
    ).toStrictEqual(expectedFallback);
  });

  it("resolves a direct local README link when the root README already points to a canonical local file", async () => {
    const homepageProject = getProject(projects, "Layered Pixelation");

    await expect(resolveProjectReadmePath(homepageProject)).resolves.toBe(
      "/workspace/prototypes/layered-pixelation/README.md",
    );

    await expect(resolveProjectDetailPage(homepageProject)).resolves.toMatchObject({
      title: "Layered Pixelation",
      source: "project-readme",
    });

    const detailPage = await resolveProjectDetailPage(homepageProject);
    expect(detailPage.imageUrls).toHaveLength(1);
    expectNormalizedAssetUrl(detailPage.imageUrls[0]!, "screenshot.gif");
  });

  it("resolves mapped project-root READMEs for title and folder mismatches", async () => {
    await expect(
      resolveProjectReadmePath(getProject(projects, "Single Motion Granular")),
    ).resolves.toBe("/workspace/prototypes/single-motion-granular/README.md");
    await expect(
      resolveProjectReadmePath(getProject(projects, "Web Audio Pitch Dropper")),
    ).resolves.toBe("/workspace/prototypes/pitch-dropper/README.md");
    await expect(resolveProjectReadmePath(getProject(projects, "Text-Masked Video"))).resolves.toBe(
      "/workspace/prototypes/css-mask-video-with-text/README.md",
    );
  });

  it("falls back cleanly when a project has no resolvable canonical local README", async () => {
    const kokuyoProject = getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy");
    const asciiProject = getProject(projects, "ASCII Art Generator");

    await expect(resolveProjectReadmePath(kokuyoProject)).resolves.toBeNull();
    await expect(resolveProjectReadmePath(asciiProject)).resolves.toBeNull();

    await expect(resolveProjectDetailPage(kokuyoProject)).resolves.toStrictEqual({
      title: "Kokuyo Design Award 2022 Virtual Trophy",
      summary:
        "A [Next.js](https://nextjs.org/)-based 3D trophy viewer that displays time-evolving models using [model-viewer](https://modelviewer.dev/). Features daily model transitions with extensive [Playwright](https://playwright.dev/) testing to ensure consistent rendering across 366 days.",
      primaryLink: {
        label: "🔗 Demo",
        normalizedLabel: "Demo",
        type: "demo",
        url: "https://www.kokuyo.co.jp/trophy2022/",
      },
      media: [
        {
          kind: "image",
          syntax: "html",
          alt: "",
          originalUrl: "./assets/kokuyo-design-award-2022.gif",
          url: getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy").imageUrls[0]!,
        },
      ],
      imageUrls: [getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy").imageUrls[0]!],
      contentMarkdown: `![](${getProject(projects, "Kokuyo Design Award 2022 Virtual Trophy").imageUrls[0]!})\n\n[🔗 Demo](https://www.kokuyo.co.jp/trophy2022/) • [📝 Learn more](https://yogo-management-office.com/works/kokuyo-design-award-2022)\n\nA [Next.js](https://nextjs.org/)-based 3D trophy viewer that displays time-evolving models using [model-viewer](https://modelviewer.dev/). Features daily model transitions with extensive [Playwright](https://playwright.dev/) testing to ensure consistent rendering across 366 days.`,
      source: "homepage-fallback",
    });
  });

  it("ignores localized sibling and nested descendant READMEs in favor of the project-root README", async () => {
    await expect(resolveProjectReadmePath(getProject(projects, "Reference Graph"))).resolves.toBe(
      "/workspace/prototypes/reference-graph/README.md",
    );
    await expect(resolveProjectReadmePath(getProject(projects, "Kodama"))).resolves.toBe(
      "/workspace/prototypes/kodama-vst/README.md",
    );

    await expect(
      resolveProjectDetailPage(getProject(projects, "Reference Graph")),
    ).resolves.toMatchObject({
      title: "Reference Graph",
      source: "project-readme",
    });
    await expect(resolveProjectDetailPage(getProject(projects, "Kodama"))).resolves.toMatchObject({
      title: "Kodama",
      source: "project-readme",
    });
  });
});
