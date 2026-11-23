# TechNov8 Workforce Management (WFM) — Odoo OWL Module

An Odoo Workforce Management (WFM) module built with Python, XML views, access security rules, and Odoo Web Library (OWL) front-end components, accompanied by a live web presentation (`index.html`) deployed via GitHub Pages.

## Overview

The TechNov8 WFM module is structured following standard Odoo addon architecture to separate backend data models, UI views, security permissions, and interactive OWL components cleanly.

## Repository Structure

```text
├── .github/workflows/   # GitHub Actions deployment workflow (static.yml)
├── models/              # Backend data models and business logic
├── security/            # Access rights and record-level security rules
├── static/src/          # OWL components, JavaScript, and front-end assets
├── technov8_wfm/        # Core WFM module logic and sub-components
├── views/               # XML views, actions, and menu definitions
├── __init__.py          # Python package initializer
├── __manifest__.py      # Odoo module metadata and dependencies
└── index.html           # Web overview page hosted on GitHub Pages
