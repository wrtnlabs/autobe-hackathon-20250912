import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * List/filter all EHR version snapshots for a patient encounter with paging and
 * access control.
 *
 * This endpoint fetches and paginates all immutable EHR version records linked
 * to the specified patient record and clinical encounter. Supports filtering by
 * submitter, version number, date range, and update reason. Only department
 * heads with the correct role and scoping can access the result, and all
 * accesses are logged for compliance.
 *
 * @param props - DepartmentHead: The authenticated Department Head user making
 *   the request (must have access). patientRecordId: UUID of the patient record
 *   being accessed. encounterId: UUID of the EHR encounter being filtered for
 *   versions. body: IHealthcarePlatformEhrVersion.IRequest filter/paging/search
 *   params.
 * @returns Paginated array of EHR version snapshot records for this encounter &
 *   patient record.
 * @throws {Error} If encounter does not match patient record, or if access is
 *   unauthorized.
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersions(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrVersion.IRequest;
}): Promise<IPageIHealthcarePlatformEhrVersion> {
  const { departmentHead, patientRecordId, encounterId, body } = props;

  // Fetch the target encounter to verify that the patient_record_id matches the required patientRecordId
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUniqueOrThrow({
      where: { id: encounterId },
      select: { patient_record_id: true },
    });
  if (encounter.patient_record_id !== patientRecordId) {
    throw new Error(
      "Unauthorized: Encounter does not match provided patient record",
    );
  }

  // Compose the version filtering logic based on provided body filters
  const where: Record<string, unknown> = {
    ehr_encounter_id: encounterId,
    ...(body.submitted_by_user_id !== undefined &&
      body.submitted_by_user_id !== null && {
        submitted_by_user_id: body.submitted_by_user_id,
      }),
    ...(body.version_number !== undefined &&
      body.version_number !== null && { version_number: body.version_number }),
    ...(body.reason_for_update !== undefined &&
      body.reason_for_update !== null && {
        reason_for_update: body.reason_for_update,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };
  // Calculate pagination
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;
  const skip = page * limit;
  // Accept only valid sort fields, fallback to created_at
  const sortField =
    typeof body.sort === "string" &&
    ["created_at", "version_number"].includes(body.sort)
      ? body.sort
      : "created_at";
  // Accept only valid orders, default desc
  const orderDirection =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Fetch results and total count concurrently
  const [versions, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_versions.findMany({
      where,
      orderBy: { [sortField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_ehr_versions.count({ where }),
  ]);

  // Audit log (compliance - can be expanded)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: departmentHead.id,
      organization_id: undefined,
      action_type: "EHR_VERSION_LIST",
      event_context: JSON.stringify({
        patientRecordId,
        encounterId,
        filter: body,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Map results to DTO, converting dates correctly and omitting all Date type usage
  const data = versions.map((v) => {
    const result: IHealthcarePlatformEhrVersion = {
      id: v.id,
      ehr_encounter_id: v.ehr_encounter_id,
      submitted_by_user_id: v.submitted_by_user_id,
      version_number: v.version_number,
      snapshot_json: v.snapshot_json,
      reason_for_update: v.reason_for_update ?? null,
      created_at: toISOStringSafe(v.created_at),
    };
    return result;
  });

  // Build pagination info conforming to type requirements
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / (limit || 1)), // fallback to 1 to avoid division by zero
  };

  return {
    pagination,
    data,
  };
}
