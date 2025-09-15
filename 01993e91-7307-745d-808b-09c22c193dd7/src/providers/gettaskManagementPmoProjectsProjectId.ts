import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve detailed project information by ID
 *
 * This operation fetches the full details of a project given its UUID
 * identifier. It returns all attributes including owner, code, name,
 * description, and timestamps. Access is restricted to authorized PMO users
 * only.
 *
 * @param props - Object containing authenticated PMO user payload and project
 *   ID to fetch
 * @param props.pmo - Authenticated PMO user payload
 * @param props.projectId - UUID of the project to retrieve
 * @returns The full detailed project entity matching the projectId
 * @throws {Error} Throws if the project does not exist or is soft deleted
 */
export async function gettaskManagementPmoProjectsProjectId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { pmo, projectId } = props;

  // Authorization is handled externally by PMOAuth decorator

  // Fetch project ensuring it is not soft deleted
  const project =
    await MyGlobal.prisma.task_management_projects.findFirstOrThrow({
      where: { id: projectId, deleted_at: null },
    });

  return {
    id: project.id,
    owner_id: project.owner_id,
    code: project.code,
    name: project.name,
    description: project.description ?? null,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
    deleted_at: project.deleted_at ? toISOStringSafe(project.deleted_at) : null,
  };
}
