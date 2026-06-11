

import City from "../models/City.js";
import Girl from "../models/Girl.js";
import SubCity from "../models/SubCity.js";

/* =========================================================
   CONSTANTS
========================================================= */

const OWN_DOMAIN =
  "https://girlswithwine.com";

/* =========================================================
   XML ESCAPE
========================================================= */

const escapeXml = (
  unsafe = ""
) => {

  return String(unsafe)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&apos;"
    );
};

/* =========================================================
   IMAGE URL FIX
   ONLY FOR:
   - CITY
   - SUBCITY
   - PROFILE

   BLOG REMAINS ORIGINAL
========================================================= */

const getImageUrl = (
  url = ""
) => {

  if (!url) {
    return "";
  }

  /* =========================================
     NEXT IMAGE FIX
  ========================================= */

  if (
    url.includes(
      "/_next/image"
    )
  ) {

    try {

      const parsed =
        new URL(url);

      const actualUrl =
        parsed.searchParams.get(
          "url"
        );

      url =
        decodeURIComponent(
          actualUrl || ""
        );

    } catch {

      return "";
    }
  }

  /* =========================================
     CLOUDINARY -> OWN DOMAIN
  ========================================= */

  if (
    url.includes(
      "res.cloudinary.com"
    )
  ) {

    try {

      const splitPart =
        url.split(
          "/upload/"
        )[1];

      if (!splitPart) {
        return "";
      }

      /* REMOVE CLOUDINARY VERSION */

      const cleanedPath =
        splitPart.replace(
          /^v\d+\//,
          ""
        );

      return `${OWN_DOMAIN}/uploads/${cleanedPath}`;

    } catch {

      return url;
    }
  }

  /* =========================================
     ALREADY FULL URL
  ========================================= */

  if (
    url.startsWith(
      "http"
    )
  ) {

    return url;
  }

  /* =========================================
     RELATIVE URL
  ========================================= */

  return `${OWN_DOMAIN}${url}`;
};

/* =========================================================
   CACHE HEADER
========================================================= */

const setCacheHeaders = (
  res
) => {

  res.setHeader(
    "Cache-Control",

    "public, s-maxage=86400, stale-while-revalidate"
  );
};

/* =========================================================
   MAIN SITEMAP INDEX
========================================================= */

export const generateSitemap =
  async (
    req,
    res
  ) => {

    try {

      let xml = `<?xml version="1.0" encoding="UTF-8"?>

<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <sitemap>
    <loc>${OWN_DOMAIN}/page-sitemap.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${OWN_DOMAIN}/city-sitemap.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${OWN_DOMAIN}/subcity-sitemap.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${OWN_DOMAIN}/profile-sitemap.xml</loc>
  </sitemap>

  <sitemap>
    <loc>${OWN_DOMAIN}/post-sitemap.xml</loc>
  </sitemap>

</sitemapindex>`;

      res.header(
        "Content-Type",
        "application/xml"
      );

      setCacheHeaders(
        res
      );

      return res
        .status(200)
        .send(xml);

    } catch (error) {

      console.log(
        "❌ Sitemap Error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Failed to generate sitemap",
      });
    }
  };

/* =========================================================
   PAGE SITEMAP
========================================================= */

