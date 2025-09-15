import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Get taskManagementTaskStatus details by ID
 *
 * This operation retrieves detailed information about a single
 * taskManagementTaskStatus identified by its UUID from the
 * task_management_task_statuses table. It returns complete information
 * including code, name, description, creation, and update timestamps. This
 * supports client interfaces needing detailed workflow status data.
 *
 * Only authenticated PMO users can perform this operation.
 *
 * @param props - Object containing PMO payload and the target task status ID
 * @param props.pmo - Authenticated PMO user's payload
 * @param props.id - Unique UUID identifier for the taskManagementTaskStatus
 * @returns The detailed taskManagementTaskStatus record
 * @throws {Error} Throws an error if no record with the given ID exists
 */
export async function gettaskManagementPmoTaskManagementTaskStatusesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatus> {
  const { id } = props;

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
