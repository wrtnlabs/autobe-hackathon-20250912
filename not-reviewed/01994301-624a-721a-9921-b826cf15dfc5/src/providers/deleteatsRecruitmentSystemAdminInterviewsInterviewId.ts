import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (mark as deleted) a scheduled interview in
 * ats_recruitment_interviews.
 *
 * Marks the interview's deleted_at field with the current timestamp, making it
 * non-active for subsequent API calls. Only system admins can execute this
 * operation. All deletions are logged in ats_recruitment_audit_trails for
 * compliance.
 *
 * @param props - The properties for delete operation
 * @param props.systemAdmin - Authenticated system admin executing the deletion
 * @param props.interviewId - The UUID of the interview to delete
 * @returns Void
 * @throws {Error} If interview does not exist or is already deleted
 */
export async function deleteatsRecruitmentSystemAdminInterviewsInterviewId(props: {
  systemAdmin: SystemadminPayload;
  interviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch interview by ID and ensure it exists & is not already deleted
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: props.interviewId,
      deleted_at: null,
    },
  });
  if (!interview) {
    throw new Error("Interview not found or already deleted");
  }
  // Step 2: Soft delete (set deleted_at, updated_at to now)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_interviews.update({
    where: { id: props.interviewId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Step 3: Write audit log
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: props.systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "interview",
      target_id: props.interviewId,
      event_detail: `Interview ${props.interviewId} soft-deleted by system admin`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
