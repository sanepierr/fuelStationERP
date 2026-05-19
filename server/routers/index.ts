import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { authRouter } from "./auth.router";
import { dashboardRouter } from "./dashboard.router";
import { stationsRouter } from "./stations.router";
import { fuelTypesRouter, fuelPricesRouter } from "./fuel.router";
import { tanksRouter } from "./tanks.router";
import { pumpsRouter } from "./pumps.router";
import { attendantsRouter } from "./attendants.router";
import { transactionsRouter } from "./transactions.router";
import { deliveriesRouter } from "./deliveries.router";
import { productsRouter } from "./products.router";
import { loyaltyRouter } from "./loyalty.router";
import { shiftsRouter } from "./shifts.router";
import { rttRouter } from "./rtt.router";
import { ticketsRouter } from "./tickets.router";
import { invoicesRouter } from "./invoices.router";
import { creditNotesRouter } from "./creditNotes.router";
import { reportsRouter } from "./reports.router";
import { usersRouter } from "./users.router";
import { notificationsRouter } from "./notifications.router";
import { auditLogsRouter } from "./auditLogs.router";
import { scheduledRouter } from "./scheduled.router";
import { ptsControllersRouter } from "./ptsControllers.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  stations: stationsRouter,
  fuelTypes: fuelTypesRouter,
  fuelPrices: fuelPricesRouter,
  tanks: tanksRouter,
  pumps: pumpsRouter,
  attendants: attendantsRouter,
  transactions: transactionsRouter,
  deliveries: deliveriesRouter,
  products: productsRouter,
  loyalty: loyaltyRouter,
  shifts: shiftsRouter,
  rtt: rttRouter,
  tickets: ticketsRouter,
  invoices: invoicesRouter,
  creditNotes: creditNotesRouter,
  reports: reportsRouter,
  users: usersRouter,
  notifications: notificationsRouter,
  auditLogs: auditLogsRouter,
  scheduled: scheduledRouter,
  ptsControllers: ptsControllersRouter,
});

export type AppRouter = typeof appRouter;
