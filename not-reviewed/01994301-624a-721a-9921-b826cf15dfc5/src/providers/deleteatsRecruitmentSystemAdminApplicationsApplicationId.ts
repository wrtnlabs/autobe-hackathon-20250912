import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erase (permanently delete) a job application by applicationId (HR or admin
 * only, irreversible).
 *
 * This operation allows a system administrator to remove an existing job
 * application. If the ats_recruitment_applications table supports soft-delete
 * (deleted_at), the record is marked as deleted; otherwise, it is removed from
 * the database. The function records the event in the audit log table for
 * compliance and forensic traceability. Application-level referential integrity
 * is enforced by the database's onDelete: Cascade relations.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.applicationId - The unique identifier of the application to be
 *   deleted
 * @returns Void (no output)
 * @throws {Error} If the application does not exist or has already been deleted
 */
export async function deleteatsRecruitmentSystemAdminApplicationsApplicationId(props: {
  systemAdmin: SystemadminPayload;
  applicationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, applicationId } = props;

  // Step 1: Check existence and not already deleted
  const found = await MyGlobal.prisma.ats_recruitment_applications.findFirst({
    where: {
      id: applicationId,
      deleted_at: null,
    },
  });
  if (found === null) {
    throw new Error("Application does not exist or has already been deleted");
  }

  // Step 2: Soft-delete by setting deleted_at to now
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_applications.update({
    where: { id: applicationId },
    data: { deleted_at: now },
  });

  // Step 3: Write audit log event
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "application",
      target_id: applicationId,
      event_detail: JSON.stringify({
        message: "System admin deleted application",
        systemAdminId: systemAdmin.id,
        applicationId,
      }),
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
