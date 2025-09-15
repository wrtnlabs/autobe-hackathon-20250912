import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete (soft-delete) an applicant account by applicantId
 * (ats_recruitment_applicants).
 *
 * This operation allows a system administrator to soft-delete (GDPR-compliant)
 * an applicant account by marking the deleted_at timestamp. All
 * applicant-accessing services are disabled after this point. Auditable and
 * idempotent. An audit log is always written for compliance.
 *
 * @param props - Object containing required parameters
 * @param props.systemAdmin - The authenticated system administrator requesting
 *   the operation
 * @param props.applicantId - Unique identifier of the applicant to delete
 * @returns Void
 * @throws {Error} If the applicant does not exist
 */
export async function deleteatsRecruitmentSystemAdminApplicantsApplicantId(props: {
  systemAdmin: SystemadminPayload;
  applicantId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, applicantId } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Find applicant by ID
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: { id: applicantId },
    select: { id: true, deleted_at: true },
  });
  if (!applicant) {
    throw new Error("Applicant not found");
  }
  // Idempotent soft delete: set deleted_at if not yet deleted
  if (applicant.deleted_at === null) {
    await MyGlobal.prisma.ats_recruitment_applicants.update({
      where: { id: applicantId },
      data: { deleted_at: now },
    });
  }
  // Write compliance audit log (always, per business/GDPR requirements)
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "applicant",
      target_id: applicantId,
      event_detail: JSON.stringify({
        message: "Applicant account soft-deleted by system admin.",
        actor_id: systemAdmin.id,
        target_id: applicantId,
      }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
