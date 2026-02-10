-- Update branding_config table to support white labeling
ALTER TABLE branding_config 
ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Liv',
ADD COLUMN IF NOT EXISTS agent_avatar_url TEXT DEFAULT 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
ADD COLUMN IF NOT EXISTS developer_branding_enabled BOOLEAN DEFAULT true;

-- Update existing rows to have default values if they are null
UPDATE branding_config SET agent_name = 'Liv' WHERE agent_name IS NULL;
UPDATE branding_config SET agent_avatar_url = 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50' WHERE agent_avatar_url IS NULL;
UPDATE branding_config SET developer_branding_enabled = true WHERE developer_branding_enabled IS NULL;





