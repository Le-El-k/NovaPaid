# Authentification email NovaPaid (SPF + DKIM) — `novapaid.net` chez Namecheap

Objectif : que les codes envoyés depuis **support@novapaid.net** arrivent en
**boîte de réception** (pas en spam). L'expéditeur est déjà validé dans Mailjet ;
il reste à publier 2 enregistrements DNS.

**Ton DNS est géré chez Namecheap** (nameservers `dns1/dns2.registrar-servers.com`).
Tu as **déjà un SPF** pour ta messagerie Private Email, donc on le **fusionne**
(on ne crée PAS un second SPF).

---

## Où aller
Namecheap → **Domain List** → `novapaid.net` → **Manage** → onglet **Advanced DNS**
→ section **Host Records**.

---

## 1. SPF — MODIFIER l'enregistrement existant (ne pas en créer un nouveau)

Tu as actuellement ce TXT à la racine :

```
v=spf1 include:spf.privateemail.com ~all
```

**Édite-le** (crayon ✏️) et remplace la valeur par (ajout de `include:spf.mailjet.com`) :

```
v=spf1 include:spf.privateemail.com include:spf.mailjet.com ~all
```

| Champ | Valeur |
|-------|--------|
| Type  | `TXT Record` |
| Host  | `@` |
| Value | `v=spf1 include:spf.privateemail.com include:spf.mailjet.com ~all` |
| TTL   | Automatic |

> ⚠️ **Un seul SPF** autorisé. On garde `include:spf.privateemail.com` (ta messagerie)
> et on garde `~all`. On insère juste `include:spf.mailjet.com` au milieu.

---

## 2. DKIM — AJOUTER un nouvel enregistrement TXT

Clique **Add New Record** → **TXT Record** :

| Champ | Valeur |
|-------|--------|
| Type  | `TXT Record` |
| Host  | `mailjet._domainkey`   (sans `.novapaid.net` — Namecheap l'ajoute tout seul) |
| TTL   | Automatic |

Value (une seule ligne, coller telle quelle) :

```
k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq1V2tc4lWxU2HJLhqDSo28aO/48U9kUa1+4Wq4JS4UodNVsQRA/zQCG+7ZG7YxFP4kwg/UeQusSfZ0q2JZdORL3TY1lGNhSsCoq3hRyqs7R2x7yhqO/CRF1lKumZDiRP016HX77YmjiZOoCibjKw+l1uc5+i3ZBT4WSgu8kkG7MNOzfZCMMoW3GlG7IEMWgnnxzhQOc0qmwbspfHqL+c9EK4Y+MWBywpiPHS7y/ozBN373r4QU4IdB3mjp/7hldMohTY7bEGQ7LHF8r175kb3kJQHVm/d7lg7qqYwzisbQefgju2imbvq/Tj53BHD2ruLbKhbI2/1Hzy3GNt+HsqiwIDAQAB
```

---

## 3. (Optionnel) Preuve de propriété — AJOUTER un TXT

| Champ | Valeur |
|-------|--------|
| Type  | `TXT Record` |
| Host  | `mailjet._d8a37928` |
| Value | `d8a37928f70b1e8fa1f57794b2f8f919` |
| TTL   | Automatic |

Non requis si le DKIM passe, mais ça accélère la validation du domaine.

---

## 4. Enregistrer et vérifier
1. **Save all changes** dans Namecheap.
2. Propagation : souvent 30 min, parfois quelques heures.
3. Dis-moi « c'est ajouté » → **je relance la vérification Mailjet par l'API**
   (pas besoin d'aller dans leur dashboard). Quand **SPF = OK** et **DKIM = OK**,
   `novapaid.net` est authentifié et les emails arrivent en inbox.

---

## Rappel
- Expéditeur principal : `support@novapaid.net` (déjà **validé/Actif** dans Mailjet)
- Fallback validé : `siyapzegroupe@gmail.com` (secours automatique)
- Ta messagerie actuelle (Private Email / MX `privateemail.com`) n'est **pas** touchée :
  on ne modifie que le SPF (fusion) et on ajoute le DKIM Mailjet.
