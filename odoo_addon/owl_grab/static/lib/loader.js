// OWL Grab loader — gate activation on debug mode
// Placed in static/lib/ to avoid Odoo's automatic ES module transpilation
// The bundle (owl_grab.js) is loaded via the asset manifest and checks this flag.
(function () {
    if (typeof odoo !== "undefined" && odoo.debug) {
        window.__OWL_GRAB_ENABLED__ = true;
    }
})();
