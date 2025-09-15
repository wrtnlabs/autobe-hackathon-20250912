import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CorporatelearnerPayload } from "../../decorators/payload/CorporatelearnerPayload";

export async function corporatelearnerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<CorporatelearnerPayload> {
  const payload: CorporatelearnerPayload = jwtAuthorize({ request }) as CorporatelearnerPayload;

  if (payload.type !== "corporatelearner") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  const corporateLearner = await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (corporateLearner === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
