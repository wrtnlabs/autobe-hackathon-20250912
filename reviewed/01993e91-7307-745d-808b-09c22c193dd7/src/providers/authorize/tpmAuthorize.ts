import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TpmPayload } from "../../decorators/payload/TpmPayload";

export async function tpmAuthorize(request: { headers: { authorization?: string } }): Promise<TpmPayload> {
  const payload: TpmPayload = jwtAuthorize({ request }) as TpmPayload;

  if (payload.type !== "tpm") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const tpm = await MyGlobal.prisma.task_management_tpm.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (tpm === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
