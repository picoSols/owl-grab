// OWL Grab loader — only activates in debug mode
// Placed in static/lib/ to avoid Odoo's automatic ES module transpilation
(function () {
    if (!odoo.debug) return;
    var script = document.createElement("script");
    script.src = "/owl_grab/static/lib/owl_grab.js";
    script.async = true;
    script.onerror = function () { console.error("[owl-grab] Failed to load bundle from", script.src); };
    script.onload = function () { console.log("[owl-grab] Bundle loaded successfully"); };
    document.head.appendChild(script);
})();
