import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update an existing project identified by the projectId path parameter.
 *
 * This operation allows modifying project details such as the owner (a TPM
 * user), unique code, descriptive name, and optional description.
 *
 * The operation ensures data integrity by checking the projectId exists and
 * validates fields according to the schema. It updates the record's timestamps
 * for last modification.
 *
 * Authorization is restricted to users with roles TPM, PM, or PMO, who manage
 * project resources effectively.
 *
 * @param props - Object containing authentication, path parameter, and update
 *   data
 * @param props.pm - The authenticated PM user making the request
 * @param props.projectId - UUID of the target project
 * @param props.body - Partial update data for the project
 * @returns The updated project entity with all fields
 * @throws {Error} Throws if the project with projectId is not found or user
 *   unauthorized
 */
export async function puttaskManagementPmProjectsProjectId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProject.IUpdate;
}): Promise<ITaskManagementProject> {
  const { pm, projectId, body } = props;

  // Verify project exists and is not soft-deleted
  await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
    where: {
      id: projectId,
      deleted_at: null,
    },
  });

  // Prepare data for update
  const updated = await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: {
      owner_id: body.owner_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    owner_id: updated.owner_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
