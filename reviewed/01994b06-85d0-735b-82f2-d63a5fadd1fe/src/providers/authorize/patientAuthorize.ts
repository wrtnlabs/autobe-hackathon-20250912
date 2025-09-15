import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { PatientPayload } from "../../decorators/payload/PatientPayload";

/**
 * Authorize a patient user by verifying JWT payload and existence in patient table.
 * @param request Express style request with headers object
 * @returns PatientPayload (Decoded JWT data, role checked, confirmed patient exists & active)
 * @throws ForbiddenException if not a patient or soft deleted
 */
export async function patientAuthorize(request: {
  headers: { authorization?: string };
}): Promise<PatientPayload> {
  const payload: PatientPayload = jwtAuthorize({ request }) as PatientPayload;

  if (payload.type !== "patient") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The JWT always has id = healthcare_platform_patients.id (top-level user id)
  // Validate patient exists, is not soft deleted
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });

  if (patient === null) {
    throw new ForbiddenException("You're not enrolled as a patient or account is deleted.");
  }

  return payload;
}
