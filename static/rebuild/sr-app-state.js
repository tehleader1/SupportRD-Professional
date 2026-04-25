window.SupportRDState = {
  activeRoute: "diary",
  seriousnessScore: 0,
  rank: "starter",
  history: []
};

function updateRoute(route) {
  window.SupportRDState.activeRoute = route;
  window.SupportRDState.history.push({
    route,
    time: new Date().toISOString()
  });
}
