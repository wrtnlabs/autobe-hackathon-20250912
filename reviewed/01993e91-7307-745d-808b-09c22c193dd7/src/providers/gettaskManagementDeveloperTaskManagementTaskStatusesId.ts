import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get taskManagementTaskStatus details by ID.
 *
 * Retrieves detailed information of a taskManagementTaskStatus by its unique
 * ID. Only authenticated developers can access this information. Throws an
 * error if the task status is not found.
 *
 * @param props - Object containing developer payload and task status ID
 * @param props.developer - Authenticated developer payload
 * @param props.id - UUID of the target taskManagementTaskStatus
 * @returns Detailed taskManagementTaskStatus record
 * @throws {Error} When taskManagementTaskStatus with id is not found
 */
export async function gettaskManagementDeveloperTaskManagementTaskStatusesId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatus> {
  const { developer, id } = props;
  const record = await MyGlobal.prisma.task_management_task_statuses.findUnique(
    {
      where: { id },
    },
  );
  if (!record) throw new Error("TaskManagementTaskStatus not found");

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
