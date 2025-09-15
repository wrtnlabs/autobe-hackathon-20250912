import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new task priority level.
 *
 * This operation creates a new record in the task_management_priorities table.
 * The Priority entity defines the priority level of tasks such as Low, Medium,
 * or High, which influences task sorting and alerting within the task
 * management system.
 *
 * Only authorized PMO users can perform this operation.
 *
 * @param props - The properties including the authenticated PMO user and the
 *   priority creation data.
 * @param props.pmo - Authenticated PMO user's payload.
 * @param props.body - The data to create a new task priority including code,
 *   name, and optional description.
 * @returns The newly created ITaskManagementPriority record with creation and
 *   update timestamps.
 * @throws {Error} When a priority with the same code already exists.
 */
export async function posttaskManagementPmoTaskManagementPriorities(props: {
  pmo: PmoPayload;
  body: ITaskManagementPriority.ICreate;
}): Promise<ITaskManagementPriority> {
  const { pmo, body } = props;

  const exists = await MyGlobal.prisma.task_management_priorities.findFirst({
    where: { code: body.code },
  });
  if (exists) {
    throw new Error("Priority with the same code already exists");
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_priorities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
