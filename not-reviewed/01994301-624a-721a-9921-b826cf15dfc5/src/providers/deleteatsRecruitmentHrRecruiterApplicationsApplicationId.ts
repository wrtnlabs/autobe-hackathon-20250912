import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Erase (permanently delete/soft-delete) a job application by applicationId (HR
 * recruiter only, irreversible).
 *
 * This operation permanently marks as deleted (soft delete via deleted_at) a
 * job application record identified by its applicationId, provided the
 * requesting HR recruiter owns the related job posting. All deletion events are
 * audit-logged for compliance, and access is denied if the HR recruiter does
 * not own the record or if already deleted. Referential integrity is enforced
 * via schema-level constraints.
 *
 * @param props - Object containing request parameters
 * @param props.hrRecruiter - The authenticated HR recruiter requesting the
 *   deletion
 * @param props.applicationId - The UUID of the job application to be deleted
 * @returns Void
 * @throws {Error} When the application does not exist, is already deleted, or
 *   the HR recruiter does not own the associated job posting
 */
export async function deleteatsRecruitmentHrRecruiterApplicationsApplicationId(props: {
  hrRecruiter: HrrecruiterPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { hrRecruiter, applicationId } = props;

  // 1. Retrieve the target application (ensure not already deleted)
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: applicationId,
        deleted_at: null,
      },
      select: {
        id: true,
        job_posting_id: true,
        jobPosting: { select: { hr_recruiter_id: true } },
      },
    });

  if (!application)
    throw new Error(
      `Application record does not exist or is already deleted. Unable to process deletion.`,
    );

  // 2. Auth check: only owner recruiter may delete
  if (application.jobPosting.hr_recruiter_id !== hrRecruiter.id) {
    throw new Error(
      `Forbidden: HR recruiter does not own the associated job posting. Deletion denied.`,
    );
  }

  // 3. Mark deleted (soft delete pattern)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_applications.update({
    where: { id: applicationId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // 4. Write audit log for deletion
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: hrRecruiter.id,
      actor_role: "hrRecruiter",
      operation_type: "DELETE",
      target_type: "application",
      target_id: applicationId,
      event_detail: `Application ${applicationId} deleted by recruiter ${hrRecruiter.id}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
