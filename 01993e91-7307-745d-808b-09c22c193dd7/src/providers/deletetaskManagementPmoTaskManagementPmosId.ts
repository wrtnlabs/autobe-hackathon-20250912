import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Permanently delete a specific Project Management Officer (PMO) user from the
 * database by their unique ID.
 *
 * This operation irreversibly removes the PMO user record and requires
 * authorization with the 'pmo' role.
 *
 * @param props - Object containing the authenticated PMO user and the UUID of
 *   the PMO to delete
 * @param props.pmo - The authenticated PMO payload performing the deletion
 * @param props.id - The UUID of the PMO user to be permanently deleted
 * @throws {Error} Throws if the PMO user with the specified ID does not exist
 */
export async function deletetaskManagementPmoTaskManagementPmosId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, id } = props;

  // Verify existence of the PMO user
  await MyGlobal.prisma.task_management_pmo.findUniqueOrThrow({
    where: { id },
  });

  // Permanently delete the PMO user
  await MyGlobal.prisma.task_management_pmo.delete({
    where: { id },
  });
}
