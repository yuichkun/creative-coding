<template>
  <main class="app-shell">
    <header class="site-chrome">
      <a href="/" class="site-brand">
        <span class="site-brand__kicker">作品目録</span>
        <span class="site-brand__title">Code + Art</span>
      </a>

      <nav class="site-nav" aria-label="主要ナビゲーション">
        <a href="/">作品一覧</a>
        <span class="site-nav__separator" aria-hidden="true">／</span>
        <span class="site-nav__current">{{ currentPageLabel }}</span>
      </nav>
    </header>

    <template v-if="route.type === 'home'">
      <section class="page-hero">
        <p class="section-kicker">ルート README 準拠</p>
        <h1>作品一覧</h1>
        <p class="description">
          README の階層順をそのまま保ち、分野・小分類・作品の順に静かに読める最小構成です。全
          {{ totalProjectCount }} 件の作品を一覧できます。
        </p>
      </section>

      <section id="works" class="catalog" aria-label="README 由来の作品階層">
        <section
          v-for="section in siteData.homepage.sections"
          :key="section.slug"
          class="catalog-section"
        >
          <header class="catalog-heading">
            <p class="catalog-heading__label">分野</p>
            <div class="catalog-heading__body">
              <h2>{{ section.title }}</h2>
              <p class="catalog-heading__meta">{{ getSectionProjectCount(section) }} 件の作品</p>
            </div>
          </header>

          <div v-if="section.projects.length > 0" class="catalog-group">
            <p class="catalog-group__label">作品</p>

            <div class="work-grid">
              <article v-for="project in section.projects" :key="project.routeId" class="work-card">
                <h3 class="work-card__title">
                  <a :href="getProjectDetailPath(project.routeId)">{{ project.title }}</a>
                </h3>
                <p class="work-card__summary">{{ project.summary }}</p>

                <ul
                  v-if="project.links.length > 0"
                  class="work-card__links"
                  aria-label="関連リンク"
                >
                  <li v-for="link in project.links" :key="`${project.routeId}-${link.url}`">
                    <a :href="link.url">{{ getUiLinkLabel(link) }}</a>
                  </li>
                </ul>
              </article>
            </div>
          </div>

          <section
            v-for="subsection in section.subsections"
            :key="subsection.slug"
            class="catalog-subsection"
          >
            <header class="catalog-subsection__heading">
              <p class="catalog-subsection__label">小分類</p>
              <div class="catalog-subsection__body">
                <h3>{{ subsection.title }}</h3>
                <p class="catalog-heading__meta">{{ subsection.projects.length }} 件の作品</p>
              </div>
            </header>

            <div class="work-grid">
              <article
                v-for="project in subsection.projects"
                :key="project.routeId"
                class="work-card"
              >
                <h4 class="work-card__title">
                  <a :href="getProjectDetailPath(project.routeId)">{{ project.title }}</a>
                </h4>
                <p class="work-card__summary">{{ project.summary }}</p>

                <ul
                  v-if="project.links.length > 0"
                  class="work-card__links"
                  aria-label="関連リンク"
                >
                  <li v-for="link in project.links" :key="`${project.routeId}-${link.url}`">
                    <a :href="link.url">{{ getUiLinkLabel(link) }}</a>
                  </li>
                </ul>
              </article>
            </div>
          </section>
        </section>
      </section>
    </template>

    <template v-else-if="route.type === 'detail'">
      <section class="page-hero page-hero--detail">
        <p class="detail-breadcrumbs">
          <a href="/">作品一覧</a>
          <template v-if="currentDetailProject">
            <span aria-hidden="true">／</span>
            <span>{{ currentDetailProject.section.title }}</span>
            <template v-if="currentDetailProject.subsection">
              <span aria-hidden="true">／</span>
              <span>{{ currentDetailProject.subsection.title }}</span>
            </template>
          </template>
        </p>
        <p class="section-kicker">作品詳細</p>
        <h1>{{ route.detailPage.title }}</h1>
        <p class="description">{{ route.detailPage.summary }}</p>
      </section>

      <section class="detail-layout" aria-label="作品詳細ページ">
        <div class="detail-panel-grid">
          <section class="detail-panel" aria-labelledby="detail-root-header">
            <div class="detail-panel__header">
              <p class="detail-panel__label">ルート README 由来</p>
              <h2 id="detail-root-header">見出しとリンク</h2>
            </div>

            <dl class="detail-facts">
              <div>
                <dt>分野</dt>
                <dd>{{ currentDetailProject?.section.title ?? "-" }}</dd>
              </div>
              <div>
                <dt>小分類</dt>
                <dd>{{ currentDetailProject?.subsection?.title ?? "なし" }}</dd>
              </div>
              <div>
                <dt>本文ソース</dt>
                <dd>{{ getSourceLabel(route.detailPage.source) }}</dd>
              </div>
            </dl>

            <ul v-if="detailHeaderLinks.length > 0" class="detail-links" aria-label="作品リンク">
              <li v-for="link in detailHeaderLinks" :key="link.url">
                <a :href="link.url">{{ getUiLinkLabel(link) }}</a>
              </li>
            </ul>
          </section>

          <section class="detail-panel" aria-labelledby="detail-root-media">
            <div class="detail-panel__header">
              <p class="detail-panel__label">ルート README 由来</p>
              <h2 id="detail-root-media">メディア</h2>
            </div>

            <div v-if="detailHeaderMedia.length > 0" class="detail-gallery">
              <PortfolioImage
                v-for="(media, index) in detailHeaderMedia"
                :key="`${media.url}-${index}`"
                class="detail-gallery__item"
                :src="media.url"
                :alt="media.alt || route.detailPage.title"
                :href="media.linkUrl"
              />
            </div>
            <p v-else class="empty-state">表示できるメディアはありません。</p>
          </section>
        </div>

        <section class="detail-body-section" aria-labelledby="detail-readme-body-heading">
          <div class="detail-body-section__header">
            <div>
              <p class="section-kicker">README 本文</p>
              <h2 id="detail-readme-body-heading">
                {{
                  route.detailPage.source === "project-readme"
                    ? "プロジェクト README の本文"
                    : "ルート README 由来の代替本文"
                }}
              </h2>
            </div>
            <p class="detail-body-section__note">{{ getSourceLabel(route.detailPage.source) }}</p>
          </div>

          <ReadmeBody v-if="detailBodyBlocks.length > 0" :blocks="detailBodyBlocks" />
          <p v-else class="empty-state">表示できる本文はありません。</p>
        </section>
      </section>
    </template>

    <template v-else>
      <section class="page-hero page-hero--detail">
        <p class="section-kicker">未検出</p>
        <h1>ページが見つかりません。</h1>
        <p class="description">{{ route.path }}</p>
        <p class="detail-breadcrumbs"><a href="/">作品一覧へ戻る</a></p>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, type PropType, type VNodeChild } from "vue";

