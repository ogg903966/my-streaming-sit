export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "API ကို မတပ်ဆင်ရသေးပါ။" },
        { status: 501 }
      );
    }

    return env.ASSETS.fetch(request);
  },
};
