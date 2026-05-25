import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const SUPER_ROLES = ['super_admin', 'company_owner', 'company_admin'] as const;
const MANAGER_ROLES = [...SUPER_ROLES, 'manager', 'supervisor'] as const;

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !SUPER_ROLES.includes(ctx.user.role as typeof SUPER_ROLES[number])) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const ownerOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!SUPER_ROLES.includes(ctx.user.role as typeof SUPER_ROLES[number]))
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin or Owner access required' });
  return next({ ctx });
});

export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!MANAGER_ROLES.includes(ctx.user.role as typeof MANAGER_ROLES[number]))
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' });
  return next({ ctx });
});
