import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new taskManagementTaskStatus record.
 *
 * This endpoint allows authorized PM users to add new task statuses to extend
 * the task workflow by providing a unique code, a human-readable name, and an
 * optional description.
 *
 * @param props - Object containing the PM payload and task status creation data
 * @param props.pm - Authenticated PM user payload performing the creation
 * @param props.body - Task status creation data including code, name, and
 *   optional description
 * @returns The created taskManagementTaskStatus record including timestamps
 * @throws {Error} Throws an error if the creation fails due to uniqueness or
 *   validation violations
 */
export async function posttaskManagementPmTaskManagementTaskStatuses(props: {
  pm: PmPayload;
  body: ITaskManagementTaskStatus.ICreate;
}): Promise<ITaskManagementTaskStatus> {
  const { pm, body } = props;

  // Generate current timestamp safely for date-time fields
  const now = toISOStringSafe(new Date());
  // Generate a new UUID for the record ID
  const id = v4() as string & tags.Format<"uuid">;

  // Create the new record in the database
  const created = await MyGlobal.prisma.task_management_task_statuses.create({
    data: {
      id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created record with proper date conversions
  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
