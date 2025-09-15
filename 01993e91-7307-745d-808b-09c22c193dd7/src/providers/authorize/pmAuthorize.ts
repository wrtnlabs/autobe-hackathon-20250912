import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { PmPayload } from "../../decorators/payload/PmPayload";

export async function pmAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<PmPayload> {
  const payload: PmPayload = jwtAuthorize({ request }) as PmPayload;

  if (payload.type !== "pm") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Since PM is a standalone top-level user table, use id field
  const pm = await MyGlobal.prisma.task_management_pm.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (pm === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
