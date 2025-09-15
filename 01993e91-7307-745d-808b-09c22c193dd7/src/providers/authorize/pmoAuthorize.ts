import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { PmoPayload } from "../../decorators/payload/PmoPayload";

export async function pmoAuthorize(request: { headers: { authorization?: string } }): Promise<PmoPayload> {
  const payload: PmoPayload = jwtAuthorize({ request }) as PmoPayload;

  if (payload.type !== "pmo") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Check the user in database for validity
  const pmo = await MyGlobal.prisma.task_management_pmo.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (pmo === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
