
function json(data, status = 200) {
  return Response.json(data, { status });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (!env.DB || !env.CREATOR_HUB_PASSWORD) {
      return json({ error: "Database or password is not configured." }, 500);
    }

    if (request.headers.get("x-creator-password") !== env.CREATOR_HUB_PASSWORD) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      const owner = "owner";

      if (url.pathname === "/api/videos" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, title, platform, views, url, created_at FROM creator_videos WHERE owner_id = ? ORDER BY id DESC"
        ).bind(owner).all();

        return json({ videos: result.results });
      }

      if (url.pathname === "/api/videos" && request.method === "POST") {
        const body = await request.json();

        if (typeof body.title !== "string" || !body.title.trim() ||
            typeof body.platform !== "string") {
          return json({ error: "Title and platform are required." }, 400);
        }

        const views = Number(body.views ?? 0);

        if (!Number.isSafeInteger(views) || views < 0) {
          return json({ error: "Views must be a non-negative integer." }, 400);
        }

        const result = await env.DB.prepare(
          "INSERT INTO creator_videos (owner_id, title, platform, views, url) VALUES (?, ?, ?, ?, ?)"
        ).bind(
          owner,
          body.title.trim().slice(0, 200),
          body.platform.slice(0, 50),
          views,
          typeof body.url === "string" ? body.url.slice(0, 2000) : ""
        ).run();

        return json({ success: true, id: result.meta.last_row_id }, 201);
      }

      if (url.pathname.startsWith("/api/videos/") && request.method === "DELETE") {
        const id = Number(url.pathname.split("/").pop());

        if (!Number.isSafeInteger(id) || id < 1) {
          return json({ error: "Invalid video ID." }, 400);
        }

        const result = await env.DB.prepare(
          "DELETE FROM creator_videos WHERE id = ? AND owner_id = ?"
        ).bind(id, owner).run();

        return json({ success: true, deleted: result.meta.changes });
      }

      if (url.pathname === "/api/income" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, source, amount, income_date, note, created_at FROM creator_income WHERE owner_id = ? ORDER BY id DESC"
        ).bind(owner).all();

        return json({ income: result.results });
      }

      if (url.pathname === "/api/income" && request.method === "POST") {
        const body = await request.json();

        if (typeof body.source !== "string" || !body.source.trim()) {
          return json({ error: "Income source is required." }, 400);
        }

        const amount = Number(body.amount);
        const date = body.income_date;

        if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
          return json({ error: "Invalid income amount." }, 400);
        }

        if (typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(date))) {
          return json({ error: "Date must use YYYY-MM-DD format." }, 400);
        }

        const result = await env.DB.prepare(
          "INSERT INTO creator_income (owner_id, source, amount, income_date, note) VALUES (?, ?, ?, ?, ?)"
        ).bind(
          owner,
          body.source.trim().slice(0, 200),
          amount,
          date,
          typeof body.note === "string" ? body.note.slice(0, 2000) : ""
        ).run();

        return json({ success: true, id: result.meta.last_row_id }, 201);
      }

      if (url.pathname.startsWith("/api/income/") && request.method === "DELETE") {
        const id = Number(url.pathname.split("/").pop());

        if (!Number.isSafeInteger(id) || id < 1) {
          return json({ error: "Invalid income ID." }, 400);
        }

        const result = await env.DB.prepare(
          "DELETE FROM creator_income WHERE id = ? AND owner_id = ?"
        ).bind(id, owner).run();

        return json({ success: true, deleted: result.meta.changes });
      }

      return json({ error: "API route not found." }, 404);
    } catch (error) {
      console.error("API error:", error);
      return json({ error: "Request failed. Check Worker logs." }, 500);
    }
  }
};
