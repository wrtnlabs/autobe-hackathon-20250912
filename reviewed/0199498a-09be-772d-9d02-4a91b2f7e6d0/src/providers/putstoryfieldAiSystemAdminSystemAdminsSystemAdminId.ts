import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update profile or admin notes of a system administrator
 * (storyfield_ai_systemadmins table).
 *
 * Use this operation to update core properties of a StoryField AI system
 * administrator account, identified by the systemAdminId path parameter
 * (UUID).
 *
 * Allowed updates include admin email, privilege/role descriptor (actor_type),
 * and administrative notes. Timestamp fields are updated automatically. Strict
 * input validation is enforced according to the database schema. Changes are
 * permanently recorded in audit trails for compliance and forensic review.
 *
 * System-level role authorization is required to modify any administrator
 * account. This operation is typically combined with the GET (detail) and PATCH
 * (list/search) endpoints for lifecycle management of admin users.
 *
 * @param props - Request properties.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update.
 * @param props.systemAdminId - The UUID of the administrator account to update.
 * @param props.body - The fields to update.
 * @returns The updated administrator account record, as per
 *   IStoryfieldAiSystemAdmin.
 * @throws {Error} If the account does not exist, is soft-deleted, or a unique
 *   email conflict occurs.
 */
export async function putstoryfieldAiSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
  body: IStoryfieldAiSystemAdmin.IUpdate;
}): Promise<IStoryfieldAiSystemAdmin> {
  const { systemAdmin, systemAdminId, body } = props;

  // Ensure the target admin exists and is not soft-deleted
  const admin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      id: systemAdminId,
      deleted_at: null,
    },
  });
  if (!admin) throw new Error("System admin not found or deleted");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  let updated;
  try {
    updated = await MyGlobal.prisma.storyfield_ai_systemadmins.update({
      where: { id: systemAdminId },
      data: {
        email: body.email ?? undefined,
        actor_type: body.actor_type ?? undefined,
        admin_notes:
          body.admin_notes !== undefined ? body.admin_notes : undefined,
        updated_at: now,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("email")
    )
      throw new Error(
        "Email must be unique. Another admin account uses this email.",
      );
    throw err;
  }

  return {
    id: updated.id,
    external_admin_id: updated.external_admin_id,
    email: updated.email,
    actor_type: updated.actor_type,
    last_login_at:
      updated.last_login_at !== null && updated.last_login_at !== undefined
        ? toISOStringSafe(updated.last_login_at)
        : undefined,
    admin_notes: updated.admin_notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
