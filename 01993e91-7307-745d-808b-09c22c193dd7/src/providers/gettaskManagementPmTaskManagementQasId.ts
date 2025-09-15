import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Get QA user details by UUID
 *
 * This function retrieves detailed information about a single QA user by their
 * unique identifier in the task management system. It fetches the user's email,
 * name, creation and update timestamps, and soft deletion timestamp if
 * applicable.
 *
 * Access control is managed by the PM role indicated in the props.
 *
 * @param props - An object containing the pm authorization payload and the QA
 *   user ID
 * @param props.pm - Authenticated PM user payload
 * @param props.id - The UUID of the QA user
 * @returns The QA user details conforming to ITaskManagementQa interface
 * @throws Will throw if the QA user does not exist
 */
export async function gettaskManagementPmTaskManagementQasId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementQa> {
  const { pm, id } = props;

  const qa = await MyGlobal.prisma.task_management_qa.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      password_hash: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: qa.id,
    email: qa.email,
    password_hash: qa.password_hash,
    name: qa.name,
    created_at: toISOStringSafe(qa.created_at),
    updated_at: toISOStringSafe(qa.updated_at),
    deleted_at: qa.deleted_at ? toISOStringSafe(qa.deleted_at) : undefined,
  };
}
