import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Deletes a Project Manager user by their unique identifier.
 *
 * This operation permanently removes the PM record from the database. Only
 * authorized users with the 'pm' role can perform this action.
 *
 * @param props - Object containing the authenticated PM user and the ID of the
 *   PM to delete
 * @param props.pm - The authenticated PM payload performing the deletion
 * @param props.id - The UUID of the Project Manager user to delete
 * @returns Void
 * @throws {Error} Throws an error if the PM user with the specified ID does not
 *   exist
 */
export async function deletetaskManagementPmTaskManagementPmsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  await MyGlobal.prisma.task_management_pm.findUniqueOrThrow({
    where: { id },
  });

  await MyGlobal.prisma.task_management_pm.delete({
    where: { id },
  });
}
