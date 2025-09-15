import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieves detailed information of a taskManagementTaskStatus by its unique
 * ID.
 *
 * This endpoint returns full details including code, name, description,
 * created_at, and updated_at timestamps.
 *
 * Authorization: Accessible by authenticated TPM users only.
 *
 * @param props - Object containing TPM user authentication and status ID.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.id - UUID identifier of the taskManagementTaskStatus.
 * @returns The detailed taskManagementTaskStatus record.
 * @throws {Error} Throws if the taskManagementTaskStatus is not found.
 */
export async function gettaskManagementTpmTaskManagementTaskStatusesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatus> {
  const { id } = props;

  const result =
    await MyGlobal.prisma.task_management_task_statuses.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: result.id,
    code: result.code,
    name: result.name,
    description: result.description ?? null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
