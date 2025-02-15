/*
  # Add banner image to members table

  1. Changes
    - Add banner_image_url column to members table
    - Set default banner image URL
*/

-- Add banner_image_url column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS banner_image_url text
DEFAULT 'https://images.unsplash.com/photo-1579547944212-c4f4961a8dd8?auto=format&fit=crop&q=80&w=1000';