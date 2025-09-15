import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ReceptionistPayload } from "../../decorators/payload/ReceptionistPayload";

/**
 * Authorizes and authenticates a receptionist user via JWT.
 * 
 * @param request HTTP request object containing headers
 * @returns Authenticated ReceptionistPayload if valid and enrolled
 * @throws ForbiddenException if not a receptionist or not active
 */
export async function receptionistAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ReceptionistPayload> {
  const payload: ReceptionistPayload = jwtAuthorize({ request }) as ReceptionistPayload;

  if (payload.type !== "receptionist") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is top-level receptionist user id
  // Query using primary key field in healthcare_platform_receptionists
  const receptionist = await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (!receptionist) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
