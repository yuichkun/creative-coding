<template>
  <main class="app-shell">
    <header class="site-chrome">
      <div class="site-brand">
        <a href="/" class="site-brand__name">Yuichi Yogo</a>
        <span class="site-brand__label">Creative Coding Portfolio</span>
      </div>

      <a href="https://github.com/yuichkun/creative-coding" class="site-github" aria-label="GitHub">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
    </header>

    <template v-if="route.type === 'home'">
      <nav class="section-nav" aria-label="Content navigation">
        <a
          v-for="section in siteData.homepage.sections"
          :key="section.slug"
          :href="'#' + section.slug"
          class="section-nav__pill"
        >{{ section.title }}</a>
      </nav>

      <section
        v-for="section in siteData.homepage.sections"
        :id="section.slug"
        :key="section.slug"
        class="section-group"
      >
        <h2 class="section-group__title">
          <a :href="'#' + section.slug">{{ section.title }}</a>
        </h2>

        <div v-if="directProjects(section).length" class="project-grid" :class="{ 'project-grid--sparse': directProjects(section).length <= 2 }">
          <article
            v-for="project in directProjects(section)"
            :key="project.routeId"
            class="project-card"
          >
            <a
              v-if="project.imageUrls.length"
              :href="project.detailPath"
              class="project-card__image-link"
            >
              <img
                :src="project.imageUrls[0]"
                :alt="project.title"
                class="project-card__image"
                loading="lazy"
              />
            </a>
            <div class="project-card__body">
              <h4 class="project-card__title">
                <a :href="project.detailPath">{{ project.title }}</a>
              </h4>
              <p v-if="project.summary" class="project-card__summary">{{ project.summary }}</p>
              <div v-if="project.actionLinks.length" class="project-card__links">
                <a
                  v-for="(link, i) in project.actionLinks"
                  :key="i"
                  :href="link.href || link.url"
                  class="link-pill"
                  :class="{ 'link-pill--primary': link.type === 'demo' }"
                  >{{ link.normalizedLabel }}</a
                >
              </div>
            </div>
          </article>
        </div>

        <template v-for="sub in section.subsections" :key="sub.slug">
          <h3 class="section-group__subtitle">{{ sub.title }}</h3>
          <div class="project-grid" :class="{ 'project-grid--sparse': sub.projects.length <= 2 }">
            <article
              v-for="project in sub.projects"
              :key="project.routeId"
              class="project-card"
            >
              <a
                v-if="project.imageUrls.length"
                :href="project.detailPath"
                class="project-card__image-link"
              >
                <img
                  :src="project.imageUrls[0]"
                  :alt="project.title"
                  class="project-card__image"
                  loading="lazy"
                />
              </a>
              <div class="project-card__body">
                <h4 class="project-card__title">
                  <a :href="project.detailPath">{{ project.title }}</a>
                </h4>
                <p v-if="project.summary" class="project-card__summary">{{ project.summary }}</p>
                <div v-if="project.actionLinks.length" class="project-card__links">
                  <a
                    v-for="(link, i) in project.actionLinks"
                    :key="i"
                    :href="link.href || link.url"
                    class="link-pill"
                    :class="{ 'link-pill--primary': link.type === 'demo' }"
                    >{{ link.normalizedLabel }}</a
                  >
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>
    </template>

    <template v-else-if="route.type === 'detail'">
      <nav class="detail-breadcrumbs" aria-label="Project location">
        <a href="/">Portfolio</a>
        <template v-if="currentDetailProject">
          <span class="detail-breadcrumbs__sep" aria-hidden="true">／</span>
          <a :href="'/#' + currentDetailProject.section.slug">{{ currentDetailProject.section.title }}</a>
          <template v-if="currentDetailProject.subsection">
            <span class="detail-breadcrumbs__sep" aria-hidden="true">／</span>
            <span>{{ currentDetailProject.subsection.title }}</span>
          </template>
        </template>
      </nav>

      <article
        v-if="route.detailPage.contentHtml"
        class="detail-body detail-content"
        v-html="route.detailPage.contentHtml"
      />
      <p v-else class="empty-state">There is no project write-up to show yet.</p>
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
import type { HomepageProject, HomepageSection } from "./portfolio/types";

const props = defineProps<{
  siteData: PortfolioSiteData;
  route: PortfolioMatchedRoute;
}>();

const currentDetailProject = computed<HomepageProject | null>(() => {
  if (props.route.type !== "detail") {
    return null;
  }

  const routeId = props.route.routeId;

  return (
    props.siteData.homepage.projects.find((project) => project.routeId === routeId) ?? null
  );
});

function directProjects(section: HomepageSection): HomepageProject[] {
  const subsectionRouteIds = new Set(
    section.subsections.flatMap((sub) => sub.projects.map((p) => p.routeId)),
  );

  return section.projects.filter((p) => !subsectionRouteIds.has(p.routeId));
}
</script>
