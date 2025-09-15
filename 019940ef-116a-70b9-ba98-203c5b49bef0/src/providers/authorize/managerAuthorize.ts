import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ManagerPayload } from "../../decorators/payload/ManagerPayload";

export async function managerAuthorize(request: { headers: { authorization?: string } }): Promise<ManagerPayload> {
  const payload: ManagerPayload = jwtAuthorize({ request }) as ManagerPayload;

  if (payload.type !== "manager") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Manager is standalone top-level in job_performance_eval_managers
  const manager = await MyGlobal.prisma.job_performance_eval_managers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (manager === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
