import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { DepartmentheadPayload } from "../../decorators/payload/DepartmentheadPayload";

/**
 * Authorizes Department Head users via JWT and ensures they exist and are active.
 * @param request The HTTP request containing headers (with JWT Authorization)
 * @returns The authenticated DepartmentheadPayload
 * @throws ForbiddenException if not a valid department head
 */
export async function departmentheadAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<DepartmentheadPayload> {
  const payload: DepartmentheadPayload = jwtAuthorize({ request }) as DepartmentheadPayload;
  if (payload.type !== "departmentHead") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate department head existence and status
  const departmentHead = await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });
  if (departmentHead === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
