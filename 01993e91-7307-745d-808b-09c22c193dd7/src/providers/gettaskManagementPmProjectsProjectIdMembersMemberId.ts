import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves detailed information about a specific project member within a
 * project.
 *
 * This operation fetches the membership record from the
 * task_management_project_members table where the project_id matches the given
 * projectId and the user_id matches the memberId, ensuring the membership is
 * not soft-deleted (deleted_at is null).
 *
 * Authorization is enforced by requiring a valid PM (Project Manager) payload.
 *
 * @param props - The parameters containing PM payload, projectId, and memberId.
 * @param props.pm - Authenticated PM user payload.
 * @param props.projectId - UUID of the target project.
 * @param props.memberId - UUID of the project member.
 * @returns Detailed membership information conforming to
 *   ITaskManagementProjectMember.
 * @throws {Error} Throws if the specified project member does not exist or is
 *   deleted.
 */
export async function gettaskManagementPmProjectsProjectIdMembersMemberId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProjectMember> {
  const projectMember =
    await MyGlobal.prisma.task_management_project_members.findFirstOrThrow({
      where: {
        project_id: props.projectId,
        user_id: props.memberId,
        deleted_at: null,
      },
    });

  return {
    id: projectMember.id,
    project_id: projectMember.project_id,
    user_id: projectMember.user_id,
    created_at: toISOStringSafe(projectMember.created_at),
    updated_at: toISOStringSafe(projectMember.updated_at),
    deleted_at: projectMember.deleted_at
      ? toISOStringSafe(projectMember.deleted_at)
      : null,
  };
}
