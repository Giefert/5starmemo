-- Migration: Remove unused image focus point columns
-- Date: 2025-09-02
-- Description: Remove image_focus_point_x and image_focus_point_y columns from cards table

-- Remove the focus point columns
ALTER TABLE cards DROP COLUMN IF EXISTS image_focus_point_x;
ALTER TABLE cards DROP COLUMN IF EXISTS image_focus_point_y;