(function () {
  const boot = window.__SLASH_MD__;
  if (!boot) {
    return;
  }
  const app = document.getElementById("app");
  if (!app) {
    return;
  }

  function join(base, rel) {
    const path = String(rel).replace(/^\/+/, "");
    if (!base || base === "/") {
      return "/" + path;
    }
    return base + path;
  }

  fetch(boot.manifestUrl)
    .then(function (res) {
      return res.json();
    })
    .then(function (manifest) {
      const page = (manifest.pages || []).find(function (item) {
        return item.path === boot.page;
      });
      const nav = (manifest.pages || [])
        .map(function (item) {
          return '<li><a href="' + join(manifest.basePath, item.route.replace(/^\//, "")) + '">' + item.title + "</a></li>";
        })
        .join("");
      const contentUrl = page ? join(manifest.basePath, page.content) : "";
      return fetch(contentUrl)
        .then(function (res) {
          return res.ok ? res.text() : Promise.resolve("");
        })
        .then(function (markdown) {
          app.innerHTML =
            '<aside><p>' +
            (manifest.name || "Docs") +
            '</p><ul>' +
            nav +
            "</ul></aside><main><pre>" +
            (markdown || "Page not found")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;") +
            "</pre></main>";
        });
    })
    .catch(function () {
      app.textContent = "Failed to load docs.";
    });
})();
