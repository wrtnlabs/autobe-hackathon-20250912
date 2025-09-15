import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

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
  // Since chatbot_members is the top-level user table for member role
  const member = await MyGlobal.prisma.chatbot_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
