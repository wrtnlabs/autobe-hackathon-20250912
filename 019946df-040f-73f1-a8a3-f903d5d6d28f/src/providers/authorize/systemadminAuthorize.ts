import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SystemadminPayload } from "../../decorators/payload/SystemadminPayload";

export async function systemadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SystemadminPayload> {
  const payload: SystemadminPayload = jwtAuthorize({ request }) as SystemadminPayload;

  if (payload.type !== "systemadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // enterprise_lms_systemadmin is standalone top-level user table
  const systemAdmin = await MyGlobal.prisma.enterprise_lms_systemadmin.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (systemAdmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
