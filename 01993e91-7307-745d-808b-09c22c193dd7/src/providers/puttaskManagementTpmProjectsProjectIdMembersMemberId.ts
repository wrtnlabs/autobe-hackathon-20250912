import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates membership information for a project member within a project.
 *
 * Allows authorized TPM users to update project member details including
 * project association, user association, and soft deletion status.
 *
 * @param props - Object containing tpm payload, projectId, memberId, and update
 *   body
 * @param props.tpm - Authenticated TPM user's payload
 * @param props.projectId - UUID of the target project
 * @param props.memberId - UUID of the project member to update
 * @param props.body - Update data conforming to
 *   ITaskManagementProjectMember.IUpdate schema
 * @returns Updated project member entity
 * @throws {Error} Throws if the project member does not exist
 */
export async function puttaskManagementTpmProjectsProjectIdMembersMemberId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IUpdate;
}): Promise<ITaskManagementProjectMember> {
  const { tpm, projectId, memberId, body } = props;

  const existingMember =
    await MyGlobal.prisma.task_management_project_members.findFirstOrThrow({
      where: { id: memberId, project_id: projectId },
    });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.task_management_project_members.update({
    where: { id: memberId },
    data: {
      project_id: body.project_id === undefined ? undefined : body.project_id,
      user_id: body.user_id === undefined ? undefined : body.user_id,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    project_id: updated.project_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
