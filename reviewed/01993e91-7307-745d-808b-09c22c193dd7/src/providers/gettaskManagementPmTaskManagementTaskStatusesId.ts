import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Get taskManagementTaskStatus details by ID
 *
 * Retrieves detailed information of a taskManagementTaskStatus by its unique
 * UUID.
 *
 * Only authenticated PM users can access this information. Throws an error if
 * the specified ID does not exist.
 *
 * @param props - Object containing the PM payload and task status UUID
 * @param props.pm - Authenticated PM user payload
 * @param props.id - Unique UUID identifier for the target
 *   taskManagementTaskStatus
 * @returns The detailed taskManagementTaskStatus record
 * @throws {Error} Throws if the taskManagementTaskStatus with given ID is not
 *   found
 */
export async function gettaskManagementPmTaskManagementTaskStatusesId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatus> {
  const { id } = props;

  const taskStatus =
    await MyGlobal.prisma.task_management_task_statuses.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: taskStatus.id,
    code: taskStatus.code,
    name: taskStatus.name,
    description: taskStatus.description ?? null,
    created_at: toISOStringSafe(taskStatus.created_at),
    updated_at: toISOStringSafe(taskStatus.updated_at),
  };
}
