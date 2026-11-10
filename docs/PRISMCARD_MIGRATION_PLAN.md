# Plan de Migration PrismCard → NovaPaid

## Résumé
- **PrismCard** : Laravel + Blade + Alpine.js + Livewire + Tailwind v3 + MySQL
- **NovaPaid** : Next.js 16 + React 19 + TypeScript + Tailwind v4 + SQLite

---

## 1. TABLES DE BASE DE DONNÉES MANQUANTES DANS NOVAPAID

### Priorité Haute (Core)
| Table PrismCard | Équivalent NovaPaid | Action |
|---|---|---|
| `password_reset_tokens` | ❌ Absent | Créer |
| `wallet_transfers` | ✅ Via ledger_transactions | Conserver NovaPaid (double-entry) |
| `card_fees` | ❌ Absent | Créer |
| `card_reload_fees` | ❌ Absent | Créer |
| `card_withdrawal_fees` | ❌ Absent | Créer |
| `transfer_fees` | ❌ Absent | Créer |
| `exchange_rates` | ✅ Dans app_settings | Créer table dédiée |
| `api_keys` (providers dynamiques) | ❌ Hardcodé | Créer |
| `user_settings` | ❌ Absent | Créer |
| `verification_codes` | ❌ Absent | Créer |
| `identity_verifications` | ✅ kyc_cases | Enrichir |
| `activities` (activity log) | ✅ user_activity_logs | Enrichir |

### Priorité Moyenne (Marketplace & Shop)
| Table PrismCard | Équivalent NovaPaid | Action |
|---|---|---|
| `categories` | ❌ Absent | Créer |
| `articles` (produits marketplace) | ❌ Absent | Créer |
| `commandes` (commandes marketplace) | ❌ Absent | Créer |
| `comentaire_articles` | ❌ Absent | Créer |
| `comentaire_commandes` | ❌ Absent | Créer |
| `commande_transactions` | ❌ Absent | Créer |
| `category_fields` | ❌ Absent | Créer |
| `category_field_values` | ❌ Absent | Créer |
| `view_articles` | ❌ Absent | Créer |
| `shops` (boutiques utilisateur) | ❌ Absent | Créer |
| `shop_orders` | ❌ Absent | Créer |
| `shop_order_items` | ❌ Absent | Créer |
| `product_credentials` | ❌ Absent | Créer |

### Priorité Moyenne (Communication)
| Table PrismCard | Équivalent NovaPaid | Action |
|---|---|---|
| `email_settings` | ❌ Absent | Créer |
| `email_campaigns` | ❌ Absent | Créer |
| `email_campaign_recipients` | ❌ Absent | Créer |
| `push_announcement_recipients` | ❌ Absent | Créer |
| `landing_page_settings` | ❌ Absent | Créer |

### Priorité Moyenne (Sécurité)
| Table PrismCard | Équivalent NovaPaid | Action |
|---|---|---|
| `webauthn_credentials` | ❌ Absent | Créer |
| `trusted_devices` | ❌ Absent | Créer |
| `pending_registrations` | ❌ Absent | Créer |
| `card_verification_codes` | ❌ Absent | Créer |

### Priorité Basse (Avancé)
| Table PrismCard | Équivalent NovaPaid | Action |
|---|---|---|
| `cross_border_fees` | ❌ Absent | Créer |
| `decline_fee_transactions` | ❌ Absent | Créer |
| `manual_payment_apis` | ❌ Absent | Créer |
| `manual_payment_fields` | ❌ Absent | Créer |
| `manual_payment_api_amounts` | ❌ Absent | Créer |
| `webhook_relays` + 4 tables | ❌ Absent | Créer |
| `card_sync_progress` | ❌ Absent | Créer |
| `card_transaction_notifications` | ❌ Absent | Créer |
| `card_issuing_settings` | ❌ Absent | Créer |
| `card_provider_customers` | ❌ Absent | Créer |
| `card_termination_requests` | ❌ Absent | Créer |
| `reseller_subscriptions` | ❌ Absent | Créer |
| `reseller_commission_rates` | ❌ Absent | Créer |
| `reseller_overrides` | ❌ Absent | Créer |
| `reseller_link_clicks` | ❌ Absent | Créer |
| `deposit_help_popup_settings` | ❌ Absent | Créer |
| `marketplace_product_requests` | ❌ Absent | Créer |
| `user_preferences` | ❌ Absent | Créer |
| `support_widget_integrations` | ❌ Absent | Créer |
| `telegram_*` (5 tables) | ❌ Absent | Créer |

---

## 2. FONCTIONNALITÉS MANQUANTES DANS NOVAPAID

### Pages/Routes à créer
| Fonctionnalité PrismCard | NovaPaid | Action |
|---|---|---|
| `/marketplace` (browse articles) | ❌ | Créer page + composants |
| `/marketplace/{article}/details` | ❌ | Créer page détail |
| `/marketplace/commandes` (mes commandes) | ❌ | Créer page |
| `/my-shop` (gestion boutique utilisateur) | ❌ | Créer page + CRUD |
| `/shop/{slug}` (boutique publique) | ❌ | Créer page |
| `/help` (aide + AI assistant) | ❌ | Créer page |
| `/privacy`, `/terms` (pages légales) | ❌ | Créer pages |
| `/profile` (page dédiée) | ✅ Dans settings | OK |
| `/transactions/export-pdf` | ❌ | Créer endpoint |
| `/wallet/manual-payment` | ❌ | Créer page |

