import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

/**
 * Provider function for authenticating and authorizing system admin users.
 * Verifies JWT, checks for systemadmin type, and confirms validity in DB.
 * @param request - The incoming HTTP request with headers
 * @returns Authenticated SystemadminPayload
 * @throws ForbiddenException if authentication or role validation fails
 */
export async function systemadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemadminPayload> {
  const payload: SystemadminPayload = jwtAuthorize({ request }) as SystemadminPayload;

  if (payload.type !== "systemadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is the top-level user identifier (id on ats_recruitment_systemadmins)
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_active: true
    },
  });
  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}