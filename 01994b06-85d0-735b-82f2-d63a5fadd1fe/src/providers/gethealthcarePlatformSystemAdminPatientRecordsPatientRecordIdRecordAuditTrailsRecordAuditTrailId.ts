import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAuditTrail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAuditTrail";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed single audit log entry for a patient record
 * (healthcare_platform_record_audit_trails table).
 *
 * This endpoint allows authorized system administrators to view details for an
 * individual audit log entry identified by recordAuditTrailId under a specific
 * patient record (patientRecordId). Returns all permitted metadata for
 * compliance review, forensic audit, or legal investigation. Throws a not-found
 * error if no record exists for the provided identifiers.
 *
 * @param props - Function parameters
 * @param props.systemAdmin - The authenticated system administrator
 *   (SystemadminPayload)
 * @param props.patientRecordId - Unique identifier of the patient record
 *   containing the audit log entry (UUID)
 * @param props.recordAuditTrailId - Unique identifier of the audit trail entry
 *   (UUID)
 * @returns IHealthcarePlatformRecordAuditTrail - Audit log entry details for
 *   the requested patient record/audit ID
 * @throws {Error} If no audit trail record with the given ID exists for the
 *   patient record
 */
export async function gethealthcarePlatformSystemAdminPatientRecordsPatientRecordIdRecordAuditTrailsRecordAuditTrailId(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  recordAuditTrailId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRecordAuditTrail> {
  const { systemAdmin, patientRecordId, recordAuditTrailId } = props;

  // Authorization is enforced by controller decorator and props typing (SystemadminAuth)
  // Find the audit trail by both patient_record_id and id for strong defense-in-depth
  const auditTrail =
    await MyGlobal.prisma.healthcare_platform_record_audit_trails.findFirst({
      where: {
        id: recordAuditTrailId,
        patient_record_id: patientRecordId,
      },
    });

  if (!auditTrail) {
    throw new Error("Audit trail not found");
  }

  return {
    id: auditTrail.id,
    patient_record_id: auditTrail.patient_record_id,
    actor_user_id: auditTrail.actor_user_id,
    audit_action: auditTrail.audit_action,
    event_context_json: auditTrail.event_context_json ?? undefined,
    before_state_json: auditTrail.before_state_json ?? undefined,
    after_state_json: auditTrail.after_state_json ?? undefined,
    request_reason: auditTrail.request_reason ?? undefined,
    created_at: toISOStringSafe(auditTrail.created_at),
  };
}
