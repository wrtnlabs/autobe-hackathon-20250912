import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AuthenticateduserPayload } from "../../decorators/payload/AuthenticateduserPayload";

/**
 * Authorization Provider for authenticateduser role.
 * Verifies JWT payload, role, and ensures the user exists and is active (not soft-deleted).
 *
 * @param request - HTTP request object from NestJS context
 * @returns The validated AuthenticateduserPayload
 * @throws ForbiddenException if the role is incorrect or user does not exist/active
 */
export async function authenticateduserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AuthenticateduserPayload> {
  const payload: AuthenticateduserPayload = jwtAuthorize({ request }) as AuthenticateduserPayload;

  if (payload.type !== "authenticatedUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is always the top-level user id
  // Check for active (not soft-deleted) user
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
