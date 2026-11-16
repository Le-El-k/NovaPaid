// Production feature switches.
//
// SERVICES_LIVE gates every user-facing financial service (wallet, cards,
// transfers, funding, history, marketplace, support, settings, help, …).
// While it is `false`, only the Boutique (Geny internet, TikTok, games) is
// available and every other section shows a "service unavailable" screen.
//
// Flip this to `true` to turn the full platform back on — no other change needed.
export const SERVICES_LIVE = false;
