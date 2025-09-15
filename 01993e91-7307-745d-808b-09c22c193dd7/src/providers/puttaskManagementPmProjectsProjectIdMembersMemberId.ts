import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Updates membership information for a project member identified by {memberId}
 * within a project {projectId}.
 *
 * Enables authorized PM users to update project member details allowing
 * adjustments to project membership attributes and audit metadata as per the
 * ITaskManagementProjectMember.IUpdate schema.
 *
 * @param props - The function argument object containing the PM payload,
 *   project ID, member ID, and update body.
 * @param props.pm - The authenticated PM making the request.
 * @param props.projectId - The UUID of the target project.
 * @param props.memberId - The UUID of the project member to update.
 * @param props.body - The update data conforming to
 *   ITaskManagementProjectMember.IUpdate.
 * @returns The updated project member entity matching
 *   ITaskManagementProjectMember.
 * @throws {Error} Throws if project not found or unauthorized PM.
 */
export async function puttaskManagementPmProjectsProjectIdMembersMemberId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IUpdate;
}): Promise<ITaskManagementProjectMember> {
  const { pm, projectId, memberId, body } = props;

  const project = await MyGlobal.prisma.task_management_projects.findUnique({
    where: { id: projectId },
  });
  if (!project) throw new Error("Project not found");

  if (project.owner_id !== pm.id) {
    throw new Error("Unauthorized: PM does not own the project");
  }

  const updated = await MyGlobal.prisma.task_management_project_members.update({
    where: { id: memberId },
    data: {
      project_id: body.project_id ?? undefined,
      user_id: body.user_id ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    project_id: updated.project_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
