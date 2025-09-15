import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new taskManagementTaskStatus record.
 *
 * This operation creates a new taskManagementTaskStatus with a unique code,
 * name, and optional description. Only authorized PMO users can perform this.
 * The system enforces uniqueness of the code and returns the full created
 * record including timestamps.
 *
 * @param props - Object containing PMO payload and creation data
 * @param props.pmo - Authenticated PMO user payload
 * @param props.body - Data for creating a new taskManagementTaskStatus
 * @returns The complete created taskManagementTaskStatus record
 * @throws {Error} When the code is not unique or Prisma client errors occur
 */
export async function posttaskManagementPmoTaskManagementTaskStatuses(props: {
  pmo: PmoPayload;
  body: ITaskManagementTaskStatus.ICreate;
}): Promise<ITaskManagementTaskStatus> {
  const { pmo, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

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

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: now,
    updated_at: now,
  };
}
