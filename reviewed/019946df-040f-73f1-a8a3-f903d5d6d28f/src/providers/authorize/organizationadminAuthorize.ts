import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { OrganizationadminPayload } from "../../decorators/payload/OrganizationadminPayload";

export async function organizationadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<OrganizationadminPayload> {
  const payload: OrganizationadminPayload = jwtAuthorize({ request }) as OrganizationadminPayload;

  if (payload.type !== "organizationadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const admin = await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
