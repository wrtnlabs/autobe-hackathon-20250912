import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Soft delete a developer user by marking the deleted_at timestamp.
 *
 * This operation ensures the developer user exists and is not already deleted.
 * It then sets the deleted_at column to the current timestamp to soft delete.
 *
 * Only authorized PMO users can perform this operation.
 *
 * @param props - Object containing the PMO payload and developer ID
 * @param props.pmo - Authenticated PMO user performing the deletion
 * @param props.id - UUID of the developer to delete
 * @throws {Error} When the developer does not exist or is already deleted
 */
export async function deletetaskManagementPmoTaskManagementDevelopersId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, id } = props;

  // Verify the developer exists and is not already deleted
  await MyGlobal.prisma.task_management_developer.findFirstOrThrow({
    where: {
      id,
      deleted_at: null,
    },
  });

  // Prepare current timestamp
  const now = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.task_management_developer.update({
    where: { id },
    data: {
      deleted_at: now,
    },
  });
}
