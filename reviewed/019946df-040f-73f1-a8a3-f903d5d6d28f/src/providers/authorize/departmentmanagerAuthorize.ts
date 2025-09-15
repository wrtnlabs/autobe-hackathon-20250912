import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { DepartmentmanagerPayload } from "../../decorators/payload/DepartmentManagerPayload";

export async function departmentmanagerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<DepartmentmanagerPayload> {
  const payload: DepartmentmanagerPayload = jwtAuthorize({ request }) as DepartmentmanagerPayload;

  if (payload.type !== "departmentManager") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The enterprise_lms_departmentmanager is a standalone top-level table
  const departmentManager = await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (departmentManager === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
