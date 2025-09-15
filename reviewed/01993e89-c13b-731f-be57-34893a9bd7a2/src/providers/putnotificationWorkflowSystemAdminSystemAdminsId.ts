import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update the details of an existing system administrator user in the
 * Notification Workflow backend.
 *
 * This endpoint requires authentication with the 'systemAdmin' role to modify
 * admin user accounts.
 *
 * The request accepts updates to email, password_hash, and deleted_at timestamp
 * fields.
 *
 * Audit timestamps such as updated_at are automatically managed.
 *
 * @param props - Object containing the systemAdmin authentication, target user
 *   ID, and update data
 * @param props.systemAdmin - Authenticated systemAdmin making the request
 * @param props.id - Unique identifier of the system admin user to update
 * @param props.body - Update data conforming to
 *   INotificationWorkflowSystemAdmin.IUpdate
 * @returns Updated system administrator user record with current data
 * @throws {Error} If the target system admin user does not exist
 */
export async function putnotificationWorkflowSystemAdminSystemAdminsId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowSystemAdmin.IUpdate;
}): Promise<INotificationWorkflowSystemAdmin> {
  const { systemAdmin, id, body } = props;

  // Ensure the system admin user exists
  await MyGlobal.prisma.notification_workflow_systemadmins.findUniqueOrThrow({
    where: { id },
  });

  // Perform update with field handling
  const updated =
    await MyGlobal.prisma.notification_workflow_systemadmins.update({
      where: { id },
      data: {
        email: body.email ?? undefined,
        password_hash: body.password_hash ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
