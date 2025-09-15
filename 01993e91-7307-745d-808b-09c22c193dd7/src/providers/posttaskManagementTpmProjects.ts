import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Creates a new project entity in the system.
 *
 * This operation allows authorized TPM users to create projects by providing
 * necessary project details such as owner_id, unique code, name, and optional
 * description.
 *
 * @param props - The properties object containing the TPM user info and the
 *   request body data for project creation.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.body - Project creation data conforming to
 *   ITaskManagementProject.ICreate.
 * @returns The newly created project entity with all standard fields including
 *   id, timestamps, and soft deletion marker.
 * @throws {Error} Throws error if project creation fails or unauthorized access
 *   occurs.
 */
export async function posttaskManagementTpmProjects(props: {
  tpm: TpmPayload;
  body: ITaskManagementProject.ICreate;
}): Promise<ITaskManagementProject> {
  const { tpm, body } = props;

  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_projects.create({
    data: {
      id,
      owner_id: body.owner_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    owner_id: created.owner_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
