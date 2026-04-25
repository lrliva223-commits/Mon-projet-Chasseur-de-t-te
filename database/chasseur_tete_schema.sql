-- ══════════════════════════════════════════════════════════
-- HeadHunter — Base de données MySQL complète
-- Version : 1.0.0
-- Exécuter : mysql -u root -p < headhunter.sql
-- ══════════════════════════════════════════════════════════

-- ── Création et sélection de la base ──────────────────────
CREATE DATABASE IF NOT EXISTS headhunter_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE headhunter_db;

-- ══════════════════════════════════════════════════════════
-- TABLE 1 : UTILISATEURS
-- Tous les acteurs de la plateforme
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS utilisateurs (
  id            CHAR(36)      NOT NULL,
  nom           VARCHAR(100)  NOT NULL,
  prenom        VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  mot_de_passe  VARCHAR(255)  NOT NULL,
  role          ENUM(
                  'candidat',
                  'recruteur',
                  'entreprise',
                  'admin'
                ) NOT NULL,
  statut        ENUM(
                  'actif',
                  'suspendu',
                  'supprime'
                ) NOT NULL DEFAULT 'actif',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email),
  KEY idx_role   (role),
  KEY idx_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tous les utilisateurs de la plateforme';

-- ══════════════════════════════════════════════════════════
-- TABLE 2 : CANDIDATS
-- Profil étendu des utilisateurs avec rôle "candidat"
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidats (
  id              CHAR(36)      NOT NULL,
  utilisateur_id  CHAR(36)      NOT NULL,
  titre_poste     VARCHAR(200),
  resume          TEXT,
  disponibilite   VARCHAR(100),
  salaire_min     INT UNSIGNED,
  cv_url          VARCHAR(500),
  avatar_url      VARCHAR(500),
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_candidat_user (utilisateur_id),
  KEY idx_disponibilite (disponibilite),
  KEY idx_salaire_min   (salaire_min),
  CONSTRAINT fk_candidat_utilisateur
    FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Profils candidats étendus';

-- ══════════════════════════════════════════════════════════
-- TABLE 3 : RECRUTEURS
-- Profil étendu des utilisateurs avec rôle "recruteur"
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recruteurs (
  id              CHAR(36)      NOT NULL,
  utilisateur_id  CHAR(36)      NOT NULL,
  specialite      VARCHAR(200),
  cabinet         VARCHAR(200),
  certifie        TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_recruteur_user (utilisateur_id),
  CONSTRAINT fk_recruteur_utilisateur
    FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Profils recruteurs / chasseurs de tête';

-- ══════════════════════════════════════════════════════════
-- TABLE 4 : ENTREPRISES
-- Profil étendu des utilisateurs avec rôle "entreprise"
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS entreprises (
  id              CHAR(36)      NOT NULL,
  utilisateur_id  CHAR(36)      NOT NULL,
  nom             VARCHAR(200)  NOT NULL,
  secteur         VARCHAR(100),
  taille          VARCHAR(50),
  siret           VARCHAR(20),
  adresse         TEXT,
  logo_url        VARCHAR(500),
  verifie         TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_siret           (siret),
  KEY idx_entreprise_verifie    (verifie),
  KEY idx_entreprise_utilisateur(utilisateur_id),
  CONSTRAINT fk_entreprise_utilisateur
    FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Profils entreprises clientes';

-- ══════════════════════════════════════════════════════════
-- TABLE 5 : OFFRES_EMPLOI
-- Annonces publiées par les recruteurs
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS offres_emploi (
  id               CHAR(36)     NOT NULL,
  recruteur_id     CHAR(36),
  entreprise_id    CHAR(36),
  titre            VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL,
  localisation     VARCHAR(200),
  type_contrat     ENUM(
                     'CDI',
                     'CDD',
                     'Freelance',
                     'Stage',
                     'Alternance'
                   ) NOT NULL DEFAULT 'CDI',
  salaire_min      INT UNSIGNED,
  salaire_max      INT UNSIGNED,
  statut           ENUM(
                     'active',
                     'fermee',
                     'suspendue'
                   ) NOT NULL DEFAULT 'active',
  date_publication TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_offre_statut        (statut),
  KEY idx_offre_recruteur     (recruteur_id),
  KEY idx_offre_entreprise    (entreprise_id),
  KEY idx_offre_localisation  (localisation),
  KEY idx_offre_type_contrat  (type_contrat),
  KEY idx_offre_date          (date_publication),
  CONSTRAINT fk_offre_recruteur
    FOREIGN KEY (recruteur_id)
    REFERENCES recruteurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_offre_entreprise
    FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Offres d emploi publiées par recruteurs ou entreprises';

-- ══════════════════════════════════════════════════════════
-- TABLE 6 : MANDATS
-- Missions de recrutement confiées par les entreprises
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mandats (
  id             CHAR(36)     NOT NULL,
  entreprise_id  CHAR(36)     NOT NULL,
  recruteur_id   CHAR(36),
  intitule       VARCHAR(255) NOT NULL,
  description    TEXT,
  budget         INT UNSIGNED,
  deadline       DATE,
  statut         ENUM(
                   'en_cours',
                   'cloture',
                   'suspendu'
                 ) NOT NULL DEFAULT 'en_cours',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mandat_entreprise (entreprise_id),
  KEY idx_mandat_recruteur  (recruteur_id),
  KEY idx_mandat_statut     (statut),
  CONSTRAINT fk_mandat_entreprise
    FOREIGN KEY (entreprise_id)
    REFERENCES entreprises(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_mandat_recruteur
    FOREIGN KEY (recruteur_id)
    REFERENCES recruteurs(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mandats de recrutement';

-- ══════════════════════════════════════════════════════════
-- TABLE 7 : CANDIDATURES
-- Postulations des candidats aux offres d'emploi
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidatures (
  id                CHAR(36)   NOT NULL,
  candidat_id       CHAR(36)   NOT NULL,
  offre_id          CHAR(36)   NOT NULL,
  statut            ENUM(
                      'envoyee',
                      'vue',
                      'shortlistee',
                      'entretien',
                      'refusee',
                      'acceptee'
                    ) NOT NULL DEFAULT 'envoyee',
  lettre_motivation TEXT,
  date_envoi        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Un candidat ne peut postuler qu'une seule fois à une offre
  UNIQUE KEY uk_candidature (candidat_id, offre_id),
  KEY idx_cand_statut     (statut),
  KEY idx_cand_candidat   (candidat_id),
  KEY idx_cand_offre      (offre_id),
  KEY idx_cand_date       (date_envoi),
  CONSTRAINT fk_cand_candidat
    FOREIGN KEY (candidat_id)
    REFERENCES candidats(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_cand_offre
    FOREIGN KEY (offre_id)
    REFERENCES offres_emploi(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Candidatures des candidats aux offres d emploi';

-- ══════════════════════════════════════════════════════════
-- TABLE 8 : ENTRETIENS
-- Entretiens planifiés suite à une candidature
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS entretiens (
  id              CHAR(36)     NOT NULL,
  candidature_id  CHAR(36)     NOT NULL,
  date_heure      DATETIME     NOT NULL,
  lieu_lien       VARCHAR(500),
  type            ENUM(
                    'telephone',
                    'visio',
                    'presentiel'
                  ) NOT NULL DEFAULT 'visio',
  statut          ENUM(
                    'planifie',
                    'confirme',
                    'annule',
                    'realise'
                  ) NOT NULL DEFAULT 'planifie',
  notes           TEXT,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_entretien_candidature (candidature_id),
  KEY idx_entretien_date        (date_heure),
  KEY idx_entretien_statut      (statut),
  CONSTRAINT fk_entretien_candidature
    FOREIGN KEY (candidature_id)
    REFERENCES candidatures(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Entretiens planifiés';

-- ══════════════════════════════════════════════════════════
-- TABLE 9 : MESSAGES
-- Messagerie interne entre utilisateurs
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id               CHAR(36)   NOT NULL,
  expediteur_id    CHAR(36)   NOT NULL,
  destinataire_id  CHAR(36)   NOT NULL,
  contenu          TEXT       NOT NULL,
  lu               TINYINT(1) NOT NULL DEFAULT 0,
  date_envoi       TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_msg_expediteur    (expediteur_id),
  KEY idx_msg_destinataire  (destinataire_id),
  KEY idx_msg_date          (date_envoi),
  KEY idx_msg_lu            (lu),
  CONSTRAINT fk_msg_expediteur
    FOREIGN KEY (expediteur_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_msg_destinataire
    FOREIGN KEY (destinataire_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Messagerie interne';

-- ══════════════════════════════════════════════════════════
-- TABLE 10 : COMPETENCES
-- Référentiel de compétences
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS competences (
  id         CHAR(36)     NOT NULL,
  libelle    VARCHAR(100) NOT NULL,
  categorie  VARCHAR(100),
  PRIMARY KEY (id),
  UNIQUE KEY uk_libelle (libelle),
  KEY idx_categorie (categorie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Référentiel des compétences';

-- ── Table de liaison candidat ↔ compétences ───────────────
CREATE TABLE IF NOT EXISTS candidat_competences (
  candidat_id    CHAR(36) NOT NULL,
  competence_id  CHAR(36) NOT NULL,
  niveau         ENUM(
                   'debutant',
                   'intermediaire',
                   'avance',
                   'expert'
                 ) NOT NULL DEFAULT 'intermediaire',
  PRIMARY KEY (candidat_id, competence_id),
  CONSTRAINT fk_cc_candidat
    FOREIGN KEY (candidat_id)
    REFERENCES candidats(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_cc_competence
    FOREIGN KEY (competence_id)
    REFERENCES competences(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Association candidats - compétences';

-- ══════════════════════════════════════════════════════════
-- TABLE 11 : NOTIFICATIONS
-- Notifications in-app pour chaque utilisateur
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id              CHAR(36)     NOT NULL,
  utilisateur_id  CHAR(36)     NOT NULL,
  type            VARCHAR(50)  NOT NULL,
  message         TEXT         NOT NULL,
  lu              TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_lu (utilisateur_id, lu),
  KEY idx_notif_date    (created_at),
  CONSTRAINT fk_notif_utilisateur
    FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Notifications in-app';

-- ══════════════════════════════════════════════════════════
-- DONNÉES DE TEST (seed)
-- Mot de passe pour tous les comptes : password123
-- Hash bcrypt de "password123" (10 rounds)
-- ══════════════════════════════════════════════════════════

-- ── Utilisateurs ──────────────────────────────────────────
INSERT IGNORE INTO utilisateurs
  (id, nom, prenom, email, mot_de_passe, role, statut)
VALUES
  -- Admin
  ('u-admin-0001', 'Admin', 'Super',
   'admin@headhunter.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'admin', 'actif'),

  -- Candidat 1
  ('u-cand-0001', 'Martin', 'Sophie',
   'sophie@exemple.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'candidat', 'actif'),

  -- Candidat 2
  ('u-cand-0002', 'Benali', 'Karim',
   'karim@exemple.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'candidat', 'actif'),

  -- Recruteur
  ('u-rec-0001', 'Durand', 'Jean',
   'jean@recruteur.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'recruteur', 'actif'),

  -- Entreprise
  ('u-ent-0001', 'TechCo', 'Admin',
   'contact@techco.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'entreprise', 'actif'),

  -- Entreprise 2
  ('u-ent-0002', 'FinancePlus', 'Manager',
   'rh@financeplus.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'entreprise', 'actif');

-- ── Profils candidats ─────────────────────────────────────
INSERT IGNORE INTO candidats
  (id, utilisateur_id, titre_poste, resume, disponibilite, salaire_min)
VALUES
  ('c-0001', 'u-cand-0001',
   'Développeur Frontend React Senior',
   'Développeuse passionnée avec 5 ans d''expérience sur React, TypeScript et Node.js. Spécialisée dans les interfaces utilisateur modernes et performantes.',
   'Immédiate', 55),

  ('c-0002', 'u-cand-0002',
   'Product Manager Digital',
   'Product Manager expérimenté, 4 ans en environnement agile sur des produits B2C à forte audience. Maîtrise des outils analytics et de la data.',
   '1 mois', 65);

-- ── Profil recruteur ──────────────────────────────────────
INSERT IGNORE INTO recruteurs
  (id, utilisateur_id, specialite, cabinet, certifie)
VALUES
  ('r-0001', 'u-rec-0001',
   'Tech & Digital', 'TalentPro Cabinet', 1);

-- ── Profil entreprise ─────────────────────────────────────
INSERT IGNORE INTO entreprises
  (id, utilisateur_id, nom, secteur, taille, siret, logo_url, verifie)
VALUES
  ('e-0001', 'u-ent-0001',
   'TechCo SA', 'Technologie', '50-200', '12345678901234',
   'https://via.placeholder.com/160x160.png?text=TechCo', 1),

  ('e-0002', 'u-ent-0002',
   'FinancePlus', 'Finance', '10-50', '56789012345678',
   'https://via.placeholder.com/160x160.png?text=FinancePlus', 1);

-- ── Offres d'emploi ───────────────────────────────────────
INSERT IGNORE INTO offres_emploi
  (id, recruteur_id, entreprise_id, titre, description,
   localisation, type_contrat, salaire_min, salaire_max, statut)
VALUES
  ('o-0001', 'r-0001', 'e-0001',
   'Développeur Frontend React Senior',
   'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe produit. Vous travaillerez sur des projets innovants avec React 18, TypeScript, React Query et Tailwind CSS dans un environnement full agile.',
   'Paris', 'CDI', 55, 75, 'active'),

  ('o-0002', 'r-0001', 'e-0001',
   'Product Manager Digital',
   'Pilotez le développement de nos produits digitaux B2C en méthode agile. Vous collaborerez avec les équipes tech, design et marketing pour définir la roadmap et prioriser les fonctionnalités.',
   'Lyon', 'CDI', 65, 85, 'active'),

  ('o-0003', 'r-0001', NULL,
   'UX Lead Designer',
   'Définissez la vision UX de nos produits et encadrez une équipe de 3 designers senior sur des projets grands comptes variés. Maîtrise de Figma et d''un design system obligatoire.',
   'Remote', 'CDI', 50, 65, 'active'),

  ('o-0004', 'r-0001', 'e-0001',
   'Développeur Backend Node.js',
   'Rejoignez notre équipe pour concevoir et maintenir nos APIs REST. Vous maîtrisez Node.js, Express, MySQL et les bonnes pratiques de sécurité.',
   'Paris', 'CDI', 50, 70, 'active'),

  ('o-0005', 'r-0001', 'e-0001',
   'Data Analyst Junior',
   'Analysez les données de nos produits pour alimenter la prise de décision. Vous utilisez SQL, Python et des outils de visualisation comme Tableau ou Metabase.',
   'Lyon', 'CDI', 38, 48, 'active'),

  ('o-0006', 'r-0001', 'e-0002',
   'Analyste Financier Senior',
   'Rejoignez notre équipe finance pour analyser les risques et optimiser nos investissements. Maîtrise d''Excel avancé, VBA et des outils de modélisation financière requise.',
   'Paris', 'CDI', 45, 65, 'active'),

  ('o-0007', 'r-0001', 'e-0002',
   'Chef de Projet Finance',
   'Pilotez des projets de transformation digitale dans le secteur bancaire. Vous coordonnez les équipes IT et métier pour livrer des solutions innovantes.',
   'Lyon', 'CDI', 55, 75, 'active');

-- ── Candidatures ──────────────────────────────────────────
INSERT IGNORE INTO candidatures
  (id, candidat_id, offre_id, statut, lettre_motivation)
VALUES
  ('ca-0001', 'c-0001', 'o-0001',
   'entretien',
   'Bonjour, je suis très motivée par ce poste. Mon expérience de 5 ans sur React et TypeScript correspond parfaitement à vos besoins.'),

  ('ca-0002', 'c-0001', 'o-0002',
   'vue',
   'Fort de mon expérience en product management, je souhaite rejoindre votre équipe pour contribuer à vos projets B2C.'),

  ('ca-0003', 'c-0002', 'o-0002',
   'shortlistee',
   'Après 4 années en tant que PM en environnement agile, je pense correspondre au profil que vous recherchez.'),

  ('ca-0004', 'c-0002', 'o-0001',
   'envoyee',
   'Je candidature pour le poste de développeur frontend, ma maîtrise de React et TypeScript est un atout majeur.');

-- ── Entretien ─────────────────────────────────────────────
INSERT IGNORE INTO entretiens
  (id, candidature_id, date_heure, lieu_lien, type, statut, notes)
VALUES
  ('en-0001', 'ca-0001',
   DATE_ADD(NOW(), INTERVAL 3 DAY),
   'https://meet.google.com/abc-defg-hij',
   'visio', 'planifie',
   'Entretien RH de 30 min puis entretien technique de 1h');

-- ── Mandats ───────────────────────────────────────────────
INSERT IGNORE INTO mandats
  (id, entreprise_id, recruteur_id, intitule, description, budget, deadline, statut)
VALUES
  ('m-0001', 'e-0001', 'r-0001',
   'Directeur Technique (CTO)',
   'Recherche d''un CTO pour piloter une équipe de 15 développeurs et définir la stratégie technique de l''entreprise.',
   25000, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'en_cours');

-- ── Compétences ───────────────────────────────────────────
INSERT IGNORE INTO competences (id, libelle, categorie) VALUES
  ('comp-01', 'React',          'Frontend'),
  ('comp-02', 'TypeScript',     'Frontend'),
  ('comp-03', 'Vue.js',         'Frontend'),
  ('comp-04', 'Angular',        'Frontend'),
  ('comp-05', 'Node.js',        'Backend'),
  ('comp-06', 'Express',        'Backend'),
  ('comp-07', 'Python',         'Backend'),
  ('comp-08', 'Java',           'Backend'),
  ('comp-09', 'MySQL',          'Base de données'),
  ('comp-10', 'PostgreSQL',     'Base de données'),
  ('comp-11', 'MongoDB',        'Base de données'),
  ('comp-12', 'Redis',          'Base de données'),
  ('comp-13', 'Docker',         'DevOps'),
  ('comp-14', 'Kubernetes',     'DevOps'),
  ('comp-15', 'AWS',            'Cloud'),
  ('comp-16', 'Azure',          'Cloud'),
  ('comp-17', 'Figma',          'Design'),
  ('comp-18', 'Agile / Scrum',  'Méthodes'),
  ('comp-19', 'Git',            'Outils'),
  ('comp-20', 'Jest',           'Tests');

-- ── Compétences des candidats ────────────────────────────
INSERT IGNORE INTO candidat_competences
  (candidat_id, competence_id, niveau)
VALUES
  ('c-0001', 'comp-01', 'expert'),
  ('c-0001', 'comp-02', 'avance'),
  ('c-0001', 'comp-05', 'intermediaire'),
  ('c-0001', 'comp-09', 'intermediaire'),
  ('c-0001', 'comp-19', 'avance'),
  ('c-0001', 'comp-20', 'intermediaire'),
  ('c-0002', 'comp-18', 'expert'),
  ('c-0002', 'comp-09', 'intermediaire'),
  ('c-0002', 'comp-07', 'debutant');

-- ── Messages ──────────────────────────────────────────────
INSERT IGNORE INTO messages
  (id, expediteur_id, destinataire_id, contenu, lu)
VALUES
  ('msg-0001', 'u-rec-0001', 'u-cand-0001',
   'Bonjour Sophie, votre profil correspond exactement à notre recherche pour le poste de Développeur React Senior. Seriez-vous disponible pour un entretien la semaine prochaine ?',
   0),

  ('msg-0002', 'u-cand-0001', 'u-rec-0001',
   'Bonjour Jean, merci pour votre message ! Je suis tout à fait intéressée. Je suis disponible mardi ou jeudi après-midi, dites-moi ce qui vous convient le mieux.',
   0),

  ('msg-0003', 'u-rec-0001', 'u-cand-0001',
   'Parfait ! Je vous propose jeudi à 14h00 en visioconférence. Je vous enverrai le lien par email.',
   0);

-- ── Notifications ─────────────────────────────────────────
INSERT IGNORE INTO notifications
  (id, utilisateur_id, type, message, lu)
VALUES
  ('n-0001', 'u-cand-0001',
   'nouveau_message',
   'Jean Durand vous a envoyé un message.', 0),

  ('n-0002', 'u-cand-0001',
   'statut_candidature',
   'Votre candidature pour "Développeur Frontend React Senior" est passée au statut Entretien.', 0),

  ('n-0003', 'u-rec-0001',
   'nouvelle_candidature',
   'Sophie Martin a postulé à votre offre "Développeur Frontend React Senior".', 1),

  ('n-0004', 'u-cand-0001',
   'entretien_planifie',
   'Un entretien a été planifié pour votre candidature au poste Développeur Frontend React Senior.', 0);

-- ══════════════════════════════════════════════════════════
-- VUES UTILES
-- ══════════════════════════════════════════════════════════

-- Vue : offres actives avec informations recruteur et entreprise
CREATE OR REPLACE VIEW vue_offres_actives AS
SELECT
  o.id,
  o.titre,
  o.description,
  o.localisation,
  o.type_contrat,
  o.salaire_min,
  o.salaire_max,
  o.statut,
  o.date_publication,
  CONCAT(u.prenom, ' ', u.nom) AS recruteur_nom_complet,
  r.specialite AS recruteur_specialite,
  r.cabinet    AS recruteur_cabinet,
  e.nom        AS entreprise_nom,
  e.secteur    AS entreprise_secteur,
  e.logo_url   AS entreprise_logo,
  COUNT(c.id)  AS nb_candidatures
FROM offres_emploi o
LEFT JOIN recruteurs  r ON o.recruteur_id  = r.id
LEFT JOIN utilisateurs u ON r.utilisateur_id = u.id
LEFT JOIN entreprises e  ON o.entreprise_id  = e.id
LEFT JOIN candidatures c ON c.offre_id       = o.id
WHERE o.statut = 'active'
GROUP BY o.id;

-- Vue : candidatures avec détails complets
CREATE OR REPLACE VIEW vue_candidatures_detail AS
SELECT
  can.id,
  can.statut,
  can.date_envoi,
  can.lettre_motivation,
  CONCAT(u.prenom, ' ', u.nom) AS candidat_nom,
  u.email                       AS candidat_email,
  c.titre_poste,
  c.cv_url,
  c.disponibilite,
  c.salaire_min,
  o.titre                       AS offre_titre,
  o.localisation                AS offre_localisation,
  o.type_contrat,
  e.nom                         AS entreprise_nom
FROM candidatures can
JOIN candidats     c  ON can.candidat_id    = c.id
JOIN utilisateurs  u  ON c.utilisateur_id   = u.id
JOIN offres_emploi o  ON can.offre_id        = o.id
LEFT JOIN entreprises e ON o.entreprise_id   = e.id;

-- Vue : tableau de bord admin
CREATE OR REPLACE VIEW vue_stats_admin AS
SELECT
  (SELECT COUNT(*) FROM utilisateurs WHERE statut = 'actif')              AS utilisateurs_actifs,
  (SELECT COUNT(*) FROM candidats)                                         AS total_candidats,
  (SELECT COUNT(*) FROM recruteurs)                                        AS total_recruteurs,
  (SELECT COUNT(*) FROM entreprises)                                       AS total_entreprises,
  (SELECT COUNT(*) FROM entreprises WHERE verifie = 0)                     AS entreprises_pending,
  (SELECT COUNT(*) FROM offres_emploi WHERE statut = 'active')             AS offres_actives,
  (SELECT COUNT(*) FROM candidatures)                                      AS total_candidatures,
  (SELECT COUNT(*) FROM messages WHERE lu = 0)                             AS messages_non_lus,
  (SELECT COUNT(*) FROM entretiens WHERE statut = 'planifie')              AS entretiens_planifies,
  (SELECT COUNT(*) FROM mandats WHERE statut = 'en_cours')                 AS mandats_en_cours;

-- ══════════════════════════════════════════════════════════
-- VÉRIFICATION FINALE
-- ══════════════════════════════════════════════════════════
SELECT
  'utilisateurs'        AS table_name, COUNT(*) AS nb_lignes FROM utilisateurs
UNION ALL SELECT 'candidats',          COUNT(*) FROM candidats
UNION ALL SELECT 'recruteurs',         COUNT(*) FROM recruteurs
UNION ALL SELECT 'entreprises',        COUNT(*) FROM entreprises
UNION ALL SELECT 'offres_emploi',      COUNT(*) FROM offres_emploi
UNION ALL SELECT 'mandats',            COUNT(*) FROM mandats
UNION ALL SELECT 'candidatures',       COUNT(*) FROM candidatures
UNION ALL SELECT 'entretiens',         COUNT(*) FROM entretiens
UNION ALL SELECT 'messages',           COUNT(*) FROM messages
UNION ALL SELECT 'competences',        COUNT(*) FROM competences
UNION ALL SELECT 'candidat_competences', COUNT(*) FROM candidat_competences
UNION ALL SELECT 'notifications',      COUNT(*) FROM notifications;
