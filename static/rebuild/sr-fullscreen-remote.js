const ROUTES = {
  diary: "/static/local-diary.html",
  studio: "/static/local-studio.html",
  profile: "/static/local-profile.html",
  faq: "/static/local-faq.html",
  settings: "/static/local-settings.html",
  map: "/static/local-map.html",
  catalog: "/static/custom-order.html"
};

function openRoute(route) {
  const container = document.getElementById("remoteContent");

  if (!container) return;

  if (route === "aria") {
    container.innerHTML = `
      <div style="padding:40px">
        <h1>ARIA Assistant</h1>
        <p>Main AI for hair guidance, map logic, and account flow.</p>
      </div>
    `;
    return;
  }

  if (route === "jake") {
    container.innerHTML = `
      <div style="padding:40px">
        <h1>Jake Assistant</h1>
        <p>Studio execution AI: exports, FX, alignment.</p>
      </div>
    `;
    return;
  }

  const src = ROUTES[route];

  if (!src) {
    container.innerHTML = `<h2>Route not found</h2>`;
    return;
  }

  container.innerHTML = `
    <iframe class="remoteFrame" src="${src}"></iframe>
  `;
}
