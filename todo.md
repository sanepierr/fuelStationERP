# FuelSync Pro - Project TODO

## Core Infrastructure
- [x] Extended database schema (stations, tanks, pumps, fuel types, attendants, transactions, etc.)
- [x] Role-based auth: Admin, Owner, Station Manager/Supervisor, Accountant, Technician, Attendant
- [x] Design system: dark professional theme, color palette, typography
- [x] DashboardLayout with role-aware sidebar navigation

## Admin Dashboard
- [x] Live multi-station performance overview with charts
- [x] Station management (add/edit/remove stations)
- [x] User management (create accounts for all roles)
- [x] Geo-location map showing all connected stations
- [x] System-wide analytics and KPI cards
- [x] Invoice management (send invoices to clients)
- [x] Ticket management (view/assign/resolve tickets)
- [x] Technical team account management

## Station Operations
- [x] Fuel tracking from depot to station (delivery orders, dispatch, receipt)
- [x] Offloading/delivery recording at station
- [x] Tank gauge monitoring (ATG integration widget)
- [x] Automatic Tank Gauge (ATG) dashboard integration
- [x] Pump management (register pumps per station)
- [x] Pump attendant registration and management
- [x] Pump attendant must be registered to operate pumps
- [x] Remote fuel price changes and price board management
- [x] Hikvision camera integration (RTSP/API widget in Station Detail)

## Forecourt & POS
- [x] Transaction recording at forecourt (fuel sales)
- [x] Receipt generation with QR code (URA-compliant)
- [x] Receipt printing and download
- [x] Payment methods: Cash, Mobile Money (MTN/Airtel), Visa, Credit Sales, Prepaid
- [x] Mobile money payment integration (MTN & Airtel Uganda)
- [x] Credit sales management
- [x] Prepaid account management

## Loyalty Program
- [x] Customer registration (NFC/RFID card support)
- [x] Loyalty points earning on fuel purchase
- [x] Loyalty points redemption
- [x] Customer loyalty dashboard
- [x] NFC/RFID card management

## Other Products
- [x] Product catalog (Gas, Lubes, Tyres, other station products)
- [x] Product sales recording
- [x] Product inventory tracking
- [x] Product sales reports

## Shift Management
- [x] Shift creation and assignment
- [x] Shift report generation at end of shift
- [x] Shift reconciliation
- [x] Return-to-Tank (RTT) transaction reconciliation for maintenance

## Reporting Engine
- [x] Daily reports with charts
- [x] Weekly reports with charts
- [x] Monthly reports with charts
- [x] Quarterly reports with charts
- [x] Annual reports with charts
- [x] Live graph metrics on product consumption
- [x] Print and download reports (PDF, Excel, CSV)
- [x] Fuel consumption analytics per station

## Client Dashboard
- [x] Client-facing dashboard with station overview
- [x] Raise support tickets
- [x] Credit note issuance to customers
- [x] View invoices from admin
- [x] Station performance metrics for client

## Ticket System
- [x] Ticket creation by clients
- [x] Ticket assignment to technical teams
- [x] Ticket status tracking (Open, In Progress, Resolved, Closed)
- [x] Ticket comments/updates
- [x] Admin ticket management

## Invoicing & Billing
- [x] Admin creates and sends invoices to clients
- [x] Invoice PDF generation and download
- [x] Invoice status tracking (Draft, Sent, Paid, Overdue)
- [x] Client views received invoices

## Documents & Files
- [x] All reports printable and downloadable
- [x] PDF export for all documents
- [x] Excel/CSV export for data tables
- [x] QR code on receipts for URA verification

## Testing
- [x] Auth and role-based access tests (26 tests passing)
- [x] Transaction recording tests
- [x] Report generation tests
- [x] Station, tank, shift, ticket, invoice, loyalty tests
