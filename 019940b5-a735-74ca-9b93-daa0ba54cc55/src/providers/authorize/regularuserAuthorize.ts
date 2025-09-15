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

  if (payload.type !== "regularUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using id because event_registration_regular_users is top-level user
  const regularUser = await MyGlobal.prisma.event_registration_regular_users.findFirst({
    where: {
      id: payload.id
    },
  });

  if (regularUser === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
