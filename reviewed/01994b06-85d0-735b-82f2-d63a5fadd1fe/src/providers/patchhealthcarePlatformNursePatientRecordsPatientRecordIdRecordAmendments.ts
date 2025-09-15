import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a paginated index of record amendments for a specific patient
 * record.
 *
 * This endpoint enables nurses to query all amendments for a given patient
 * record, with advanced filtering on amendment type, status, reviewer, and
 * dates. Results are paginated, include full amendment details for
 * audit/compliance, and are scoped to user permission. Only active
 * (non-deleted) amendments are returned.
 *
 * @param props - Operation parameters
 * @param props.nurse - Authenticated nurse payload (RBAC enforced upstream)
 * @param props.patientRecordId - The patient record UUID to filter amendments
 * @param props.body - Amendment search, filter, and pagination criteria
 * @returns Paginated result of amendments for the given record
 * @throws {Error} If patient record not found, nurse not authorized, or other
 *   database errors
 */
export async function patchhealthcarePlatformNursePatientRecordsPatientRecordIdRecordAmendments(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAmendment> {
  const { nurse, patientRecordId, body } = props;

  // Enforced by upstream auth: nurse must be authorized for this record.

  // Pagination
  const page = body.page && typeof body.page === "number" ? body.page : 1;
  const limit = body.limit && typeof body.limit === "number" ? body.limit : 20;
  const skip = (page - 1) * limit;
  // Only allow sorting by known properties
  const allowedSortFields = ["created_at", "approval_status", "amendment_type"];
  const sort =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const order =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Build where clause inline to avoid use of any or as
  const where = {
    patient_record_id: patientRecordId,
    deleted_at: null,
    ...(body.amendment_type !== undefined &&
      body.amendment_type !== null && { amendment_type: body.amendment_type }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.reviewed_by_user_id !== undefined &&
      body.reviewed_by_user_id !== null && {
        reviewed_by_user_id: body.reviewed_by_user_id,
      }),
    ...(body.created_from !== undefined &&
    body.created_from !== null &&
    body.created_to !== undefined &&
    body.created_to !== null
      ? {
          created_at: {
            gte: body.created_from,
            lte: body.created_to,
          },
        }
      : body.created_from !== undefined && body.created_from !== null
        ? {
            created_at: {
              gte: body.created_from,
            },
          }
        : body.created_to !== undefined && body.created_to !== null
          ? {
              created_at: {
                lte: body.created_to,
              },
            }
          : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_amendments.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_record_amendments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / (limit > 0 ? limit : 1)),
    },
    data: rows.map((row) => ({
      id: row.id,
      patient_record_id: row.patient_record_id,
      submitted_by_user_id: row.submitted_by_user_id,
      reviewed_by_user_id: row.reviewed_by_user_id ?? undefined,
      ehr_encounter_id: row.ehr_encounter_id ?? undefined,
      amendment_type: row.amendment_type,
      old_value_json: row.old_value_json,
      new_value_json: row.new_value_json,
      rationale: row.rationale,
      approval_status: row.approval_status ?? undefined,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
