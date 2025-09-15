import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve detailed project information by ID for QA users.
 *
 * This function fetches a project identified by the provided projectId,
 * ensuring it is not soft-deleted. It returns all project fields including
 * owner, code, name, optional description, and timestamps.
 *
 * Authorization is assumed validated by the qa payload.
 *
 * @param props - Object containing the QA user payload and the UUID of the
 *   project to retrieve.
 * @param props.qa - Authenticated QA user information.
 * @param props.projectId - UUID string identifying the project.
 * @returns The full project record matching the given projectId, excluding soft
 *   deleted projects.
 * @throws {Error} Throws if the project does not exist or is soft deleted.
 */
export async function gettaskManagementQaProjectsProjectId(props: {
  qa: QaPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProject> {
  const { projectId } = props;

  const result =
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: projectId, deleted_at: null },
    });

  return {
    id: result.id,
    owner_id: result.owner_id,
    code: result.code,
    name: result.name,
    description: result.description ?? null,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
