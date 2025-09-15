import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a job posting state (ats_recruitment_job_posting_states)
 * by jobPostingStateId.
 *
 * This operation permanently and irreversibly deletes a workflow state from the
 * ATS system, identified by its unique UUID. It ensures the state is not in use
 * by any job postings prior to deletion, to prevent breaking business logic or
 * references. The action is only permitted for authenticated system
 * administrators and is fully logged in the audit trail for compliance and
 * traceability.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.jobPostingStateId - The UUID of the job posting state to delete
 * @returns Void
 * @throws {Error} If the state is in use or does not exist.
 */
export async function deleteatsRecruitmentSystemAdminJobPostingStatesJobPostingStateId(props: {
  systemAdmin: SystemadminPayload;
  jobPostingStateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, jobPostingStateId } = props;

  // 1. Verify state is not in use by any job postings
  const inUseCount = await MyGlobal.prisma.ats_recruitment_job_postings.count({
    where: { job_posting_state_id: jobPostingStateId },
  });
  if (inUseCount > 0) {
    throw new Error(
      "Cannot delete: This job posting state is referenced in existing job postings.",
    );
  }

  // 2. Attempt to delete; if not found will trigger error.
  await MyGlobal.prisma.ats_recruitment_job_posting_states.delete({
    where: { id: jobPostingStateId },
  });

  // 3. Insert compliance audit log
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "job_posting_state",
      target_id: jobPostingStateId,
      event_detail: JSON.stringify({ jobPostingStateId }),
      created_at: now,
      updated_at: now,
      ip_address: undefined,
      user_agent: undefined,
      deleted_at: undefined,
    },
  });
  return;
}
