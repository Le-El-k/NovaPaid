
const fs = require('fs');

// 1. Update VideoGamesSection.tsx
let code = fs.readFileSync('app/components/games/VideoGamesSection.tsx', 'utf8');

// A. State variables: replace codLoginMethod / codPlayerName with codConfirmEmail
const oldStates = `const [codLoginMethod, setCodLoginMethod] = useState<string>("Activision");
  const [codPlayerName, setCodPlayerName] = useState<string>("");
  const [codPlayerNameError, setCodPlayerNameError] = useState<boolean>(false);`;
const newStates = `const [codConfirmEmail, setCodConfirmEmail] = useState<string>("");`;

if (code.includes(oldStates)) {
  code = code.replace(oldStates, newStates);
  console.log("Replaced state variables in VideoGamesSection.tsx");
}

// B. handlePackClick: reset codConfirmEmail
const oldReset = `setCodLoginMethod("Activision");
    setCodPlayerName("");
    setCodPlayerNameError(false);`;
const newReset = `setCodConfirmEmail("");`;
if (code.includes(oldReset)) {
  code = code.replace(oldReset, newReset);
  console.log("Replaced reset in handlePackClick");
}

// C. handleStep2Continue: clean validation for cod-mobile
const oldValidation = `    if (selectedGame?.id === "cod-mobile") {
      if (!cleanEmail) {
        setEpicEmailError(true);
        emailInputRef.current?.focus();
        hasError = true;
      }
      if (!cleanPassword || cleanPassword.length < 3) {
        setEpicPasswordError(true);
        if (!hasError) passwordInputRef.current?.focus();
        hasError = true;
      }
      if (!codPlayerName.trim()) {
        setCodPlayerNameError(true);
        hasError = true;
      }
    } else if (selectedGame?.requiresAccountPassword) {`;

const newValidation = `    if (selectedGame?.id === "cod-mobile") {
      if (!cleanEmail) {
        setEpicEmailError(true);
        emailInputRef.current?.focus();
        hasError = true;
      }
    } else if (selectedGame?.requiresAccountPassword) {`;

if (code.includes(oldValidation)) {
  code = code.replace(oldValidation, newValidation);
  console.log("Simplified step 2 validation for COD Mobile");
}

// D. Title and hint in Step 2 Header
const oldH3 = `<h3 className="game-modal-step-title">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Informations de connexion & Contact" : "Login Details & Contact") : t.step2Title}</h3>`;
const newH3 = `<h3 className="game-modal-step-title">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Identifiants du joueur & Contact" : "Player Info & Contact") : t.step2Title}</h3>`;
code = code.replace(oldH3, newH3);

const oldHint = `<p className="video-game-form-hint">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Renseignez vos accès Call of Duty: Mobile et votre numéro WhatsApp" : "Enter your Call of Duty: Mobile credentials and WhatsApp number") : isDirectFlow ? (language === "fr" ? "Renseignez votre ID Joueur (UID) et votre numéro WhatsApp" : "Enter your Player UID and WhatsApp number") : t.step2Subtitle}</p>`;
const newHint = `<p className="video-game-form-hint">{selectedGame.id === "cod-mobile" ? (language === "fr" ? "Renseignez votre UID, Pseudo ou ID en jeu et vos coordonnées" : "Enter your in-game UID, Username or ID and your contact details") : isDirectFlow ? (language === "fr" ? "Renseignez votre ID Joueur (UID) et votre numéro WhatsApp" : "Enter your Player UID and WhatsApp number") : t.step2Subtitle}</p>`;
code = code.replace(oldHint, newHint);

// E. Step 2 Form fields for COD Mobile
const idxCodStart = code.indexOf('{selectedGame.id === "cod-mobile" ? (');
const idxCodEnd = code.indexOf('</>\r?\n                    ) : (', idxCodStart) !== -1 
  ? code.indexOf('</>\r?\n                    ) : (', idxCodStart)
  : code.indexOf('</>\n                    ) : (', idxCodStart);

