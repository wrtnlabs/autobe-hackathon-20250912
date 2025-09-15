import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve detailed information about a specified QA user by their UUID.
 *
 * This operation fetches the QA user from the task_management_qa table and
 * returns their email, name, hashed password, and timestamps including soft
 * deletion date. Authorization is handled outside this function.
 *
 * @param props - Object containing the PMO authentication payload and the QA
 *   user UUID.
 * @param props.pmo - The authenticated PMO payload for authorization checks.
 * @param props.id - The UUID of the QA user to retrieve.
 * @returns The detailed QA user entity matching the given UUID.
 * @throws {Error} Throws if the QA user does not exist.
 */
export async function gettaskManagementPmoTaskManagementQasId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementQa> {
  const { id } = props;

  const qaUser = await MyGlobal.prisma.task_management_qa.findUniqueOrThrow({
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
    id: qaUser.id,
    email: qaUser.email,
    password_hash: qaUser.password_hash,
    name: qaUser.name,
    created_at: toISOStringSafe(qaUser.created_at),
    updated_at: toISOStringSafe(qaUser.updated_at),
    deleted_at: qaUser.deleted_at ? toISOStringSafe(qaUser.deleted_at) : null,
  };
}
