import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new project entity in the system.
 *
 * This operation allows an authorized PMO user to create a project with the
 * required attributes including owner_id, unique code, name, and optional
 * description.
 *
 * The function generates a unique UUID for the project, sets current
 * timestamps, and persists the data via Prisma client.
 *
 * @param props - Object containing the PMO payload and the project creation
 *   body.
 * @param props.pmo - Authenticated PMO payload with user id and role
 *   information.
 * @param props.body - Project creation data including owner_id, code, name, and
 *   optional description.
 * @returns The newly created project entity with all properties including
 *   timestamps and deletion status.
 * @throws {Error} Will throw an error if the creation fails due to database or
 *   validation reasons.
 */
export async function posttaskManagementPmoProjects(props: {
  pmo: PmoPayload;
  body: ITaskManagementProject.ICreate;
}): Promise<ITaskManagementProject> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_projects.create({
    data: {
      id,
      owner_id: props.body.owner_id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    owner_id: created.owner_id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
