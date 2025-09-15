import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { QaPayload } from "../../decorators/payload/QaPayload";

export async function qaAuthorize(request: { headers: { authorization?: string } }): Promise<QaPayload> {
  const payload: QaPayload = jwtAuthorize({ request }) as QaPayload;

  if (payload.type !== "qa") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level user table ID
  // Query using id as payload.id as QA is standalone user entity
  const qa = await MyGlobal.prisma.task_management_qa.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (qa === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
