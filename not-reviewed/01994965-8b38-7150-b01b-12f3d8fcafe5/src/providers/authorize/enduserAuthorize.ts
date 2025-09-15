import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { EnduserPayload } from "../../decorators/payload/EnduserPayload";

export async function enduserAuthorize(request: { headers: { authorization?: string } }): Promise<EnduserPayload> {
  const payload: EnduserPayload = jwtAuthorize({ request }) as EnduserPayload;

  if (payload.type !== "enduser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Querying telegram_file_downloader_endusers table
  const enduser = await MyGlobal.prisma.telegram_file_downloader_endusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (enduser === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
