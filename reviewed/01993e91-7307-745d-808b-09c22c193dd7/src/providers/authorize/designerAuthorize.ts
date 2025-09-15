import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { DesignerPayload } from "../../decorators/payload/DesignerPayload";

export async function designerAuthorize(request: { headers: { authorization?: string } }): Promise<DesignerPayload> {
  const payload: DesignerPayload = jwtAuthorize({ request }) as DesignerPayload;

  if (payload.type !== "designer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const designer = await MyGlobal.prisma.task_management_designer.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (designer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
