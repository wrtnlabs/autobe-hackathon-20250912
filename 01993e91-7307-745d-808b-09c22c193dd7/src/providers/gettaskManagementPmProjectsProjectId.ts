import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve detailed project information by ID.
 *
 * This function fetches the full details of the specified project from the
 * task_management_projects table. It returns all properties including owner,
 * code, name, description, creation, update, and deletion timestamps.
 *
 * Only authorized PM users can access this information.
 *
 * @param props - The properties object containing PM user info and projectId.
 * @param props.pm - The authenticated Project Manager payload.
 * @param props.projectId - The UUID string identifier of the project.
 * @returns The detailed project entity, including all fields as per the schema.
 * @throws {Error} Throws if the project with the given ID does not exist.
 */
export async function gettaskManagementPmProjectsProjectId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { pm, projectId } = props;

  // Authorization is handled externally before calling this provider.

  const project =
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: projectId },
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
