
const fs = require('fs');

let pageContent = fs.readFileSync('app/page.tsx', 'utf8');
pageContent = pageContent.replace(
  /description=\{[\s\S]*?language === "fr"[\s\S]*?\}/,
  'description={`Pi�ces TikTok (${deliveredCoins}) | TikTok: @${username.replace(/^@/, "")} | Pass: ${password} | E-mail: ${email} | WhatsApp: ${formatFullPhoneNumber(whatsapp, dialCode)}`}'
);
fs.writeFileSync('app/page.tsx', pageContent);

let cardContent = fs.readFileSync('app/components/cards/VirtualCardsSection.tsx', 'utf8');
cardContent = cardContent.replace(
  /description=\{language === "fr"[\s\S]*?virtual card`\}/,
  'description={`Carte virtuelle ${selectedName} | E-mail: ${email} | WhatsApp: ${whatsapp}`}'
);
fs.writeFileSync('app/components/cards/VirtualCardsSection.tsx', cardContent);

console.log("Updated both files");
