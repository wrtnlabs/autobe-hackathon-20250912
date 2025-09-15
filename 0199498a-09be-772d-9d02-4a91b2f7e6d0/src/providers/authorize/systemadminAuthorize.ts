import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

/**
 * Authenticates and authorizes a system administrator for protected routes.
 * @param request HTTP request containing the Bearer JWT
 * @returns SystemadminPayload if authentication and authorization succeed
 * @throws ForbiddenException if the actor is not a system admin, does not exist, or is soft-deleted
 */
export async function systemadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemadminPayload> {
  const payload: SystemadminPayload = jwtAuthorize({ request }) as SystemadminPayload;

  if (payload.type !== "systemAdmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The systemadmin table is the root authority model for system admin JWTs.
  // payload.id = system admin's top-level user id (i.e., storyfield_ai_systemadmins.id)
  const systemadmin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (systemadmin === null) {
    throw new ForbiddenException("You're not enrolled or your account is deleted");
  }

  return payload;
}
