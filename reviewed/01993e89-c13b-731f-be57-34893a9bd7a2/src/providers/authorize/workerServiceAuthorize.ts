import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { WorkerServicePayload } from "../../decorators/payload/WorkerServicePayload";

export async function workerServiceAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<WorkerServicePayload> {
  const payload: WorkerServicePayload = jwtAuthorize({ request }) as WorkerServicePayload;

  if (payload.type !== "workerService") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using 'id' field because workerService is standalone (no user_id foreign key)
  const workerService = await MyGlobal.prisma.notification_workflow_workerservices.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (workerService === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
