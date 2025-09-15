import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemAdminPayload } from "../../decorators/payload/SystemAdminPayload";

export async function systemAdminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemAdminPayload> {
  const payload: SystemAdminPayload = jwtAuthorize({ request }) as SystemAdminPayload;

  if (payload.type !== "systemAdmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const admin = await MyGlobal.prisma.notification_workflow_systemadmins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
