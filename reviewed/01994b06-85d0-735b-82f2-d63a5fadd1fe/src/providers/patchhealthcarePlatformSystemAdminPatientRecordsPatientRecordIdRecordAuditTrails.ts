import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAuditTrail";
import { IPageIHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAuditTrail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of audit trail entries for a
 * specific patient record (healthcare_platform_record_audit_trails table).
 *
 * This endpoint allows authorized system admin users to search and review audit
 * trail entries for the given patient record. It provides advanced filtering
 * and pagination on the audit trails table, including actor, action, and date
 * range. Only users with systemAdmin privileges may use this operation. If the
 * referenced patient record does not exist, an error is thrown. All results
 * return fully normalized date/time fields and strict type-safe pagination.
 *
 * @param props - Object containing systemAdmin (authorization), patientRecordId
 *   (the record being audited), body (filter, sort, and pagination options)
 * @param props.systemAdmin - SystemadminPayload for an authenticated system
 *   admin
 * @param props.patientRecordId - UUID of the patient record whose audit trail
 *   is queried
 * @param props.body - Filtering, sorting, and pagination criteria
 *   (IHealthcarePlatformRecordAuditTrail.IRequest)
 * @returns Paginated list of audit trail entries matching the filter
 *   (IPageIHealthcarePlatformRecordAuditTrail)
 * @throws {Error} If the target patient record is not found
 */
export async function patchhealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAuditTrails(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAuditTrail.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAuditTrail> {
  const { systemAdmin, patientRecordId, body } = props;

  // Authorization: systemAdmin must exist (enforced by decorator/controller, rechecked here for contract)
  if (!systemAdmin || !systemAdmin.id) {
    throw new Error("Unauthorized: Systemadmin authentication required");
  }

  // Ensure patient record exists, else throw (404 pattern)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUnique({
      where: { id: patientRecordId },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found");
  }

  // Filtering and search params
  const pageNum = body.page ?? 1;
  const take = body.limit ?? 20;
  const skip = (pageNum - 1) * take;

  const allowedSortFields = ["created_at", "audit_action"];
  let orderField: "created_at" | "audit_action" = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (body.sort) {
    const sortParts = body.sort.trim().split(" ");
    if (allowedSortFields.includes(sortParts[0])) {
      orderField = sortParts[0] as "created_at" | "audit_action";
    }
    if (
      sortParts[1] &&
      (sortParts[1].toLowerCase() === "asc" ||
        sortParts[1].toLowerCase() === "desc")
    ) {
      orderDirection = sortParts[1].toLowerCase() === "asc" ? "asc" : "desc";
    }
  }

  // Build Prisma where condition (skip filters if undefined or null)
  const where = {
    patient_record_id: patientRecordId,
    ...(body.actor_user_id !== undefined &&
      body.actor_user_id !== null && {
        actor_user_id: body.actor_user_id,
      }),
    ...(body.audit_action !== undefined &&
      body.audit_action !== null && {
        audit_action: body.audit_action,
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

  // Parallel query of records and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_audit_trails.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_record_audit_trails.count({ where }),
  ]);

  const data = rows.map((row) => {
    return {
      id: row.id,
      patient_record_id: row.patient_record_id,
      actor_user_id: row.actor_user_id,
      audit_action: row.audit_action,
      event_context_json:
        row.event_context_json !== undefined
          ? row.event_context_json
          : undefined,
      before_state_json:
        row.before_state_json !== undefined ? row.before_state_json : undefined,
      after_state_json:
        row.after_state_json !== undefined ? row.after_state_json : undefined,
      request_reason:
        row.request_reason !== undefined ? row.request_reason : undefined,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(take),
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