import {
  parseReadmeBody,
  type ReadmeBodyBlock,
  type ReadmeInlineNode,
} from "./portfolio/readmeBody";
import { getProjectDetailPath } from "./portfolio/routes";
import type { PortfolioMatchedRoute, PortfolioSiteData } from "./portfolio/site";
import type {
  HomepageProject,
  HomepageSection,
  PortfolioLink,
  PortfolioMedia,
  ProjectDetailPage,
} from "./portfolio/types";

const props = defineProps<{
  siteData: PortfolioSiteData;
  route: PortfolioMatchedRoute;
}>();

function getUiLinkLabel(link: PortfolioLink): string {
  switch (link.type) {
    case "demo":
      return "デモ";
    case "learn-more":
      return "詳細";
    case "video":
      return "映像";
    case "marketplace":
      return "配布";
    default:
      return link.normalizedLabel;
  }
}

function getSourceLabel(source: ProjectDetailPage["source"]): string {
  return source === "project-readme" ? "プロジェクト README" : "ルート README 代替";
}

function getSectionProjectCount(section: HomepageSection): number {
  return (
    section.projects.length +
    section.subsections.reduce((count, item) => count + item.projects.length, 0)
  );
}

function renderInlineNodes(nodes: ReadmeInlineNode[]): VNodeChild[] {
  return nodes.map((node, index) => renderInlineNode(node, index));
}

function renderInlineNode(node: ReadmeInlineNode, key: number): VNodeChild {
  switch (node.type) {
    case "text":
      return node.value;
    case "link":
      return h("a", { key, href: node.url }, renderInlineNodes(node.children));
    case "strong":
      return h("strong", { key }, renderInlineNodes(node.children));
    case "emphasis":
      return h("em", { key }, renderInlineNodes(node.children));
    case "code":
      return h("code", { key }, node.value);
  }
}

