import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed info for a single system administrator
 * (storyfield_ai_systemadmins table) by ID.
 *
 * This operation fetches the full profile and metadata for a specific
 * StoryField AI system administrator account, identified by its systemAdminId
 * parameter (UUID, primary key).
 *
 * Detailed information includes external_admin_id, admin email, role
 * descriptor, audit timestamps (created_at, updated_at, last_login_at),
 * privilege notes, and soft deletion status. This function is essential for
 * auditing, privilege escalation, emergency lockout, or compliance review.
 *
 * The operation enforces strict systemAdmin role authorization. System admin
 * account details are confidential and only accessible to users with elevated
 * system-level privileges. If the account is soft deleted, this is indicated in
 * the response.
 *
 * @param props - Properties for this operation.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request.
 * @param props.systemAdminId - Unique identifier for the target system
 *   administrator (UUID string).
 * @returns Detailed information about the specified system administrator
 *   account, including audit and privilege metadata.
 * @throws {Error} If the system administrator with the provided ID does not
 *   exist.
 */
export async function getstoryfieldAiSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiSystemAdmin> {
  const { systemAdminId } = props;
  const admin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: { id: systemAdminId },
  });
  if (admin == null) {
    throw new Error("System administrator not found");
  }
  return {
    id: admin.id,
    external_admin_id: admin.external_admin_id,
    email: admin.email,
    actor_type: admin.actor_type,
    last_login_at:
      admin.last_login_at !== null && admin.last_login_at !== undefined
        ? toISOStringSafe(admin.last_login_at)
        : null,
    admin_notes:
      admin.admin_notes !== null && admin.admin_notes !== undefined
        ? admin.admin_notes
        : undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
  };
}
