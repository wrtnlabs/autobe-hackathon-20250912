import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new EHR encounter for a specific patient record.
 *
 * This operation allows an organization admin to create a clinical or
 * administrative encounter for an existing patient record. The encounter is
 * linked to both the patient and the admin as provider, with all relevant
 * fields such as encounter type, timings, and status. Soft-deleted patient
 * records cannot have encounters created. Audit and compliance fields are
 * populated automatically. The returned value follows the
 * IHealthcarePlatformEhrEncounter structure, with all date fields as
 * ISO-branded strings, and all optionals mapped precisely for the API
 * contract.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload;
 *   provider user for this encounter
 * @param props.patientRecordId - Patient record UUID to associate
 * @param props.body - Encounter creation payload (type, times, status, notes,
 *   etc)
 * @returns Newly created EHR encounter populated per API structure. Throws if
 *   patient record does not exist or is deleted.
 * @throws {Error} If patient record is missing or soft-deleted
 */
export async function posthealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncounters(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.ICreate;
}): Promise<IHealthcarePlatformEhrEncounter> {
  // Validate patient record existence (must not be soft-deleted)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: props.patientRecordId, deleted_at: null },
    });
  if (patientRecord === null) {
    throw new Error("Patient record not found or is deleted");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        patient_record_id: props.patientRecordId,
        provider_user_id: props.organizationAdmin.id,
        encounter_type: props.body.encounter_type,
        encounter_start_at: props.body.encounter_start_at,
        // For nullable/optional fields, map undefined and null as per interface spec
        encounter_end_at:
          typeof props.body.encounter_end_at !== "undefined"
            ? props.body.encounter_end_at
            : undefined,
        status: props.body.status,
        notes:
          typeof props.body.notes !== "undefined"
            ? props.body.notes
            : undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    patient_record_id: created.patient_record_id,
    provider_user_id: created.provider_user_id,
    encounter_type: created.encounter_type,
    encounter_start_at: toISOStringSafe(created.encounter_start_at),
    encounter_end_at:
      typeof created.encounter_end_at !== "undefined" &&
      created.encounter_end_at !== null
        ? toISOStringSafe(created.encounter_end_at)
        : undefined,
    status: created.status,
    notes: typeof created.notes !== "undefined" ? created.notes : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      typeof created.deleted_at !== "undefined" && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
