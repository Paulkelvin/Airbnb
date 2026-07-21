-- Free-text room/area grouping for the gallery's category tabs
-- (Bedroom, Bathroom, Kitchen, Living Area, Outdoor, Views/Exterior).
-- Nullable so existing images without a category keep working.
ALTER TABLE "Image" ADD COLUMN "category" TEXT;