export const generatePageSitemap =
  async (
    req,
    res
  ) => {

    try {

      const pages = [
        "",
        "about",
        "terms",
        "privacy",
        "contact",
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>`;

      pages.forEach(
        (page) => {

          xml += `
<url>

  <loc>${escapeXml(
            `${OWN_DOMAIN}/${page}`
          )}</loc>

  <lastmod>${new Date().toISOString()}</lastmod>

  <image:image>
    <image:loc>${OWN_DOMAIN}/images/girlswithwine.jpg</image:loc>
    <image:title>Girls With Wine</image:title>
  </image:image>

</url>`;
        }
      );

      xml += `
</urlset>`;

      res.header(
        "Content-Type",
        "application/xml"
      );

      setCacheHeaders(
        res
      );

      return res
        .status(200)
        .send(xml);

    } catch (error) {

      console.log(
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Page sitemap failed",
      });
    }
  };

/* =========================================================
   CITY SITEMAP
========================================================= */

/* =========================================================
   CITY SITEMAP
   ONLY ACTIVE CITIES
========================================================= */

export const generateCitySitemap = async (
  req,
  res
) => {

  try {

    const cities =
      await City.find({

        status: {
          $regex: /^active$/i,
        },

      })
        .lean();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>`;

    cities.forEach(
      (city) => {

        try {

          /* ==========================
             STATUS CHECK
          ========================== */

          if (
            city?.status?.toLowerCase() !==
            "active"
          ) {

            return;

          }

          /* ==========================
             INVALID SLUG CHECK
          ========================== */

          if (
            !city?.slug ||
            city.slug.includes(
              "undefined"
            ) ||
            city.slug.includes(
              "null"
            )
          ) {

            return;

          }

          const imageUrl =
            getImageUrl(
              city?.imageUrl
            );

          xml += `
<url>

  <loc>${escapeXml(
            `${OWN_DOMAIN}/${city.slug}`
          )}</loc>

  <lastmod>${
            city?.updatedAt
              ? new Date(
                  city.updatedAt
                ).toISOString()
              : ""
          }</lastmod>

  ${
            imageUrl
              ? `
  <image:image>

    <image:loc>${escapeXml(
                  imageUrl
                )}</image:loc>

    <image:title>${escapeXml(
                  city?.name ||
                  city?.mainCity ||
                  ""
                )}</image:title>

  </image:image>`
              : ""
          }

</url>`;

        } catch (
          innerError
        ) {

          console.log(
            "❌ CITY XML ERROR:",
            city?._id,
            innerError.message
          );

        }

      }
    );

    xml += `
</urlset>`;

    res.header(
      "Content-Type",
      "application/xml"
    );

    setCacheHeaders(
      res
    );

    return res
      .status(200)
      .send(xml);

  } catch (error) {

    console.log(
      "❌ CITY SITEMAP ERROR:"
    );

    console.log(
      error
    );

    return res
      .status(500)
      .json({

        success: false,

        message:
          "City sitemap failed",

        error:
          error.message,

      });

  }

};

/* =========================================================
   SUBCITY SITEMAP
========================================================= */

/* =========================================================
   SUBCITY SITEMAP
   ONLY ACTIVE SUBCITY + ACTIVE CITY
========================================================= */

export const generateSubCitySitemap = async (
  req,
  res
) => {

  try {

    const subCities =
      await SubCity.find({

        status: "Active",

      })
        .populate({

          path: "city",

          match: {
            status: "Active",
          },

          select:
            "mainCity slug status",

        })
        .lean();

    // Remove subcities whose city is inactive
    const activeSubCities =
      subCities.filter(
        (subCity) => subCity?.city
      );

    let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>`;

    activeSubCities.forEach(
      (subCity) => {

        try {

          /* ==========================
             INVALID SLUG CHECK
          ========================== */

          if (
            !subCity?.slug ||
            subCity.slug.includes(
              "undefined"
            ) ||
            subCity.slug.includes(
              "null"
            )
          ) {

            return;

          }

          /* ==========================
             CITY SLUG
          ========================== */

          const citySlug =
            subCity?.city?.mainCity
              ?.toLowerCase()
              ?.trim()
              ?.replace(
                /\s+/g,
                "-"
              );

          if (
            !citySlug
          ) {

            return;

          }

          /* ==========================
             URL
          ========================== */

          const loc =
            `${OWN_DOMAIN}/${citySlug}/${subCity.slug}`;

          const imageUrl =
            getImageUrl(
              subCity?.imageUrl
            );

          xml += `
<url>

  <loc>${escapeXml(
            loc
          )}</loc>

  <lastmod>${
            subCity?.updatedAt
              ? new Date(
                  subCity.updatedAt
                ).toISOString()
              : ""
          }</lastmod>

  ${
            imageUrl
              ? `
  <image:image>

    <image:loc>${escapeXml(
                  imageUrl
                )}</image:loc>

    <image:title>${escapeXml(
                  subCity?.name || ""
                )}</image:title>

  </image:image>`
              : ""
          }

</url>`;

        } catch (
          innerError
        ) {

          console.log(
            "❌ SUBCITY XML ERROR:",
            subCity?._id,
            innerError.message
          );

        }

      }
    );

    xml += `
</urlset>`;

    res.header(
      "Content-Type",
      "application/xml"
    );

    setCacheHeaders(
      res
    );

    return res
      .status(200)
      .send(xml);

  } catch (error) {

    console.log(
      "❌ SUBCITY SITEMAP ERROR:"
    );

    console.log(
      error
    );

    return res
      .status(500)
      .json({

        success: false,

        message:
          "SubCity sitemap failed",

        error:
          error.message,

      });

  }

};

/* =========================================================
   PROFILE SITEMAP
========================================================= */

/* =========================================================
   PROFILE SITEMAP
   ONLY ACTIVE PROFILES
========================================================= */

export const generateProfileSitemap = async (
  req,
  res
) => {

  try {

    const girls =
      await Girl.find({

        status: {
          $regex: /^active$/i,
        },

      })
        .select(
          "_id name permalink imageUrl updatedAt status"
        )
        .lean();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>`;

    girls.forEach(
      (girl) => {

        try {

          /* ==========================
             EXTRA STATUS CHECK
          ========================== */

          if (
            girl?.status
              ?.toLowerCase() !==
            "active"
          ) {

            return;

          }

          /* ==========================
             INVALID PERMALINK CHECK
          ========================== */

          if (
            !girl?.permalink ||
            girl.permalink.includes(
              "undefined"
            ) ||
            girl.permalink.includes(
              "null"
            )
          ) {

            return;

          }

          const loc =
            escapeXml(
              `${OWN_DOMAIN}/call-girls/${girl.permalink}`
            );

          const imageUrl =
            getImageUrl(
              girl?.imageUrl
            );

          const title =
            escapeXml(
              girl?.name ||
                "Escort Profile"
            );

          const lastmod =
            girl?.updatedAt
              ? new Date(
                  girl.updatedAt
                ).toISOString()
              : "";

          xml += `
<url>

  <loc>${loc}</loc>

  <lastmod>${lastmod}</lastmod>

  ${
    imageUrl
      ? `
  <image:image>

    <image:loc>${escapeXml(
      imageUrl
    )}</image:loc>

    <image:title>${title}</image:title>

  </image:image>`
      : ""
  }

</url>`;

        } catch (
          innerError
        ) {

          console.log(
            "❌ GIRL XML ERROR:",
            girl?._id,
            innerError.message
          );

        }

      }
    );

    xml += `
</urlset>`;

    res.setHeader(
      "Content-Type",
      "application/xml"
    );

    setCacheHeaders(
      res
    );

    return res
      .status(200)
      .send(xml);

  } catch (error) {

    console.log(
      "❌ PROFILE SITEMAP ERROR:"
    );

    console.log(
      error
    );

    return res
      .status(500)
      .json({

        success: false,

        message:
          error.message,

      });

  }

};

/* =========================================================
   WORDPRESS BLOG SITEMAP
   BLOG IMAGE URL REMAINS ORIGINAL
========================================================= */

export const generatePostSitemap = async (req, res) => {
  try {

   

    const response = await fetch(
      "https://blog.girlswithwine.com/wp-json/wp/v2/posts?_embed&per_page=100"
    );

   

    const blogs = await response.json();

    

    if (!Array.isArray(blogs)) {
      throw new Error("Invalid blog response");
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>`;

    blogs.forEach((blog, index) => {


      if (!blog?.slug) {

        console.log(
          "SKIPPED => SLUG MISSING"
        );

        return;
      }

      // ✅ Frontend URL
      const blogUrl =
        `https://girlswithwine.com/blog/${blog.slug}`;

      // ✅ Original WP Image
      const originalImage =
        blog?._embedded?.["wp:featuredmedia"]?.[0]
          ?.source_url || "";

      // ✅ Convert image domain
      let imageUrl = originalImage;

      if (
        imageUrl &&
        imageUrl.includes(
          "https://blog.girlswithwine.com"
        )
      ) {

        imageUrl = imageUrl.replace(
          "https://blog.girlswithwine.com",
          "https://girlswithwine.com"
        );
      }


      xml += `
<url>

  <loc>${escapeXml(
        blogUrl
      )}</loc>

  <lastmod>${
        blog?.modified
          ? new Date(
              blog.modified
            ).toISOString()
          : new Date().toISOString()
      }</lastmod>

  ${
        imageUrl
          ? `
  <image:image>
    <image:loc>${escapeXml(
              imageUrl
            )}</image:loc>

    <image:title>${escapeXml(
              blog?.title?.rendered || ""
            )}</image:title>

  </image:image>`
          : ""
      }

</url>`;
    });

    xml += `
</urlset>`;

   

    res.setHeader(
      "Content-Type",
      "application/xml"
    );

    setCacheHeaders(res);

    return res.status(200).send(xml);

  } catch (error) {

    console.log(
      "\n❌ POST SITEMAP ERROR ❌"
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Post sitemap failed",
      error: error.message,
    });
  }
};