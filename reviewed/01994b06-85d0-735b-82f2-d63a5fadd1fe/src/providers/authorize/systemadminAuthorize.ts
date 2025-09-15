import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

/**
 * Authorizes and authenticates a Systemadmin user via JWT token verification and existence check in DB.
 * Verifies top-level user table ID (id) and ensures the admin is active (not deleted).
 *
 * @param request Express HTTP request object with headers
 * @returns The authenticated SystemadminPayload if valid
 * @throws ForbiddenException if not a systemadmin or not enrolled/active
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

  // payload.id contains healthcare_platform_systemadmins.id (top-level)
  const systemadmin = await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (systemadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
