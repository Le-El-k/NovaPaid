# AUDIT EXHAUSTIF ET SUIVI D'INTÉGRATION PRISMCARD -> NOVAPAID

**Statuts utilisés :**
- [ ] NON COMMENCÉE
- [/] EN COURS
- [X] INTÉGRÉE
- [V] TESTÉE ET VALIDÉE
- [!] BLOQUÉE

---

## 1. ESPACE UTILISATEUR (CLIENT)

### 1.1 Authentification & Sécurité
- [V] Inscription sécurisée (Nom, Email, Téléphone, Mot de passe)
- [V] Connexion par Email & Mot de passe avec sessions HttpOnly séparées
- [V] Déconnexion et révocation de session
- [V] Clôture des autres sessions actives (`revoke_other_sessions`)
- [V] Changement de mot de passe sécurisé (`change_password`)
- [V] Code PIN de sécurité à 4 chiffres (PrismCard PinController / PinLockController)
- [V] Système de session sécurisé avec protection CSRF / Same-Origin

### 1.2 Profil & Identité (KYC)
- [V] Consultation du profil et solde
- [V] Modification des informations personnelles (Nom, Téléphone)
- [V] Soumission de dossier KYC (CNI, Passeport, Titre de séjour)
- [V] Suivi du statut KYC (not_started, pending, approved, rejected)

### 1.3 Portefeuille (Wallet) & Finances
- [V] Consultation solde principal XAF + équivalents indicatifs EUR / USD
- [V] Consultation des fonds réservés (en cours de retrait / cartes)
- [V] Rechargement de portefeuille (Dépôt Orange Money, MTN, Wave, Carte)
- [V] Demande de retrait vers Mobile Money / Banque avec réservation immédiate
- [V] Transfert P2P de fonds entre utilisateurs NovaPaid (RIB virtuel)
- [V] Gestion des bénéficiaires favoris de transfert
- [V] Historique complet des transactions avec filtres (dépôts, retraits, transferts, achats)
- [V] Exportation du relevé de compte au format CSV
- [V] Impression / Reçu officiel de transaction (modal & print)

### 1.4 Cartes Virtuelles
- [V] Émission / Création de cartes virtuelles Visa & Mastercard (plafond max 3)
- [V] Consultation solde carte USD et informations masquées
- [V] Affichage 3D interactif de la carte avec retournement (Recto / Verso avec CVV)
- [V] Masquage / Démasquage des numéros sensibles
- [V] Gel / Dégel instantané de carte
- [V] Rechargement instantané de carte depuis le portefeuille principal (XAF -> USD)
- [V] Rapatriement instantané des fonds de la carte vers le portefeuille (USD -> XAF)
- [V] Historique des transactions par carte (achats, remboursements, recharges)
- [V] Consultation des coordonnées de facturation de la carte (Billing Address US)
- [V] Effet de balayage holographique et styles multicouches Visa / Mastercard

### 1.5 Programme Revendeurs / Affiliation (Client)
- [V] Génération automatique de code de parrainage revendeur
- [V] Suivi des filleuls inscrits et commissions perçues (`/api/resellers`)

### 1.6 Support & Assistance
- [V] Création de ticket de support avec catégorie, sujet et message
- [V] Suivi des tickets et messagerie bidirectionnelle avec l'équipe support
- [V] Notifications utilisateur en temps réel (crédits, débits, décisions KYC, statuts carte)

---

## 2. ESPACE ADMINISTRATEUR

### 2.1 Tableau de Bord & Pilotage
- [V] Authentification super_admin / opérateur avec session isolée
- [V] 5 Stat Cards interactives (Utilisateurs, Cartes, Solde disponible, Revenu/Volume, Approbations)
- [V] Raccourcis de navigation rapide (Accès rapides)
- [V] Module d'approbations urgentes en un clic
- [V] Thème sombre haute définition PrismCard avec barre latérale compartimentée

### 2.2 Gestion des Utilisateurs & Soldes
- [V] Liste complète des utilisateurs avec rôles, statuts et soldes
- [V] Suspension et réactivation de comptes utilisateurs
- [V] Gel et déblocage de portefeuilles clients
- [V] Ajustement manuel de solde client (Crédit / Débit avec motif obligatoire et audit)
- [V] Attribution et modification des statuts KYC

### 2.3 Programme Revendeurs (Administration)
- [V] Liste complète des partenaires revendeurs et leurs codes de parrainage
- [V] Consultation du nombre de filleuls et commissions cumulées
- [V] Ajustement administratif des taux de commission par revendeur

### 2.4 Marketing & Diffusion
- [V] Diffusion d'annonces Push ciblées à tous les utilisateurs ou comptes vérifiés
- [V] Gestion des bannières publicitaires et promotions (`promotional_ads`) avec activation/désactivation

### 2.5 Cartes Virtuelles Administratives
- [V] Liste de toutes les cartes émises avec leurs métadonnées
- [V] Gel / Dégel administratif forcé de n'importe quelle carte

### 2.6 Approbations & Opérations Financières
- [V] File d'attente des approbations (Dépôts à vérifier & Retraits à régler)
- [V] Validation administrative de dépôt avec référence externe obligatoire
- [V] Règlement de retrait avec consommation des fonds réservés ou rejet avec libération
- [V] Piste d'audit réglementaire et logs de chaque décision administrative

### 2.7 Support Client & Modération
- [V] File des tickets de support avec filtres de statut et priorité
- [V] Réponses officielles de l'équipe et notes internes confidentielles
- [V] Résolution et clôture de tickets
- [V] Modération des avis clients (Approbation, rejet, suppression)

### 2.8 Boutique (Marketplace) & Produits
- [V] Gestion des rayons / sections de la boutique
- [V] Création, édition, activation/désactivation de produits et forfaits
- [V] Configuration des offres et tarifs de recharge

### 2.9 Configuration & Paramètres
- [V] Taux de change (USD / XAF)
- [V] Commissions et frais d'opérateurs Mobile Money
- [V] Plafonds de transfert journaliers et mensuels
- [V] Mode maintenance plateforme
- [V] Gestion des comptes administrateurs avec attribution des rôles
