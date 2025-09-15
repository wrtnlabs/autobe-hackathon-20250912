import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new project entity in the system.
 *
 * This operation allows a PM user to create a new project by specifying the
 * owner, unique project code, name, and optional description.
 *
 * The function generates a new UUID for the project ID, assigns timestamps, and
 * persists the record.
 *
 * @param props - Object containing PM user authorization payload and project
 *   creation data
 * @param props.pm - Authenticated PM user information
 * @param props.body - Project creation details conforming to
 *   ITaskManagementProject.ICreate
 * @returns The newly created project entity including generated ID and
 *   timestamps
 * @throws {Error} If creation fails due to database or validation errors
 */
export async function posttaskManagementPmProjects(props: {
  pm: PmPayload;
  body: ITaskManagementProject.ICreate;
}): Promise<ITaskManagementProject> {
  const { pm, body } = props;

  // Generate a new UUID for the project ID
  const id = v4() as string & tags.Format<"uuid">;

  // Generate current timestamps
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_projects.create({
    data: {
      id,
      owner_id: body.owner_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    owner_id: created.owner_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
