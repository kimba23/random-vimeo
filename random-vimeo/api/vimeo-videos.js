// Serverless function at /api/vimeo-videos
module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  if (process.env.ALLOW_ORIGIN && origin.includes(process.env.ALLOW_ORIGIN)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  const album = (req.query && req.query.album) || process.env.VIMEO_ALBUM_ID || null;
  const userId = process.env.VIMEO_USER_ID;
  const token = process.env.VIMEO_TOKEN;

  if (!token || (!album && !userId)) {
    return res.status(500).json({ error: "Missing VIMEO_TOKEN and VIMEO_USER_ID or VIMEO_ALBUM_ID." });
  }

  const base = "https://api.vimeo.com";
  const url = album
    ? `${base}/albums/${album}/videos?per_page=100&fields=uri,name,pictures.sizes,duration,privacy`
    : `${base}/users/${userId}/videos?per_page=100&fields=uri,name,pictures.sizes,duration,privacy`;

  const r = await fetch(url, { headers: { Authorization: `bearer ${token}` } });
  if (!r.ok) {
    const txt = await r.text();
    return res.status(r.status).json({ error: "Vimeo API error", detail: txt });
  }

  const data = await r.json();
  const items = (data?.data || []).map(v => {
    const id = (v?.uri || "").split("/").pop();
    const pics = v?.pictures?.sizes || [];
    const thumb = pics.length ? pics[pics.length - 1].link : null;
    return { id, name: v?.name || "", duration: v?.duration || 0, thumbnail: thumb, privacy: v?.privacy || {} };
  });

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.status(200).json({ items });
};
