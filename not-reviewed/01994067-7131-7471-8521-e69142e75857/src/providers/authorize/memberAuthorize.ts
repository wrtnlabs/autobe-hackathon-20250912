import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // oauth_server_members is standalone table representing the member itself
  const member = await MyGlobal.prisma.oauth_server_members.findFirst({
    where: {
      id: payload.id, // standalone table, use id
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
