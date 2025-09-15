import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Since guest is top-level (standalone), use id field
  const guest = await MyGlobal.prisma.subscription_renewal_guardian_guest.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (guest === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
