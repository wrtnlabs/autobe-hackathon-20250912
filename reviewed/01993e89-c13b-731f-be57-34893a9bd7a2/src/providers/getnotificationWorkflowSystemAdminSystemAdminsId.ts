import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieve a systemAdmin user by ID.
 *
 * This operation fetches detailed information for a single system administrator
 * user identified by their unique ID. It excludes sensitive data like password
 * hashes. Access is restricted to authorized system administrator users.
 *
 * @param props - Object containing systemAdmin authentication and target
 *   systemAdmin ID.
 * @param props.systemAdmin - The authenticated systemAdmin user making the
 *   request.
 * @param props.id - Unique identifier of the systemAdmin user to retrieve.
 * @returns Detailed systemAdmin user information.
 * @throws {Error} Throws if no systemAdmin user with the given ID is found.
 */
export async function getnotificationWorkflowSystemAdminSystemAdminsId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowSystemAdmin> {
  const { id } = props;

  const entity =
    await MyGlobal.prisma.notification_workflow_systemadmins.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: entity.id,
    email: entity.email,
    created_at: toISOStringSafe(entity.created_at),
    updated_at: toISOStringSafe(entity.updated_at),
    deleted_at: entity.deleted_at ? toISOStringSafe(entity.deleted_at) : null,
  };
}