const PortfolioImage = defineComponent({
  name: "PortfolioImage",
  props: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: "",
    },
    href: {
      type: String,
      default: undefined,
    },
    caption: {
      type: String,
      default: "",
    },
  },
  setup(componentProps) {
    const hasError = ref(componentProps.src.trim().length === 0);

    return () => {
      const mediaNode = hasError.value
        ? h(
            "div",
            {
              class: "portfolio-image__fallback",
              role: "img",
              "aria-label": componentProps.alt || "画像を表示できません",
            },
            [
              h("span", { class: "portfolio-image__fallback-label" }, "画像を表示できません"),
              componentProps.alt
                ? h("span", { class: "portfolio-image__fallback-alt" }, componentProps.alt)
                : null,
            ],
          )
        : h("img", {
            class: "portfolio-image__asset",
            src: componentProps.src,
            alt: componentProps.alt,
            loading: "lazy",
            onError: () => {
              hasError.value = true;
            },
          });

      const framedMedia = componentProps.href
        ? h(
            "a",
            {
              href: componentProps.href,
              class: "portfolio-image__link",
            },
            mediaNode,
          )
        : mediaNode;

      return h("figure", { class: "portfolio-image" }, [
        h("div", { class: "portfolio-image__frame" }, framedMedia),
        componentProps.caption
          ? h("figcaption", { class: "portfolio-image__caption" }, componentProps.caption)
          : null,
      ]);
    };
  },
});

function renderBlock(block: ReadmeBodyBlock, index: number): VNodeChild {
  switch (block.type) {
    case "paragraph":
      return h(
        "p",
        { key: index, class: "detail-body-paragraph" },
        renderInlineNodes(block.content),
      );
    case "heading": {
      const tagName = `h${block.level}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return h(
        tagName,
        { key: index, class: ["detail-body-heading", `detail-body-heading-${block.level}`] },
        renderInlineNodes(block.content),
      );
    }
    case "list": {
      const tagName = block.ordered ? "ol" : "ul";
      return h(
        tagName,
        { key: index, class: "detail-body-list" },
        block.items.map((item, itemIndex) =>
          h("li", { key: `${index}-${itemIndex}` }, renderInlineNodes(item)),
        ),
      );
    }
    case "image":
      return h(PortfolioImage, {
        key: index,
        class: [
          "detail-body-media",
          block.align === "center" ? "detail-body-media--centered" : "detail-body-media--start",
        ],
        src: block.src,
        alt: block.alt,
        href: block.linkUrl,
      });
    case "code":
      return h("pre", { key: index, class: "detail-body-code" }, [
        h(
          "code",
          { class: block.language ? `language-${block.language}` : undefined },
          block.value,
        ),
      ]);
    case "thematic-break":
      return h("hr", { key: index, class: "detail-body-divider" });
  }
}

const ReadmeBody = defineComponent({
  name: "ReadmeBody",
  props: {
    blocks: {
      type: Array as PropType<ReadmeBodyBlock[]>,
      required: true,
    },
  },
  setup(componentProps) {
    return () =>
      h(
        "article",
        { class: "detail-body" },
        componentProps.blocks.map((block, index) => renderBlock(block, index)),
      );
  },
});

const currentPageLabel = computed(() => {
  switch (props.route.type) {
    case "home":
      return "ホーム";
    case "detail":
      return "作品詳細";
    case "not-found":
      return "未検出";
  }
});

const currentDetailProject = computed<HomepageProject | null>(() => {
  if (props.route.type !== "detail") {
    return null;
  }

  return (
    props.siteData.homepage.projects.find((project) => project.routeId === props.route.routeId) ??
    null
  );
});

const totalProjectCount = computed(() => props.siteData.homepage.projects.length);

const detailHeaderLinks = computed<PortfolioLink[]>(() => {
  if (props.route.type !== "detail") {
    return [];
  }

  if ((currentDetailProject.value?.links.length ?? 0) > 0) {
    return currentDetailProject.value?.links ?? [];
  }

  return props.route.detailPage.primaryLink ? [props.route.detailPage.primaryLink] : [];
});

const detailHeaderMedia = computed<PortfolioMedia[]>(() => {
  if (props.route.type !== "detail") {
    return [];
  }

  if ((currentDetailProject.value?.media.length ?? 0) > 0) {
    return currentDetailProject.value?.media ?? [];
  }

  return props.route.detailPage.media;
});

const detailBodyBlocks = computed(() =>
  props.route.type === "detail" ? parseReadmeBody(props.route.detailPage.contentMarkdown) : [],
);
</script>
