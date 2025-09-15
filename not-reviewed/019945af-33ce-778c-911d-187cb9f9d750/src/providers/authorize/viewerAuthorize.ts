import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ViewerPayload } from "../../decorators/payload/ViewerPayload";

export async function viewerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ViewerPayload> {
  const payload: ViewerPayload = jwtAuthorize({ request }) as ViewerPayload;

  if (payload.type !== "viewer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // flex_office_viewers is the authorization model for viewer role
  // Query using primary key field as viewer is standalone
  const viewer = await MyGlobal.prisma.flex_office_viewers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (viewer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
