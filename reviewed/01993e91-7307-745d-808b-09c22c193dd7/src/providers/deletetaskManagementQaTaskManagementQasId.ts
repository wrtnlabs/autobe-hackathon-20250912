import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Permanently deletes a QA user from the task_management_qa table by ID.
 *
 * This operation requires the caller to be authorized as a QA user. It first
 * ensures the QA user exists and is not soft-deleted. Then it performs a hard
 * delete, removing the record irreversibly.
 *
 * @param props - An object containing the authenticated QA payload and the ID
 *   of the QA user to delete.
 * @param props.qa - The authenticated QA user performing the deletion.
 * @param props.id - UUID of the QA user to be deleted.
 * @throws {Error} Throws an error if the QA user does not exist or is already
 *   deleted.
 */
export async function deletetaskManagementQaTaskManagementQasId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { qa, id } = props;

  const existingQa = await MyGlobal.prisma.task_management_qa.findFirst({
    where: { id, deleted_at: null },
  });

  if (!existingQa) throw new Error("QA user not found");

  await MyGlobal.prisma.task_management_qa.delete({ where: { id } });
}
