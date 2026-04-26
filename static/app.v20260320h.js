document.addEventListener("DOMContentLoaded", () => {
  if (window.SupportRDRebuild?.initCommerceRank) {
    window.SupportRDRebuild.initCommerceRank();
    window.SupportRDRebuild.initFunctionalSurfaces?.();
    window.SupportRDRebuild.initVoiceAssistants?.();
  }
});
