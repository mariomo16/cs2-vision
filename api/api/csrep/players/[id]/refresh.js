import { applyCors } from "../../../_lib/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) {
    return res
      .status(400)
      .json({ error: "Missing required path parameter: id" });
  }

  try {
    const response = await fetch(
      `https://csrep.gg/api/players/${encodeURIComponent(id)}/refresh`,
      {
        method: "POST",
        headers: {
          "X-API-Key": process.env.CSREP_API_KEY,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("CSREP error", response.status, errorBody);
      return res.status(response.status).json({
        error: "CSREP API request failed",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (_err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
