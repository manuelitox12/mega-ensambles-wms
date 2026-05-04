# Mega Ensambles - Warehouse Management System (WMS)

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)
![IndexedDB](https://img.shields.io/badge/database-IndexedDB-blue.svg)
![Architecture](https://img.shields.io/badge/architecture-Local--First-success.svg)

## Overview
This is a **high-performance, local-first web application** built to fully automate and modernize warehouse inventory management for Mega Ensambles. It transitions manual, error-prone spreadsheet tracking into a professional SaaS-grade interface, directly processing logistics files locally without the need for a backend server.

## Features & Technical Highlights

* **Local-First Architecture:** Built entirely with Vanilla JavaScript and **IndexedDB**, guaranteeing zero latency, offline capability, and absolute data privacy. The data never leaves the user's device unless explicitly exported.
* **Complex Data Parsing:** Integrates `SheetJS` and `ExcelJS` to programmatically ingest, analyze, and manipulate massive logistics `.xlsx` files. It automatically maps columns, detects missing references, and categorizes entries/exits.
* **Intelligent Reconciliation:** Features an automated audit system that compares theoretical stock vs. physical counts, instantly identifying discrepancies and offering one-click "balancing" solutions.
* **Premium UX/UI Design:** 
  * Implemented utilizing **Hick's Law** and **Fitts's Law** to reduce cognitive load and improve interaction speed for warehouse operators.
  * Employs **Gestalt principles** for clear visual hierarchy.
  * Fast navigation via global keyboard shortcuts (`Alt+1` to `Alt+8`) inspired by professional POS systems.
* **Self-Healing Data:** Includes an intelligent "Find and Replace" alias system to correct factory typos dynamically before they corrupt the database.

## Architecture
This project follows a strict **MVC (Model-View-Controller)** pattern and **SOLID principles** inside a Vanilla JS environment:
* `DatabaseService.js`: Handles all asynchronous IndexedDB transactions.
* `InventoryService.js`: Core business logic, stock recalculations, and state management.
* `ExcelService.js`: Binary file parsing, data mapping, and backup generation.
* `UIManager.js`: DOM manipulation, rendering, sorting, and responsive layout management.
* `AppController.js`: Bridges the UI actions with the business services.

## Installation
Since this is a client-side application, no backend setup is required.
1. Clone the repository.
2. Open `inventario_app.html` directly in any modern browser (Chrome, Edge, Firefox).
3. The system will automatically provision the local database and is ready to use.

## Author
Developed as a complete standalone business solution.

## License & Copyright
**Copyright (c) 2026 manuelitox12 - All rights reserved.**

This repository contains proprietary software. It is published publicly on GitHub strictly for the purpose of serving as a technical portfolio. You are granted permission to read and review the source code for evaluation purposes only. Commercial use, distribution, and deployment are strictly prohibited. See the [LICENSE](./LICENSE) file for more details.
