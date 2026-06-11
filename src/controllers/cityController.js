import City from "../models/City.js";
import * as cheerio from "cheerio";
import axios from "axios";
import cloudinary from "../config/cloudinary.js";

import {
  slugify,
  generateCitySchema,
} from "../utils/seoHelper.js";

import {
  generateFileName,
} from "../utils/generateFileName.js";

/* =========================================
   BASE URL
========================================= */

const BASE_URL =
  process.env.BASE_URL ||
  "https://girlswithwine.com";

/* =========================================
   PROCESS DESCRIPTION IMAGES
========================================= */

export const processDescriptionImages =
  async (description) => {

    if (!description) return "";

    try {

      const $ =
        cheerio.load(description);

      const tasks = [];

      $("img").each(
        (_, img) => {

          const src =
            $(img).attr("src");

          if (!src) return;

          // already cloudinary
          if (
            src.includes(
              "res.cloudinary.com"
            )
          ) {
            return;
          }

          tasks.push(

            axios({
              url: src,
              method: "GET",
              responseType:
                "arraybuffer",
              timeout: 15000,
            })

              .then(
                async (
                  response
                ) => {

                  const base64 =
                    `data:image/png;base64,${Buffer.from(
                      response.data
                    ).toString(
                      "base64"
                    )}`;

                  const uploaded =
                    await cloudinary.uploader.upload(
                      base64,
                      {
                        folder:
                          "description",
                      }
                    );

                  $(img).attr(
                    "src",
                    uploaded.secure_url
                  );
                }
              )

              .catch(
                (error) => {

                  console.log(
                    "Description Image Error:",
                    error.message
                  );
                }
              )
          );
        }
      );

      await Promise.all(
        tasks
      );

      return $.html();

    } catch (error) {

      console.error(
        "Description image error:",
        error
      );

      return description;
    }
  };

/* =========================================
   CREATE CITY
========================================= */

