-- Adds the Cloudinary public_id, needed to delete assets from storage
-- when an image is removed from a listing.
ALTER TABLE "Image" ADD COLUMN "publicId" TEXT;
