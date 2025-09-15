import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ExternallearnerPayload } from "../../decorators/payload/ExternallearnerPayload";

export async function externallearnerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ExternallearnerPayload> {
  const payload: ExternallearnerPayload = jwtAuthorize({ request }) as ExternallearnerPayload;

  if (payload.type !== "externallearner") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const externallearner = await MyGlobal.prisma.enterprise_lms_externallearner.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (externallearner === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
