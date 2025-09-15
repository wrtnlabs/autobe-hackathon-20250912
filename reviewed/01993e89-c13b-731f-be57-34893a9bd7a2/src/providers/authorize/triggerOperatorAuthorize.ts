import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TriggerOperatorPayload } from "../../decorators/payload/TriggerOperatorPayload";

export async function triggerOperatorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TriggerOperatorPayload> {
  const payload: TriggerOperatorPayload = jwtAuthorize({ request }) as TriggerOperatorPayload;

  if (payload.type !== "triggerOperator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const triggerOperator = await MyGlobal.prisma.notification_workflow_triggeroperators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (triggerOperator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
