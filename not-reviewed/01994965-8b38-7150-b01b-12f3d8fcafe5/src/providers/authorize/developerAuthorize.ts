import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
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

  // payload.id contains top-level id (developer.id)
  // Query the developers table where id = payload.id and deleted_at is null
  const developer = await MyGlobal.prisma.telegram_file_downloader_developers.findFirst({
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
