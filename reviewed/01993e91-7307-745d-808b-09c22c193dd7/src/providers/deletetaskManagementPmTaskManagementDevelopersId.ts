import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Soft delete a developer user by marking the deleted_at timestamp.
 *
 * This operation is restricted to authorized PM users.
 *
 * @param props - Object containing PM authentication payload and developer ID
 * @param props.pm - The authenticated PM user payload
 * @param props.id - The UUID of the developer user to soft delete
 * @throws {Error} Throws if the developer user does not exist or is already
 *   deleted
 */
export async function deletetaskManagementPmTaskManagementDevelopersId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, id } = props;

  const developer = await MyGlobal.prisma.task_management_developer.findFirst({
    where: { id, deleted_at: null },
  });
  if (!developer) throw new Error("Developer not found or already deleted");

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_developer.update({
    where: { id },
    data: { deleted_at: now },
  });
}
