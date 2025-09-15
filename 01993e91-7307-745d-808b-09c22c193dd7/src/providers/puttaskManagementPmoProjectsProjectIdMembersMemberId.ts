import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Updates membership information for a project member identified by {memberId}
 * within a project {projectId}.
 *
 * Enables authorized PMO users to modify project member details such as
 * associated project, user, and deletion status. Returns the updated project
 * member entity with all relevant audit timestamps.
 *
 * @param props - Object containing PMO authentication, project ID, member ID,
 *   and update body
 * @param props.pmo - Authenticated PMO user performing the update
 * @param props.projectId - UUID string of the target project
 * @param props.memberId - UUID string of the project member to update
 * @param props.body - Update data conforming to
 *   ITaskManagementProjectMember.IUpdate
 * @returns Updated project member object
 * @throws {Error} When the specified project member does not exist
 */
export async function puttaskManagementPmoProjectsProjectIdMembersMemberId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IUpdate;
}): Promise<ITaskManagementProjectMember> {
  const { pmo, projectId, memberId, body } = props;

  // Verify project member exists
  const existingMember =
    await MyGlobal.prisma.task_management_project_members.findUnique({
      where: { id: memberId },
    });
  if (!existingMember) throw new Error("Project member not found");

  // Prepare update data, skipping undefined fields, setting null explicitly
  const updateData = {
    project_id:
      body.project_id === null ? null : (body.project_id ?? undefined),
    user_id: body.user_id === null ? null : (body.user_id ?? undefined),
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.task_management_project_members.update({
    where: { id: memberId },
    data: updateData,
  });

  // Return updated project member with ISO date strings
  return {
    id: updated.id,
    project_id: updated.project_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
