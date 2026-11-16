
import("./app/lib/db/service.ts").then(m => {
  const overview = m.NovaDbService.getAdminOverview();
  console.log("Overview:", JSON.stringify(overview));
  const settings = m.NovaDbService.getAdminSettings();
  console.log("Settings keys:", Object.keys(settings));
}).catch(e => console.error(e.message));