const newCodFields = `{selectedGame.id === "cod-mobile" ? (
                      <>
                        {/* 1. UID / Pseudo ou ID du joueur */}
                        <label className="video-game-field">
                          <span className="video-game-field-label">
                            {language === "fr" ? "UID, Pseudo ou ID du joueur" : "Player UID, Username or ID"} <span className="required">*</span>
                          </span>
                          <div className="field-with-icon">
                            <User size={16} className="field-lead-icon" />
                            <input
                              ref={emailInputRef}
                              type="text"
                              value={epicEmail}
                              onChange={(e) => {
                                setEpicEmail(e.target.value);
                                if (epicEmailError && e.target.value.trim()) {
                                  setEpicEmailError(false);
                                }
                              }}
                              placeholder={language === "fr" ? "Ex: 6749123456789 ou Ghost_99" : "e.g. 6749123456789 or Ghost_99"}
                              className={`video-game-input with-icon ${epicEmailError ? "has-error" : ""}`}
                              required
                            />
                          </div>
                          {epicEmailError && (
                            <span className="video-game-field-error">
                              <AlertCircle size={13} /> {language === "fr" ? "Veuillez renseigner votre UID, pseudo ou ID de joueur" : "Please enter your player UID, username or ID"}
                            </span>
                          )}
                        </label>

                        {/* 2. Email de confirmation */}
                        <label className="video-game-field">
                          <span className="video-game-field-label">
                            {language === "fr" ? "Email de confirmation (reçu de recharge)" : "Confirmation Email (receipt)"}
                          </span>
                          <div className="field-with-icon">
                            <Mail size={16} className="field-lead-icon" />
                            <input
                              type="email"
                              value={codConfirmEmail}
                              onChange={(e) => setCodConfirmEmail(e.target.value)}
                              placeholder={language === "fr" ? "Ex: client@gmail.com" : "e.g. client@gmail.com"}
                              className="video-game-input with-icon"
                              autoComplete="email"
                            />
                          </div>
                          <span className="video-game-field-info">
                            {language === "fr" ? "Pour recevoir la confirmation de rechargement par email" : "To receive top-up confirmation by email"}
                          </span>
                        </label>
                      </>`;

if (idxCodStart !== -1 && idxCodEnd !== -1) {
  code = code.substring(0, idxCodStart) + newCodFields + code.substring(idxCodEnd + 3);
  console.log("Replaced COD fields in Step 2");
}

// F. WhatsApp direct order message
const waOld = `      ...(selectedGame.id === "cod-mobile" ? [
        `- Méthode de connexion : ${codLoginMethod}`,
        `- Compte : ${idVal}`,
        `- Pseudo / Nom joueur : ${codPlayerName.trim() || "(À renseigner)"}`,
      ] :`;
const waNew = `      ...(selectedGame.id === "cod-mobile" ? [
        `- UID / Pseudo ou ID : ${idVal}`,
        ...(codConfirmEmail.trim() ? [`- Email confirmation : ${codConfirmEmail.trim()}`] : []),
      ] :`;
code = code.replace(waOld, waNew);

// G. Recap in Step 3
const recapCodOld = `{selectedGame.id === "cod-mobile" ? (
                      <div className="freefire-direct-recap">
                        <div className="freefire-recap-item">
                          <span>Forfait :</span>
                          <strong style={{ color: "#22c55e", fontFamily: "inherit" }}>{activePack.name}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>Connexion :</span>
                          <strong>{codLoginMethod}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>Compte :</span>
                          <strong>{epicEmail.trim()}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>Nom joueur :</span>
                          <strong>{codPlayerName.trim()}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>WhatsApp :</span>
                          <strong>{formatFullPhoneNumber(whatsapp, dialCode)}</strong>
                        </div>
                        <div className="freefire-recap-item total">
                          <span>Total :</span>
                          <strong style={{ color: "#ff8c00" }}>{formatPrice(activePack.price, language)}</strong>
                        </div>
                      </div>
                    )`;

const recapCodNew = `{selectedGame.id === "cod-mobile" ? (
                      <div className="freefire-direct-recap">
                        <div className="freefire-recap-item">
                          <span>Forfait :</span>
                          <strong style={{ color: "#22c55e", fontFamily: "inherit" }}>{activePack.name}</strong>
                        </div>
                        <div className="freefire-recap-item">
                          <span>Joueur / UID :</span>
                          <strong>{epicEmail.trim()}</strong>
                        </div>
                        {codConfirmEmail.trim() && (
                          <div className="freefire-recap-item">
                            <span>Email :</span>
                            <strong>{codConfirmEmail.trim()}</strong>
                          </div>
                        )}
                        <div className="freefire-recap-item">
                          <span>WhatsApp :</span>
                          <strong>{formatFullPhoneNumber(whatsapp, dialCode)}</strong>
                        </div>
                        <div className="freefire-recap-item total">
                          <span>Total :</span>
                          <strong style={{ color: "#ff8c00" }}>{formatPrice(activePack.price, language)}</strong>
                        </div>
                      </div>
                    )`;
code = code.replace(recapCodOld, recapCodNew);

// H. SoleasPayCheckoutV3 props
const soleasOld = `username={selectedGame.id === "cod-mobile" ? (codPlayerName.trim() || epicEmail.trim()) : epicEmail.trim()}
                          email={epicEmail.trim()}
                          password={epicPassword}
                          loginMethod={selectedGame.id === "cod-mobile" ? codLoginMethod : undefined}
                          playerName={selectedGame.id === "cod-mobile" ? codPlayerName.trim() : undefined}`;

const soleasNew = `username={epicEmail.trim()}
                          email={selectedGame.id === "cod-mobile" ? (codConfirmEmail.trim() || undefined) : epicEmail.trim()}
                          password={epicPassword}`;

code = code.replace(soleasOld, soleasNew);

fs.writeFileSync('app/components/games/VideoGamesSection.tsx', code, 'utf8');
console.log("Updated VideoGamesSection.tsx successfully!");

