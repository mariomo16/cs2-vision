import { applyCors } from "../_lib/cors.js";

function buildPlayersUrl(query) {
  const { nickname, game, game_player_id } = query;

  const hasNickname = !!nickname;
  const hasGameAndId = !!game && !!game_player_id;

  if (!hasNickname && !hasGameAndId) {
    return {
      error: "Provide 'nickname' alone, or both 'game' and 'game_player_id'",
      status: 400,
    };
  }
  if (hasNickname && hasGameAndId) {
    return {
      error: "'nickname' cannot be combined with 'game' or 'game_player_id'",
      status: 400,
    };
  }

  if (hasNickname) {
    if (game || game_player_id) {
      return {
        error: "'nickname' cannot be combined with 'game' or 'game_player_id'",
        status: 400,
      };
    }
    return {
      url: `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`,
    };
  }

  const params = new URLSearchParams({ game, game_player_id });
  return {
    url: `https://open.faceit.com/data/v4/players?${params.toString()}`,
  };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, error, status } = buildPlayersUrl(req.query);
  if (error) {
    return res.status(status).json({ error });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.FACEIT_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Faceit error", response.status, errorBody);
      return res.status(response.status).json({
        error: "Faceit API request failed",
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (_err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
