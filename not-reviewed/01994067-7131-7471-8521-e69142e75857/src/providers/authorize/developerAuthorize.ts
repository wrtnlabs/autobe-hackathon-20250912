import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { DeveloperPayload } from "../../decorators/payload/DeveloperPayload";

export async function developerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<DeveloperPayload> {
  const payload: DeveloperPayload = jwtAuthorize({ request }) as DeveloperPayload;

  if (payload.type !== "developer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // The developer table uses its own id of type UUID and is top-level (no foreign key to other user table)
  const developer = await MyGlobal.prisma.oauth_server_developers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (developer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
