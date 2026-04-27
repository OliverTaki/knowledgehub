function assetRequest(pathname, request) {
  const url = new URL(request.url);
  return new Request(new URL(pathname, url).toString(), { method: "GET" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return env.ASSETS.fetch(assetRequest("/index.html", request));
    }

    if (url.pathname === "/wire") {
      return env.ASSETS.fetch(assetRequest("/wire.html", request));
    }

    if (url.pathname === "/articles") {
      return env.ASSETS.fetch(assetRequest("/articles.html", request));
    }

    if (url.pathname === "/library") {
      return env.ASSETS.fetch(assetRequest("/library.html", request));
    }

    return env.ASSETS.fetch(request);
  }
};
