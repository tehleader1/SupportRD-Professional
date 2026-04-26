document.addEventListener("DOMContentLoaded", () => {
  if (window.SupportRDRebuild?.initCommerceRank) {
    window.SupportRDRebuild.initCommerceRank();
    window.SupportRDRebuild.initAccountBackbone?.();
    window.SupportRDRebuild.initFunctionalSurfaces?.();
    window.SupportRDRebuild.initVoiceAssistants?.();
  }
});
