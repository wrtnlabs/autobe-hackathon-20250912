import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve detailed information about a developer user specified by their
 * unique ID.
 *
 * This operation returns profile details including email, name, timestamps, and
 * password_hash. The password_hash is included as specified in the DTO for
 * potential internal uses.
 *
 * Authorization is ensured via the authenticated developer payload.
 *
 * @param props - Object containing authenticated developer payload and target
 *   developer ID
 * @param props.developer - Authenticated developer user making the request
 * @param props.id - Unique identifier of the developer to retrieve
 * @returns Detailed information of the developer user
 * @throws {Error} If no developer with the specified ID exists or is soft
 *   deleted
 */
export async function gettaskManagementDeveloperTaskManagementDevelopersId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementDeveloper> {
  const { developer, id } = props;

  const found =
    await MyGlobal.prisma.task_management_developer.findUniqueOrThrow({
      where: {
        id,
        deleted_at: null,
      },
    });

  return {
    id: found.id,
    email: found.email,
    password_hash: found.password_hash,
    name: found.name,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ?? undefined,
  };
}
