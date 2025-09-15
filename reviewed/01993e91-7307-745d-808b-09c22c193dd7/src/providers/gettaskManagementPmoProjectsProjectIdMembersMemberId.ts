import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves detailed information for a project member specified by memberId
 * within projectId.
 *
 * Access is restricted to authorized PMO users.
 *
 * @param props - Request props containing pmo, projectId, and memberId
 * @param props.pmo - Authenticated PMO user
 * @param props.projectId - UUID of the project
 * @param props.memberId - UUID of the project member
 * @returns Detailed project member information as ITaskManagementProjectMember
 * @throws {Error} If no matching project member is found
 */
export async function gettaskManagementPmoProjectsProjectIdMembersMemberId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProjectMember> {
  const { pmo, projectId, memberId } = props;

  const member =
    await MyGlobal.prisma.task_management_project_members.findFirstOrThrow({
      where: {
        id: memberId,
        project_id: projectId,
        deleted_at: null,
      },
    });

  return {
    id: member.id,
    project_id: member.project_id,
    user_id: member.user_id,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