### Fonctionnalités Admin manquantes
| Fonctionnalité PrismCard | NovaPaid | Action |
|---|---|---|
| Revenue tracking dashboard | ❌ | Ajouter onglet |
| Payment API management (CRUD providers) | ❌ | Ajouter onglet |
| Fee management (card/reload/withdrawal/transfer) | ❌ | Ajouter onglet |
| Exchange rate CRUD | ❌ Partiel (dans settings) | Enrichir |
| Landing page CMS | ❌ | Ajouter onglet |
| Email settings SMTP | ❌ | Ajouter onglet |
| Email campaign system | ❌ | Ajouter onglet |
| Marketplace admin (categories, articles, commandes) | ❌ | Ajouter onglet |
| Shop admin (approbation boutiques) | ❌ | Ajouter onglet |
| Card provider management | ❌ | Ajouter onglet |
| Webhook relay management | ❌ | Ajouter onglet |
| Identity verification documents | ✅ KYC basique | Enrichir |
| System logs viewer | ❌ | Ajouter onglet |
| Activity logs + export | ❌ Partiel | Enrichir |
| Global search | ❌ | Ajouter |
| Login-as-user (impersonation) | ❌ | Ajouter |
| Marketing pixel settings | ❌ | Ajouter onglet |
| Withdrawal config (methods, rates) | ❌ | Ajouter onglet |
| Manual payment management | ❌ | Ajouter onglet |
| Card fee management (decline/cross-border) | ❌ | Ajouter onglet |

### Fonctionnalités User manquantes
| Fonctionnalité PrismCard | NovaPaid | Action |
|---|---|---|
| Biometric auth (WebAuthn) | ❌ | Ajouter |
| Trusted devices | ❌ | Ajouter |
| OTP verification codes | ❌ | Ajouter |
| PIN lock screen | ✅ PIN basique | Enrichir (lock screen) |
| Profile photo upload | ❌ | Ajouter |
| Email verification flow | ❌ | Ajouter |
| Password reset flow | ❌ | Ajouter |
| Marketplace browse & purchase | ❌ | Créer |
| Create own shop | ❌ | Créer |
| Order chat with seller | ❌ | Créer |
| PDF transaction export | ❌ | Ajouter |
| Help/FAQ pages | ❌ | Créer |
| Privacy/Terms pages | ❌ | Créer |
| Manual payment flow | ❌ | Créer |
| Multiple payment providers (15+) | ✅ 3 providers | Enrichir |
| Push notifications subscription | ❌ | Ajouter |
| Reseller subscription plans | ❌ | Ajouter |
| Marketing consent | ❌ | Ajouter |

---

## 3. ÉLÉMENTS NOVAPAID À CONSERVER (absents de PrismCard)

| Fonctionnalité | Fichier |
|---|---|
| Double-entry bookkeeping (ledger) | `app/lib/db/database.ts` |
| Beneficiaries system | `app/components/transfers/` |
| Sound effects | `app/lib/sound.ts` |
| i18n (fr/en) | `app/lib/i18n.tsx` |
| WhatsApp support integration | `app/components/support/WhatsApp*` |
| PWA install prompt (iOS/Android/Desktop) | `app/components/pwa/` |
| Platform maintenance gate | `app/components/platform/` |
| SebPay proxy integration | `app/lib/payments/sebpay-contract.ts` |
| Admin shop catalog (sections/products) | `app/components/admin/AdminShopCatalog.tsx` |
| TikTok coins section | `app/boutique/pieces-tiktok/` |
| Internet packages | Via boutique |
| Game catalog (6 jeux) | `app/lib/game-catalog.ts` |
| Cloudflare Workers deployment | `wrangler.jsonc` |

---

## 4. PLAN D'IMPLÉMENTATION PAR PHASES

### Phase 1 : Base de données & Auth (Fondations)
1. Ajouter les tables manquantes dans `database.ts`
2. Password reset flow
3. OTP verification codes
4. Email verification
5. Enrichir les tables existantes (users, cards, etc.)

### Phase 2 : Système de fees & exchange rates
1. Tables de frais (card_fees, reload_fees, etc.)
2. Exchange rates CRUD
3. API keys dynamiques (providers)
4. Fee calculation service

### Phase 3 : Admin enrichi
1. Revenue dashboard
2. Fee management tabs
3. Payment API management
4. Exchange rate management
5. Landing page CMS
6. Email settings & campaigns
7. System/activity logs
8. Global search
9. Login-as-user
10. Marketing pixels
11. Withdrawal config
12. Manual payments

### Phase 4 : Marketplace
1. Categories, articles, commandes tables
2. Browse marketplace page
3. Article details page
4. Purchase flow (wallet + external)
5. Commandes page (user)
6. Order chat
7. Admin: categories, articles, commandes management

### Phase 5 : User Shops
1. Shops, shop_products, shop_orders tables
2. Create shop page
3. Product management
4. Public shop page
5. Guest checkout
6. Product credentials (digital)
7. Admin: shop approvals

### Phase 6 : Sécurité avancée
1. WebAuthn biometric auth
2. Trusted devices
3. PIN lock screen
4. Card verification codes
5. Pending registrations

### Phase 7 : Communication
1. Push notifications subscription
2. Email campaign system
3. Telegram integration (support)
4. Support widget embeddable

### Phase 8 : Fonctionnalités supplémentaires
1. Help/FAQ system
2. Privacy/Terms pages
3. Profile photo
4. PDF export
5. Manual payment methods
6. Webhook relay system
7. Reseller subscriptions
8. Marketing consent
