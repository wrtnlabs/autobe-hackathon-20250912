import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: { headers: { authorization?: string }}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level user table ID
  // Database table is subscription_renewal_guardian_user, primary key id is top-level
  const user = await MyGlobal.prisma.subscription_renewal_guardian_user.findFirst({
    where: {
      id: payload.id
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
