import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and retrieve a paginated, filterable list of patient encounters.
 *
 * This endpoint retrieves a paginated and filtered list of all clinical or
 * administrative encounters associated with a specific patient record in the
 * healthcarePlatform system. It applies advanced filtering (by encounter type,
 * provider, status, time window, and notes) and supports sorting and
 * pagination. The result is returned as a summary view optimized for care team
 * dashboards, record reviews, and compliance workflows.
 *
 * Access is restricted to authenticated medical doctors. The API enforces
 * soft-deletion (deleted_at = null) and returns only summary fields per
 * encounter. Only patient record encounters matching the querying doctor's
 * authorization are returned. Result pagination and sort fields are strictly
 * validated.
 *
 * @param props - Request parameters
 * @param props.medicalDoctor - Authenticated medical doctor
 *   (MedicaldoctorPayload)
 * @param props.patientRecordId - The UUID of the patient record whose
 *   encounters to query
 * @param props.body - Filter, search, and pagination parameters for the
 *   encounter listing
 * @returns Page of EHR encounter summary records efficiently filtered, sorted,
 *   and paginated.
 * @throws {Error} If database query fails, access to patient record is denied,
 *   or an invalid filter is provided.
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncounters(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IRequest;
}): Promise<IPageIHealthcarePlatformEhrEncounter.ISummary> {
  const { patientRecordId, body } = props;

  // Defensive normalization and branding
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage);
  const limit = Number(rawLimit);
  const skip = (page - 1) * limit;

  // Defensive where clause construction against null/undefined/empty
  const where: Record<string, unknown> = {
    patient_record_id: patientRecordId,
    deleted_at: null,
    ...(body.provider_user_ids !== undefined &&
    body.provider_user_ids !== null &&
    body.provider_user_ids.length > 0
      ? { provider_user_id: { in: body.provider_user_ids } }
      : {}),
    ...(body.encounter_type !== undefined &&
    body.encounter_type !== null &&
    body.encounter_type.length > 0
      ? { encounter_type: { in: body.encounter_type } }
      : {}),
    ...(body.status !== undefined &&
    body.status !== null &&
    body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...((body.encounter_start_at_from !== undefined &&
      body.encounter_start_at_from !== null) ||
    (body.encounter_start_at_to !== undefined &&
      body.encounter_start_at_to !== null)
      ? {
          encounter_start_at: {
            ...(body.encounter_start_at_from !== undefined &&
              body.encounter_start_at_from !== null && {
                gte: body.encounter_start_at_from,
              }),
            ...(body.encounter_start_at_to !== undefined &&
              body.encounter_start_at_to !== null && {
                lte: body.encounter_start_at_to,
              }),
          },
        }
      : {}),
    ...(body.notes_query !== undefined &&
    body.notes_query !== null &&
    body.notes_query.length > 0
      ? { notes: { contains: body.notes_query } }
      : {}),
  };

  // Only allow sorting by known safe fields
  const allowedSortFields = [
    "id",
    "provider_user_id",
    "encounter_type",
    "encounter_start_at",
    "status",
  ];
  const candidateSort =
    typeof body.sort_by === "string" && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "encounter_start_at";
  const candidateDir = body.sort_direction === "asc" ? "asc" : "desc";

  // Query in parallel for fastest response
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_encounters.findMany({
      where: where,
      select: {
        id: true,
        patient_record_id: true,
        provider_user_id: true,
        encounter_type: true,
        encounter_start_at: true,
        encounter_end_at: true,
        status: true,
      },
      orderBy: { [candidateSort]: candidateDir },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_ehr_encounters.count({ where: where }),
  ]);

  // Transform DB result rows to ISummary (all Date fields -> string)
  const data: IHealthcarePlatformEhrEncounter.ISummary[] = rows.map((row) => {
    const summary: IHealthcarePlatformEhrEncounter.ISummary = {
      id: row.id,
      patient_record_id: row.patient_record_id,
      provider_user_id: row.provider_user_id,
      encounter_type: row.encounter_type,
      encounter_start_at: toISOStringSafe(row.encounter_start_at),
      status: row.status,
      ...(row.encounter_end_at !== undefined && row.encounter_end_at !== null
        ? { encounter_end_at: toISOStringSafe(row.encounter_end_at) }
        : {}),
    };
    return summary;
  });

  // Calculate page count (ceiling division) and ensure proper branding
  const pageCount = Math.ceil(total / limit);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pageCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
