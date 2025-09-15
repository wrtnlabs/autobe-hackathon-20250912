import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Update an existing patient user profile in healthcare_platform_patients.
 *
 * Updates the patient profile for a given patientId, modifying core
 * demographics and contact info fields. Receptionist authentication is required
 * and only active (not deleted) patients may be modified. Only supplied fields
 * in the request body are updated. Returns the latest patient profile after
 * update.
 *
 * @param props The request props
 * @param props.receptionist ReceptionistPayload (authenticated receptionist)
 * @param props.patientId The patient UUID to update
 * @param props.body The fields to update (any of email, full_name,
 *   date_of_birth, phone)
 * @returns The updated patient profile
 * @throws {Error} If the patient does not exist or is deleted
 */
export async function puthealthcarePlatformReceptionistPatientsPatientId(props: {
  receptionist: ReceptionistPayload;
  patientId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatient.IUpdate;
}): Promise<IHealthcarePlatformPatient> {
  const { receptionist, patientId, body } = props;

  // Ensure patient exists and is not deleted
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: { id: patientId, deleted_at: null },
  });
  if (!patient) throw new Error("Patient not found");

  // Update patient; patch semantics, only supplied body fields are updated
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.healthcare_platform_patients.update({
    where: { id: patientId },
    data: {
      email: body.email ?? undefined,
      full_name: body.full_name ?? undefined,
      date_of_birth: body.date_of_birth ?? undefined,
      phone: body.phone !== undefined ? body.phone : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    date_of_birth: toISOStringSafe(updated.date_of_birth),
    phone:
      typeof updated.phone === "string"
        ? updated.phone
        : updated.phone === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
