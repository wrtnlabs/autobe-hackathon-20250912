import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegularuserPayload } from "../../decorators/payload/RegularuserPayload";

export async function regularuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<RegularuserPayload> {
  const payload: RegularuserPayload = jwtAuthorize({ request }) as RegularuserPayload;

  if (payload.type !== "regularuser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using id field of recipe_sharing_regularusers where deleted_at is null
  const user = await MyGlobal.prisma.recipe_sharing_regularusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
