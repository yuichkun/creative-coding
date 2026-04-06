<template>
  <main class="app-shell">
    <header class="site-chrome">
      <a href="/" class="site-brand">Yuichi Yogo</a>

      <nav class="site-nav" aria-label="Primary navigation">
        <template v-if="route.type === 'home'">
          <span class="site-nav__current">Portfolio</span>
        </template>
        <template v-else-if="route.type === 'detail'">
          <a href="/">Portfolio</a>
          <template v-if="currentDetailProject">
            <span class="site-nav__separator" aria-hidden="true">／</span>
            <a :href="'/#' + currentDetailProject.section.slug">{{ currentDetailProject.section.title }}</a>
            <template v-if="currentDetailProject.subsection">
              <span class="site-nav__separator" aria-hidden="true">／</span>
              <span>{{ currentDetailProject.subsection.title }}</span>
            </template>
          </template>
        </template>
      </nav>
    </header>

    <template v-if="route.type === 'home'">
      <section class="hero">
        <h1 class="hero__title">{{ siteData.homepage.documentTitle }}</h1>
        <p class="hero__tagline">
          Creative coding projects by
          <a href="https://github.com/yuichkun">Yuichi Yogo</a>.
        </p>
      </section>

      <nav class="section-nav" aria-label="Content navigation">
        <a
          v-for="section in siteData.homepage.sections"
          :key="section.slug"
          :href="'#' + section.slug"
          class="section-nav__item"
          >{{ section.title }}</a
        >
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
