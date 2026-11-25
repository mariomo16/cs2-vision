import { applyCors } from "../_lib/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { steam64_id } = req.query;
  if (!steam64_id) {
    return res
      .status(400)
      .json({ error: "Missing required query parameter: steam64_id" });
  }

  try {
    const response = await fetch(
      `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${encodeURIComponent(steam64_id)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEETIFY_API_KEY}`,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Leetify error", response.status, errorBody);
      return res.status(response.status).json({
        error: "Leetify API request failed",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (_err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
