-- Migration : Ajouter les champs cv_url et demande à la table candidatures

ALTER TABLE candidatures 
ADD COLUMN IF NOT EXISTS cv_url VARCHAR(500) AFTER lettre_motivation;

ALTER TABLE candidatures 
ADD COLUMN IF NOT EXISTS demande TEXT AFTER cv_url;

-- Ajouter des index si nécessaire
ALTER TABLE candidatures 
ADD KEY IF NOT EXISTS idx_cand_cv_url (cv_url);
