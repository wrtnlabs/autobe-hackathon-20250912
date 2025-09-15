import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a system alert by its ID.
 *
 * This operation permanently deletes a system alert record identified by its
 * unique ID from the flex_office_system_alerts table. Only administrators may
 * perform this irreversible deletion to maintain system integrity.
 *
 * @param props - Object containing admin credentials and alert ID.
 * @param props.admin - Authenticated admin performing the deletion.
 * @param props.id - UUID of the system alert to be deleted.
 * @throws {Error} Throws if the alert does not exist.
 */
export async function deleteflexOfficeAdminSystemAlertsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Ensure the specified alert exists - throws if not found
  await MyGlobal.prisma.flex_office_system_alerts.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard deletion of the system alert
  await MyGlobal.prisma.flex_office_system_alerts.delete({
    where: { id },
  });
}
