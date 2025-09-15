import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a paginated index of record amendments for a specific patient
 * record.
 *
 * This operation provides compliance, clinical, and audit users (with system
 * admin privilege) a way to search and review all amendments—including
 * corrections, regulatory actions, or patient-initiated changes—on a patient's
 * record. Supports filtering by amendment type, approval status, reviewer, date
 * range, and paginates results.
 *
 * Business rules:
 *
 * - Only accessible by authenticated system admins (authorization validated by
 *   SystemadminAuth decorator).
 * - If the patient record is not found or has no amendments, returns an empty
 *   result.
 * - Returns all attributes as per the IHealthcarePlatformRecordAmendment DTO,
 *   with date fields converted to ISO8601 string format and all optionals
 *   handled per spec.
 *
 * @param props - Arguments for the request
 * @param props.systemAdmin - Authenticated system admin payload from
 *   SystemadminAuth
 * @param props.patientRecordId - UUID of the patient record whose amendments to
 *   index
 * @param props.body - Filtering, pagination, and sorting criteria as IRequest
 * @returns Paginated list of IHealthcarePlatformRecordAmendment matching filter
 * @throws {Error} If query or pagination constraints are violated
 */
export async function patchhealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAmendments(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAmendment> {
  const { patientRecordId, body } = props;
  // Default pagination parameters (enforce branded integer with Number()).
  const page = Number(body.page ?? 0);
  const limit = Number(body.limit ?? 25);

  // Only include filters if explicitly defined and non-empty (handle undefined/null for all).
  const where = {
    patient_record_id: patientRecordId,
    ...(body.amendment_type !== undefined &&
      body.amendment_type !== null &&
      body.amendment_type.length > 0 && {
        amendment_type: body.amendment_type,
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null &&
      body.approval_status.length > 0 && {
        approval_status: body.approval_status,
      }),
    ...(body.reviewed_by_user_id !== undefined &&
      body.reviewed_by_user_id !== null && {
        reviewed_by_user_id: body.reviewed_by_user_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };
  // Restrict sort/order to reasonable defaults if not set.
  const sortField =
    body.sort && body.sort.length > 0 ? body.sort : "created_at";
  const sortOrder =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Query for paged data and total count in parallel for efficient pagination.
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_amendments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_record_amendments.count({ where }),
  ]);

  // Map DB rows to DTO, handle all branding conversion and null/undefined patterns strictly.
  const data = rows.map((row) => {
    return {
      id: row.id,
      patient_record_id: row.patient_record_id,
      submitted_by_user_id: row.submitted_by_user_id,
      // Optional nullable for reviewed_by_user_id and ehr_encounter_id (undefined if null in DB)
      ...(row.reviewed_by_user_id !== undefined &&
      row.reviewed_by_user_id !== null
        ? { reviewed_by_user_id: row.reviewed_by_user_id }
        : {}),
      ...(row.ehr_encounter_id !== undefined && row.ehr_encounter_id !== null
        ? { ehr_encounter_id: row.ehr_encounter_id }
        : {}),
      amendment_type: row.amendment_type,
      old_value_json: row.old_value_json,
      new_value_json: row.new_value_json,
      rationale: row.rationale,
      // approval_status is optional and nullable; only include if present and non-null
      ...(row.approval_status !== undefined && row.approval_status !== null
        ? { approval_status: row.approval_status }
        : {}),
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // Build pagination output as per IPage.IPage structure (always use Number() for uint32 branding)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit || 1))),
    },
    data,
  };
}
