import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/mushroom-cultivation", "/signup", "/login"],
        disallow: [
          "/api/",
          "/*/setup",
          "/*/inventory",
          "/*/scan",
          "/*/tasks",
          "/*/settings",
        ],
      },
    ],
    sitemap: "https://lineage.farm/sitemap.xml",
  };
}
