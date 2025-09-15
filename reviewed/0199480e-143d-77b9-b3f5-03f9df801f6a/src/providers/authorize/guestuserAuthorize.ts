import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

export async function guestuserAuthorize(request: { headers: { authorization?: string } }): Promise<GuestuserPayload> {
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  if (payload.type !== "guestUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level guest user table ID
  // Query library_management_guestusers by id
  const guestUser = await MyGlobal.prisma.library_management_guestusers.findFirst({
    where: {
      id: payload.id, // guestUser is standalone table, not extending another table
      deleted_at: null
    },
  });

  if (guestUser === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
