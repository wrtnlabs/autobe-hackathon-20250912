import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new task priority level.
 *
 * This operation creates a new record in the task_management_priorities table.
 * The Priority entity defines the priority level of tasks such as Low, Medium,
 * or High, which influences task sorting and alerting within the task
 * management system.
 *
 * Only authorized users with roles capable of managing task priorities can
 * perform this operation.
 *
 * @param props - Object containing TPM user payload and priority creation data.
 * @param props.tpm - Authenticated Technical Project Manager user payload.
 * @param props.body - Priority creation data including code, name, and optional
 *   description.
 * @returns The newly created priority record including all details and
 *   timestamps.
 * @throws {Error} Throws if creation fails, e.g., due to duplicate code.
 */
export async function posttaskManagementTpmTaskManagementPriorities(props: {
  tpm: TpmPayload;
  body: ITaskManagementPriority.ICreate;
}): Promise<ITaskManagementPriority> {
  const { tpm, body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_priorities.create({
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
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
