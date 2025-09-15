import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Permanently delete a designer user.
 *
 * This operation permanently removes a user from the `task_management_designer`
 * table. It requires the unique designer user ID as a parameter.
 *
 * Only users with administrative privileges should perform this operation.
 * Attempts to delete a non-existent user will cause an error.
 *
 * @param props - Object containing the designer payload and the target user ID
 * @param props.designer - The authenticated designer performing the delete
 * @param props.id - Unique identifier of the designer user to delete
 * @throws {Error} Throws if designer with the given ID does not exist
 */
export async function deletetaskManagementDesignerTaskManagementDesignersId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { designer, id } = props;

  // Validate existence - throws if not found
  await MyGlobal.prisma.task_management_designer.findUniqueOrThrow({
    where: { id },
  });

  // Proceed with hard delete
  await MyGlobal.prisma.task_management_designer.delete({
    where: { id },
  });
}
