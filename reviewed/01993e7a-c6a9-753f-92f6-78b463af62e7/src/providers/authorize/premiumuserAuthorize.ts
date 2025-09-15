import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { PremiumuserPayload } from "../../decorators/payload/PremiumuserPayload";

export async function premiumuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<PremiumuserPayload> {
  const payload: PremiumuserPayload = jwtAuthorize({ request }) as PremiumuserPayload;

  if (payload.type !== "premiumuser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const premiumUser = await MyGlobal.prisma.recipe_sharing_premiumusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (premiumUser === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
