<template>
  <main class="app-shell">
    <header class="site-chrome">
      <a href="/" class="site-brand">
        <span class="site-brand__kicker">Portfolio</span>
        <span class="site-brand__title">Code + Art</span>
      </a>

      <nav class="site-nav" aria-label="Primary navigation">
        <a href="/">Home</a>
        <span class="site-nav__separator" aria-hidden="true">／</span>
        <span class="site-nav__current">{{ currentPageLabel }}</span>
      </nav>
    </header>

    <template v-if="route.type === 'home'">
      <article
        class="detail-body detail-body--page readme-document"
        aria-label="Repository README"
        v-html="siteData.homepage.documentHtml"
      />
    </template>

    <template v-else-if="route.type === 'detail'">
      <section class="detail-page" aria-label="Project page">
        <nav class="detail-breadcrumbs" aria-label="Project location">
          <a href="/">README</a>
          <template v-if="currentDetailProject">
            <span aria-hidden="true">／</span>
            <span>{{ currentDetailProject.section.title }}</span>
            <template v-if="currentDetailProject.subsection">
              <span aria-hidden="true">／</span>
              <span>{{ currentDetailProject.subsection.title }}</span>
            </template>
          </template>
        </nav>

        <article
          v-if="route.detailPage.contentHtml"
          class="detail-body detail-body--page"
          v-html="route.detailPage.contentHtml"
        />
        <p v-else class="empty-state">There is no project write-up to show yet.</p>
      </section>
    </template>

    <template v-else>
      <section class="page-hero page-hero--detail">
        <p class="section-kicker">Not found</p>
        <h1>Page not found.</h1>
        <p class="description">{{ route.path }}</p>
        <p class="detail-breadcrumbs"><a href="/">Back to projects</a></p>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { PortfolioMatchedRoute, PortfolioSiteData } from "./portfolio/site";
import type { HomepageProject } from "./portfolio/types";

const props = defineProps<{
  siteData: PortfolioSiteData;
  route: PortfolioMatchedRoute;
}>();

const currentPageLabel = computed(() => {
  switch (props.route.type) {
    case "home":
      return props.siteData.homepage.documentTitle;
    case "detail":
      return props.route.detailPage.title;
    case "not-found":
      return "Not found";
  }
});

const currentDetailProject = computed<HomepageProject | null>(() => {
  if (props.route.type !== "detail") {
    return null;
  }

  const routeId = props.route.routeId;

  return (
    props.siteData.homepage.projects.find((project) => project.routeId === routeId) ?? null
  );
});

</script>
