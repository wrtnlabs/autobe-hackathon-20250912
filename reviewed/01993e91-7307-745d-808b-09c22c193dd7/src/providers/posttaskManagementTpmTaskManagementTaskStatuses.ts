import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new taskManagementTaskStatus record.
 *
 * This function creates a new task status entity in the system, requiring a
 * unique code, a human-readable name, and an optional description. Only
 * authorized TPM users may create new statuses. It automatically assigns UUID
 * and timestamps and returns the complete created record.
 *
 * @param props - The function parameters including the authenticated TPM user
 *   and the create payload
 * @param props.tpm - Authenticated Technical Project Manager performing the
 *   create operation
 * @param props.body - The create payload containing code, name, and optional
 *   description
 * @returns The newly created taskManagementTaskStatus record
 * @throws Prisma.PrismaClientKnownRequestError if creation violates database
 *   constraints, such as code uniqueness
 */
export async function posttaskManagementTpmTaskManagementTaskStatuses(props: {
  tpm: TpmPayload;
  body: ITaskManagementTaskStatus.ICreate;
}): Promise<ITaskManagementTaskStatus> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

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
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
