import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a specific task status record in task_management_task_statuses.
 *
 * This endpoint allows POL project management officer (PMO) to update the task
 * status identified by UUID. Updates code, name, and optional description with
 * uniqueness validation on code.
 *
 * @param props - Object containing PMO auth info, status id, and update body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.id - UUID of the task status record to update
 * @param props.body - Object with optional code, name, and description to
 *   update
 * @returns Updated task status record with timestamps
 * @throws Error when record not found or on DB operation failure
 */
export async function puttaskManagementPmoTaskManagementTaskStatusesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatuses.IUpdate;
}): Promise<ITaskManagementTaskStatuses> {
  const { pmo, id, body } = props;

  const data: {
    code?: string | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
  } = {};

  if (body.code !== undefined) {
    data.code = body.code === null ? undefined : body.code;
  }

  if (body.name !== undefined) {
    data.name = body.name === null ? undefined : body.name;
  }

  if (body.description !== undefined) {
    data.description = body.description;
  }

  const updated = await MyGlobal.prisma.task_management_task_statuses.update({
    where: { id },
    data,
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
