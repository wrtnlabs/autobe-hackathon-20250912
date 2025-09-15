import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve detailed project information by projectId.
 *
 * This operation fetches a single project from the database identified by the
 * projectId. It ensures that the requesting TPM user is the owner of the
 * project. Returns all project properties including owner, code, name,
 * description, and audited timestamps.
 *
 * @param props - Object containing the TPM user payload and the projectId to
 *   retrieve.
 * @param props.tpm - The authenticated TPM user payload.
 * @param props.projectId - UUID string identifying the project to retrieve.
 * @returns The detailed project entity matching the projectId.
 * @throws {Error} When the project does not exist or is soft deleted.
 * @throws {Error} When the TPM user is not authorized as the project owner.
 */
export async function gettaskManagementTpmProjectsProjectId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { tpm, projectId } = props;

  const project = await MyGlobal.prisma.task_management_projects.findFirst({
    where: {
      id: projectId,
      deleted_at: null,
    },
  });

  if (!project) throw new Error("Project not found or deleted");

  if (project.owner_id !== tpm.id)
    throw new Error(
      "Unauthorized access: You are not the owner of this project",
    );

  return {
    id: project.id,
    owner_id: project.owner_id,
    code: project.code,
    name: project.name,
    description: project.description ?? null,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
    deleted_at: project.deleted_at
      ? toISOStringSafe(project.deleted_at)
      : undefined,
  };
}
