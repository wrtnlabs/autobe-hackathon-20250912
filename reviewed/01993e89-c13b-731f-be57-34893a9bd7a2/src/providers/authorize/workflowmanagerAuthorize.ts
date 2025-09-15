import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { WorkflowmanagerPayload } from "../../decorators/payload/WorkflowmanagerPayload";

export async function workflowmanagerAuthorize(request: { headers: { authorization?: string } }): Promise<WorkflowmanagerPayload> {
  const payload: WorkflowmanagerPayload = jwtAuthorize({ request }) as WorkflowmanagerPayload;

  if (payload.type !== "workflowManager") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level user table ID
  // Query the standalone table using id as primary key
  const workflowManager = await MyGlobal.prisma.notification_workflow_workflowmanagers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (workflowManager === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
