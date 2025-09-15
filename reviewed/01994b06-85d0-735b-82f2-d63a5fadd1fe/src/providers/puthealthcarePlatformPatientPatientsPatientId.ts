import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Update an existing patient user profile in healthcare_platform_patients.
 *
 * This operation updates the patient user profile identified by the provided
 * patientId with the new details supplied in the request body. Only the
 * authenticated patient is permitted to update their own profile, with all
 * updates subject to audit trail capture and business logic enforcement.
 * Supported fields to update are: email, full_name, date_of_birth, and phone.
 * The endpoint ensures that only present fields are updated and uniqueness,
 * format, and compliance rules are enforced at both API and database levels.
 *
 * @param props - Update profile request properties
 * @param props.patient - Authenticated patient payload (JWT context)
 * @param props.patientId - Patient UUID matching the record to update
 * @param props.body - Profile fields to update (any subset of email, full_name,
 *   date_of_birth, phone)
 * @returns The fully updated patient profile as IHealthcarePlatformPatient
 * @throws {Error} If caller is not authorized to update the target patient or
 *   if patientId does not exist
 */
export async function puthealthcarePlatformPatientPatientsPatientId(props: {
  patient: PatientPayload;
  patientId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatient.IUpdate;
}): Promise<IHealthcarePlatformPatient> {
  const { patient, patientId, body } = props;

  // Only the patient themselves can update their own profile
  if (patient.id !== patientId) {
    throw new Error("Forbidden: You can only update your own patient profile.");
  }

  // Attempt to update patient information (only update provided fields)
  const updated = await MyGlobal.prisma.healthcare_platform_patients.update({
    where: { id: patientId },
    data: {
      email: typeof body.email !== "undefined" ? body.email : undefined,
      full_name:
        typeof body.full_name !== "undefined" ? body.full_name : undefined,
      date_of_birth:
        typeof body.date_of_birth !== "undefined"
          ? body.date_of_birth
          : undefined,
      phone: typeof body.phone !== "undefined" ? body.phone : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the fully updated patient profile, strictly matching schema
  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    date_of_birth: toISOStringSafe(updated.date_of_birth),
    phone: typeof updated.phone !== "undefined" ? updated.phone : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined" || updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
