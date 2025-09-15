import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new project member
 *
 * Associates a user with the specified project by creating a record in the
 * task_management_project_members table.
 *
 * @param props - Object containing tpm authorization, projectId parameter, and
 *   the project member creation data.
 * @param props.tpm - The authenticated Technical Project Manager user.
 * @param props.projectId - UUID of the project to add the member to.
 * @param props.body - Data conforming to ITaskManagementProjectMember.ICreate,
 *   including project_id, user_id, created_at, updated_at, and optional
 *   deleted_at.
 * @returns The created project member entity with all date fields serialized to
 *   ISO 8601 strings.
 * @throws {Error} If projectId parameter does not match body.project_id.
 * @throws {Error} For database errors such as duplicate memberships.
 */
export async function posttaskManagementTpmProjectsProjectIdMembers(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.ICreate;
}): Promise<ITaskManagementProjectMember> {
  const { tpm, projectId, body } = props;

  if (projectId !== body.project_id) {
    throw new Error("projectId parameter must match body.project_id");
  }

  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_project_members.create({
    data: {
      id: newId,
      project_id: body.project_id,
      user_id: body.user_id,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: body.deleted_at ?? null,
    },
  });

  return {
    id: created.id,
    project_id: created.project_id,
    user_id: created.user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
