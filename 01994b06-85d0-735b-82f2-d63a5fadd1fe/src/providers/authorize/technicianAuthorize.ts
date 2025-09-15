import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TechnicianPayload } from "../../decorators/payload/TechnicianPayload";

/**
 * Authenticates and authorizes a technician user using JWT and database validation.
 *
 * @param request HTTP request object containing the authorization headers
 * @returns Authenticated TechnicianPayload
 * @throws ForbiddenException if JWT is invalid, user is not a technician, or account is deleted
 */
export async function technicianAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TechnicianPayload> {
  const payload: TechnicianPayload = jwtAuthorize({ request }) as TechnicianPayload;

  if (payload.type !== "technician") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The top-level user table is healthcare_platform_technicians, use id primary key
  const technician = await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (technician === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
