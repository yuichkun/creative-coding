import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { buildPortfolioSiteData, matchPortfolioRoute } from "./portfolio/site";

const siteData = await buildPortfolioSiteData();
const route = matchPortfolioRoute(window.location.pathname, siteData);

createApp(App, { siteData, route }).mount("#app");
