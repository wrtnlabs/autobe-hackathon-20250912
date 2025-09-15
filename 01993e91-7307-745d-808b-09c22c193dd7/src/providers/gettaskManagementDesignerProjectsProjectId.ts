import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve detailed project information by projectId for authenticated Designer
 * user.
 *
 * This function fetches a single project entity from the database where the
 * project ID matches the provided projectId and the project is not
 * soft-deleted.
 *
 * Authorization is assumed to be handled by surrounding decorators ensuring
 * that the calling user is an authenticated and authorized Designer.
 *
 * @param props - Object containing the authenticated designer and the projectId
 *   to retrieve
 * @param props.designer - Authenticated DesignerPayload
 * @param props.projectId - Unique identifier of the project (UUID string)
 * @returns The detailed project entity conforming to ITaskManagementProject
 * @throws {Error} Throws if the project with given projectId does not exist or
 *   is deleted
 */
export async function gettaskManagementDesignerProjectsProjectId(props: {
  designer: DesignerPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { projectId } = props;

  const project = await MyGlobal.prisma.task_management_projects.findFirst({
    where: {
      id: projectId,
      deleted_at: null,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

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
