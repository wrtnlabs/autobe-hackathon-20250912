import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { OrganizationadminPayload } from "../../decorators/payload/OrganizationadminPayload";

/**
 * Authenticate and authorize organizationadmin (organization-level admin user).
 * @param request HTTP request with Authorization header
 * @returns OrganizationadminPayload (with top-level user id)
 */
export async function organizationadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<OrganizationadminPayload> {
  const payload: OrganizationadminPayload = jwtAuthorize({ request }) as OrganizationadminPayload;

  if (payload.type !== "organizationadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The top-level user id for organizationadmin is healthcare_platform_organizationadmins.id
  const orgAdmin = await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (orgAdmin === null) {
    throw new ForbiddenException("You're not enrolled or have been deleted.");
  }

  return payload;
}
