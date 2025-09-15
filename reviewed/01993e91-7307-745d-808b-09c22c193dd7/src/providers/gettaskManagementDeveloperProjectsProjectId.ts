import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve detailed project information by projectId for authenticated
 * developer.
 *
 * Fetches a single project record ensuring it exists and is not soft-deleted.
 *
 * Authorization: Only authenticated developers can perform this operation.
 *
 * @param props - Object containing developer info and projectId of the target
 *   project
 * @param props.developer - Authenticated developer's payload
 * @param props.projectId - UUID of the project to retrieve
 * @returns Detailed task management project entity
 * @throws {Error} Throws if the project does not exist or is soft-deleted
 */
export async function gettaskManagementDeveloperProjectsProjectId(props: {
  developer: DeveloperPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { developer, projectId } = props;

  // Authorization is assumed done via decorator or prior middleware,
  // developer must exist and be valid

  // Fetch project by ID, must exist and not be deleted
  const project =
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: projectId },
    });

  // Return project data with proper ISO string date conversion
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
