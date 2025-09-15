import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Get taskManagementTaskStatus details by ID
 *
 * Retrieves detailed information of a specific taskManagementTaskStatus from
 * the database by its unique UUID. Only authenticated QA users can perform this
 * operation. Throws an error if the record is not found.
 *
 * @param props - Object containing the authenticated QA user and the target
 *   taskManagementTaskStatus ID
 * @param props.qa - Authenticated QA user payload
 * @param props.id - Unique UUID identifier for the target
 *   taskManagementTaskStatus
 * @returns Detailed taskManagementTaskStatus record matching the ID
 * @throws {Error} When the taskManagementTaskStatus with the given ID does not
 *   exist
 */
export async function gettaskManagementQaTaskManagementTaskStatusesId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatus> {
  const { qa, id } = props;

  const record =
    await MyGlobal.prisma.task_management_task_statuses.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
