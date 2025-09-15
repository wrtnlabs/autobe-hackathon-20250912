import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MedicaldoctorPayload } from "../../decorators/payload/MedicaldoctorPayload";

/**
 * Verifies JWT and checks DB membership for role medicalDoctor.
 * Ensures the medical doctor exists and has NOT been soft deleted.
 */
export async function medicaldoctorAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MedicaldoctorPayload> {
  // JWT authentication and payload validation
  const payload: MedicaldoctorPayload = jwtAuthorize({ request }) as MedicaldoctorPayload;

  if (payload.type !== "medicalDoctor") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate medical doctor identity by top-level user id.
  // Find doctor with id = payload.id and not deleted in DB.
  const doctor = await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });
  if (doctor === null) {
    throw new ForbiddenException("You're not enrolled as an active medical doctor");
  }
  return payload;
}
