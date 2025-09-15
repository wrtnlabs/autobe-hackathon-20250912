import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates an existing project record identified by projectId.
 *
 * This operation modifies project details like owner, code, name, and
 * description and updates the last modification timestamp.
 *
 * Authorization is expected to be handled externally.
 *
 * @param props - The request properties including the authenticated TPM user,
 *   projectId (UUID), and update body with project details.
 * @returns The updated project record with full details including audit
 *   timestamps.
 * @throws {Error} Throws if the project with the given projectId does not
 *   exist.
 */
export async function puttaskManagementTpmProjectsProjectId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProject.IUpdate;
}): Promise<ITaskManagementProject> {
  const { tpm, projectId, body } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
    where: { id: projectId },
  });

  const updated = await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: {
      owner_id: body.owner_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      updated_at: now,
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
