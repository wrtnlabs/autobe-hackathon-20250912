import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new project member.
 *
 * This function associates a user with a project by creating a new membership
 * record in the task_management_project_members table. It requires
 * authorization via the 'pm' role.
 *
 * @param props - Object containing pm payload, projectId path parameter, and
 *   request body adhering to ITaskManagementProjectMember.ICreate.
 * @param props.pm - Authenticated Project Manager payload.
 * @param props.projectId - UUID of the target project to which the user will be
 *   added.
 * @param props.body - The create input payload for the project member.
 * @returns The newly created project member object.
 * @throws {Error} Throws if the project member creation fails or database
 *   errors occur.
 */
export async function posttaskManagementPmProjectsProjectIdMembers(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.ICreate;
}): Promise<ITaskManagementProjectMember> {
  const { pm, projectId, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_project_members.create({
    data: {
      id,
      project_id: projectId,
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
