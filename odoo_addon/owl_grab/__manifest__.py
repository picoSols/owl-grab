{
    "name": "OWL Grab",
    "version": "18.0.1.0.0",
    "category": "Tools",
    "summary": "Select context for coding agents directly from your Odoo UI",
    "description": """
        Dev tool for AI coding agents. Hover any element, press Cmd+C to copy
        OWL component context. Works with Claude Code, Cursor, Copilot, etc.

        Only loads when Odoo is in debug mode (?debug=1).

        Install: symlink this folder into your Odoo addons path.
        Updates: git pull the owl-grab repo and restart Odoo.
    """,
    "author": "picoSols",
    "website": "https://github.com/picoSols/owl-grab",
    "license": "LGPL-3",
    "depends": ["web"],
    "assets": {
        "web.assets_backend": [
            ("after", "web/static/src/webclient/webclient.js", "owl_grab/static/src/js/loader.js"),
        ],
    },
    "auto_install": False,
    "installable": True,
    "application": False,
}
