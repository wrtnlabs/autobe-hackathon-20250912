import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using primary key field since event_registration_admins is standalone
  const admin = await MyGlobal.prisma.event_registration_admins.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
