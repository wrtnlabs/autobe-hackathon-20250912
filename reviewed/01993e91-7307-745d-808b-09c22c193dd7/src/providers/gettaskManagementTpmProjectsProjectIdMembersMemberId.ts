import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve detailed information of a specific project member.
 *
 * This operation fetches a project member record identified by memberId within
 * the specified projectId. It ensures the membership exists and has not been
 * soft deleted (deleted_at is null). Access control requires authenticated TPM
 * users.
 *
 * @param props - Object containing tpm payload, projectId, and memberId
 * @param props.tpm - Authenticated TPM user payload
 * @param props.projectId - UUID of the target project
 * @param props.memberId - UUID of the project member to retrieve
 * @returns Detailed project member information conforming to
 *   ITaskManagementProjectMember
 * @throws {Error} Throws if the project member is not found or access is
 *   invalid
 */
export async function gettaskManagementTpmProjectsProjectIdMembersMemberId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementProjectMember> {
  const { tpm, projectId, memberId } = props;

  const membership =
    await MyGlobal.prisma.task_management_project_members.findFirstOrThrow({
      where: {
        id: memberId,
        project_id: projectId,
        deleted_at: null,
      },
    });

  return {
    id: membership.id,
    project_id: membership.project_id,
    user_id: membership.user_id,
    created_at: toISOStringSafe(membership.created_at),
    updated_at: toISOStringSafe(membership.updated_at),
    deleted_at: membership.deleted_at
      ? toISOStringSafe(membership.deleted_at)
      : null,
  };
}
