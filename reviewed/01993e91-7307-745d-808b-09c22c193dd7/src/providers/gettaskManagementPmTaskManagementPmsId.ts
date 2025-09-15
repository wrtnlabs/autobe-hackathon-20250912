import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves detailed information of a specific Project Manager (PM) by unique
 * ID.
 *
 * This function requires the caller to be authorized as a PM. It fetches the PM
 * entity from the database only if the record exists and is not soft-deleted.
 *
 * @param props - An object containing the pm authorization payload and the PM's
 *   unique ID.
 * @param props.pm - The authenticated PM payload performing the operation.
 * @param props.id - The UUID of the Project Manager to retrieve.
 * @returns The detailed information of the specified Project Manager.
 * @throws {Error} Throws an error if the PM record is not found or is
 *   soft-deleted.
 */
export async function gettaskManagementPmTaskManagementPmsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementPm> {
  const pmRecord = await MyGlobal.prisma.task_management_pm.findUniqueOrThrow({
    where: { id: props.id, deleted_at: null },
  });

  return {
    id: pmRecord.id,
    email: pmRecord.email,
    password_hash: pmRecord.password_hash,
    name: pmRecord.name,
    created_at: toISOStringSafe(pmRecord.created_at),
    updated_at: toISOStringSafe(pmRecord.updated_at),
    deleted_at: pmRecord.deleted_at
      ? toISOStringSafe(pmRecord.deleted_at)
      : null,
  };
}