export const createCity =
  async (req, res) => {

    try {

      const {
        mainCity,
        permalink,
        heading,
        subDescription,
        description,
        seoTitle,
        seoDescription,
        seoKeywords,
        ogTitle,
        ogDescription,
        twitterTitle,
        twitterDescription,
        facebookTitle,
        facebookDescription,
        imageAlt,
      } = req.body;

      if (
        !mainCity ||
        !permalink
      ) {

        return res.status(
          400
        ).json({
          success: false,
          message:
            "City name & permalink required",
        });
      }

      /* =========================================
         SLUG
      ========================================= */

      const normalizedCity =
        mainCity
          .trim()
          .toLowerCase();

      const cleanCity =
        slugify(
          normalizedCity
        );

      const cleanPermalink =
        slugify(
          permalink.trim()
        );

      const finalSlug =
        `${cleanPermalink}-${cleanCity}`.toLowerCase();

      /* =========================================
         CHECK EXISTING
      ========================================= */

      const exists =
        await City.findOne({
          slug: finalSlug,
        });

      if (exists) {

        return res.status(
          400
        ).json({
          success: false,
          message:
            "Page already exists",
        });
      }

      /* =========================================
         IMAGE ALT
      ========================================= */

      const finalImageAlt =
        imageAlt ||
        `${normalizedCity} escort service`;

      /* =========================================
         CLOUDINARY IMAGE UPLOAD
      ========================================= */

      let imageUrl = "";

      if (
        req.files &&
        req.files.image
      ) {

        const file =
          req.files.image;

        const seoFileName =
          `${generateFileName(
            mainCity ||
            heading ||
            "city"
          )}-${Date.now()}`;

        const uploadedImage =
          await cloudinary.uploader.upload(
            file.tempFilePath,
            {
              folder:
                "cities",

              public_id:
                seoFileName,

              overwrite:
                true,

              resource_type:
                "image",
            }
          );

        imageUrl =
          uploadedImage.secure_url;
      }

      /* =========================================
         DESCRIPTION IMAGES
      ========================================= */

      const cleanDescription =
        await processDescriptionImages(
          description
        );

      /* =========================================
         CANONICAL URL
      ========================================= */

      const canonicalUrl =
        `${BASE_URL}/${finalSlug}`;

      /* =========================================
         CREATE CITY
      ========================================= */

      const city =
        await City.create({

          mainCity:
            normalizedCity,

          permalink:
            cleanPermalink,

          slug:
            finalSlug,

          heading,

          subDescription,

          imageUrl,

          imageAlt:
            finalImageAlt,

          description:
            cleanDescription,

          seoTitle,

          seoDescription,

          seoKeywords,

          ogTitle,

          ogDescription,

          twitterTitle,

          twitterDescription,

          facebookTitle,

          facebookDescription,

          canonicalUrl,
        });

      res.status(201).json({
        success: true,
        message:
          "City created successfully",
        data: city,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/* =========================================
   GET CITY PAGE
========================================= */

export const getCityPage =
  async (req, res) => {

    try {

      const {
        citySlug,
      } = req.params;

      const city =
        await City.findOne({
          slug: citySlug,
          status: "Active",
        })

          .populate(
            "subCities",
            "name slug status "
          )

          .lean();

      if (!city) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      const schema =
        generateCitySchema(
          city
        );

      res.json({

        city,

        seo: {

          title:
            city.seoTitle ||
            city.heading,

          description:
            city.seoDescription,

          seoKeywords:
            city.seoKeywords,

          canonical:
            `${BASE_URL}/${city.slug}`,
        },

        schema,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/* =========================================
   GET ALL CITIES
========================================= */

/* =========================================
   GET ALL CITIES
========================================= */

export const getCities =
  async (req, res) => {

    try {

      const cities =
        await City.find(
          {},
          {
            /* =========================================
               REDIRECT
            ========================================= */

            slug: 1,

            /* =========================================
               UI DATA
            ========================================= */

            mainCity: 1,

            heading: 1,

            imageUrl: 1,

            /* =========================================
               OPTIONAL
            ========================================= */

            status: 1,

            createdAt: 1,
          }
        )
          .lean()
          .sort({
            createdAt: -1,
          });

      res.json({
        success: true,
        data: cities,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };
/* =========================================
   UPDATE CITY
========================================= */

export const updateCity =
  async (req, res) => {

    try {

      console.log(
        "BODY =>",
        req.body
      );

      console.log(
        "FILES =>",
        req.files
      );

      const updates = {
        ...req.body,
      };

      /* =========================================
         FIND CITY
      ========================================= */

      const existing =
        await City.findById(
          req.params.id
        );

      if (!existing) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      /* =========================================
         MAIN CITY
      ========================================= */

      if (
        updates.mainCity
      ) {

        updates.mainCity =
          updates.mainCity
            .trim()
            .toLowerCase();
      }

      /* =========================================
         SLUG UPDATE
      ========================================= */

      if (
        updates.permalink ||
        updates.mainCity
      ) {

        const cleanCity =
          slugify(
            updates.mainCity ||
            existing.mainCity
          );

        const cleanPermalink =
          slugify(
            (
              updates.permalink ||
              existing.permalink
            ).trim()
          );

        const finalSlug =
          `${cleanPermalink}-${cleanCity}`.toLowerCase();

        const exists =
          await City.findOne({
            slug:
              finalSlug,
            _id: {
              $ne:
                req.params.id,
            },
          });

        if (exists) {

          return res.status(
            400
          ).json({
            success:
              false,
            message:
              "Page already exists",
          });
        }

        updates.slug =
          finalSlug;

        updates.permalink =
          cleanPermalink;

        updates.canonicalUrl =
          `${BASE_URL}/${finalSlug}`;
      }

      /* =========================================
         DESCRIPTION IMAGES
      ========================================= */

      if (
        updates.description
      ) {

        updates.description =
          await processDescriptionImages(
            updates.description
          );
      }

      /* =========================================
         IMAGE UPDATE
      ========================================= */

      if (
        req.files &&
        req.files.image
      ) {

        const file =
          req.files.image;

        const seoFileName =
          `${generateFileName(
            updates.mainCity ||
            existing.mainCity ||
            "city"
          )}-${Date.now()}`;

        const uploadedImage =
          await cloudinary.uploader.upload(
            file.tempFilePath,
            {
              folder:
                "cities",

              public_id:
                seoFileName,

              overwrite:
                true,

              resource_type:
                "image",
            }
          );

        updates.imageUrl =
          uploadedImage.secure_url;
      }

      /* =========================================
         UPDATE DATABASE
      ========================================= */

      const updated =
        await City.findByIdAndUpdate(
          req.params.id,
          updates,
          {
            new: true,
            runValidators:
              true,
          }
        );

      res.status(200).json({
        success: true,
        message:
          "City updated successfully",
        data: updated,
      });

    } catch (error) {

      console.log(
        "UPDATE CITY ERROR =>",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Internal Server Error",
      });
    }
  };

/* =========================================
   DELETE CITY
========================================= */

export const deleteCity =
  async (req, res) => {

    try {

      const deleted =
        await City.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      res.json({
        success: true,
        message:
          "City deleted successfully",
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/* =========================================
   UPDATE CITY IMAGE
========================================= */

export const updateCityImage =
  async (req, res) => {

    try {

      if (
        !req.files ||
        !req.files.image
      ) {

        return res.status(
          400
        ).json({
          success: false,
          message:
            "Image required",
        });
      }

      const city =
        await City.findById(
          req.params.id
        );

      if (!city) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      const file =
        req.files.image;

      const seoFileName =
        `${generateFileName(
          city.mainCity ||
          "city"
        )}-${Date.now()}`;

      const uploadedImage =
        await cloudinary.uploader.upload(
          file.tempFilePath,
          {
            folder:
              "cities",

            public_id:
              seoFileName,

            overwrite:
              true,

            resource_type:
              "image",
          }
        );

      const updated =
        await City.findByIdAndUpdate(
          req.params.id,
          {
            imageUrl:
              uploadedImage.secure_url,
          },
          {
            new: true,
          }
        );

      res.json({
        success: true,
        message:
          "Image updated successfully",
        data: updated,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/* =========================================
   TOGGLE STATUS
========================================= */

export const toggleCityStatus =
  async (req, res) => {

    try {

      const city =
        await City.findById(
          req.params.id
        );

      if (!city) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      city.status =
        city.status ===
        "Active"
          ? "Inactive"
          : "Active";

      await city.save();

      res.json({
        success: true,
        message:
          "City status changed",
        status:
          city.status,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

/* =========================================
   GET CITY BY ID
========================================= */

export const getCityById =
  async (req, res) => {

    try {

      const city =
        await City.findById(
          req.params.id
        ).populate(
          "subCities",
          "name slug"
        );

      if (!city) {

        return res.status(
          404
        ).json({
          success: false,
          message:
            "City not found",
        });
      }

      res.json(city);

    } catch (error) {

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };