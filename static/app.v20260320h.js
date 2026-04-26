document.addEventListener("DOMContentLoaded", () => {
  const r = window.SupportRDRebuild;
  if (r?.initCommerceRank)  r.initCommerceRank();
  if (r?.initAccountBackbone) r.initAccountBackbone();
  if (r?.initFunctionalSurfaces) r.initFunctionalSurfaces();
  if (r?.initVoiceAssistants) r.initVoiceAssistants();
  if (r?.initRealIntegrations) r.initRealIntegrations();
});
