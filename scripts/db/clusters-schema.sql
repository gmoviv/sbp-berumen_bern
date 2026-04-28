-- Migration: Create clusters table and add foreign key to personas

CREATE TABLE IF NOT EXISTS "clusters" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial clusters if empty
INSERT INTO "clusters" (id, name)
VALUES 
    ('marketing-business', 'Marketing & Business'),
    ('students', 'Students'),
    ('medical-health', 'Medical & Health'),
    ('retail', 'Retail'),
    ('general', 'General')
ON CONFLICT (id) DO NOTHING;
