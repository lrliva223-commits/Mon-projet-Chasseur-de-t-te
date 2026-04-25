-- Migration : Ajouter les tables et colonnes pour les annonces admin

-- Créer la table admin_annonces si elle n'existe pas
CREATE TABLE IF NOT EXISTS admin_annonces (
  id            CHAR(36)      NOT NULL,
  titre         VARCHAR(255)  NOT NULL,
  contenu       TEXT          NOT NULL,
  cible         VARCHAR(50)   DEFAULT 'all', -- 'all', 'candidat', 'recruteur', 'entreprise'
  date_envoi    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_date_envoi (date_envoi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique des annonces envoyées par l\'admin';

-- Ajouter colonne type_message à la table messages si elle n'existe pas
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS type_message VARCHAR(50) DEFAULT 'direct' AFTER contenu;

-- Ajouter index sur type_message
ALTER TABLE messages 
ADD KEY IF NOT EXISTS idx_type_message (type_message);
