/** @odoo-module **/
// OWL Grab loader — only activates in debug mode
(function () {
    // Check Odoo debug mode
    const isDebug = odoo.debug;
    if (!isDebug) return;

    const script = document.createElement("script");
    script.src = "/owl_grab/static/src/js/owl_grab.js";
    script.async = true;
    document.head.appendChild(script);
})();
