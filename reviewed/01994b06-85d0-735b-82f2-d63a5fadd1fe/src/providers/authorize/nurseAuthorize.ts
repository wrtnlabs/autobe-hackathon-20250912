import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { NursePayload } from "../../decorators/payload/NursePayload";

/**
 * Nurse Authorization Provider
 * Validates JWTs for users with the "nurse" role and ensures account is active.
 * @param request Express-style HTTP request with authorization header
 * @returns NursePayload
 * @throws ForbiddenException if not authorized or account is deleted
 */
export async function nurseAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<NursePayload> {
  const payload: NursePayload = jwtAuthorize({ request }) as NursePayload;

  if (payload.type !== "nurse") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is the nurse's id (top-level actor for this role)
  // Verify the nurse exists and is not deleted
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (nurse === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
