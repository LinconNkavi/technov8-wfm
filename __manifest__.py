{
    "name": "TechNov8 Workforce Management",
    "version": "1.0.0",
    "category": "Human Resources",
    "summary": "TechNov8 gate and remote attendance, leave approvals, and employee views",
    "author": "TechNov8",
    "website": "https://technov8.co.za/",
    "depends": ["base", "hr", "hr_holidays", "web"],
    "data": [
        "security/ir.model.access.csv",
        "views/wfm_views.xml"
    ],
    "assets": {
        "web.assets_backend": [
            "technov8_wfm/static/src/js/wfm_dashboard.js",
            "technov8_wfm/static/src/xml/wfm_dashboard.xml"
        ]
    },
    "installable": True,
    "application": True,
    "license": "LGPL-3"
}
