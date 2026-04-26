export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }

    if (url.pathname === "/wire") {
      return env.ASSETS.fetch(new Request(new URL("/wire-v2.html", url), request));
    }

    if (url.pathname === "/articles") {
      return env.ASSETS.fetch(new Request(new URL("/articles.html", url), request));
    }

    if (url.pathname === "/library") {
      return env.ASSETS.fetch(new Request(new URL("/library.html", url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
