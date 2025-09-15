import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new project member record linking a user to a project.
 *
 * Allows authorized PMO users to add members to a project. Validates
 * consistency of the project ID between URL parameter and request body.
 * Generates a new UUID for the membership record.
 *
 * @param props - Object containing PMO authentication payload, project ID, and
 *   the project member creation data.
 * @returns The newly created project member entity with all timestamps
 *   converted to ISO strings and nullable fields handled properly.
 * @throws {Error} When the project ID in the body does not match the URL
 *   parameter.
 */
export async function posttaskManagementPmoProjectsProjectIdMembers(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.ICreate;
}): Promise<ITaskManagementProjectMember> {
  const { pmo, projectId, body } = props;

  if (body.project_id !== projectId) {
    throw new Error("Project ID mismatch");
  }

  const created = await MyGlobal.prisma.task_management_project_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      project_id: projectId,
      user_id: body.user_id,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    project_id: created.project_id as string & tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
