import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a member association from a specific project by project ID and member
 * ID.
 *
 * This operation permanently removes the membership record from the
 * task_management_project_members table, revoking the member's access and
 * participation in the project.
 *
 * @param props - Object containing the authenticated PMO user and identifiers
 * @param props.pmo - The authenticated PMO user performing the deletion
 * @param props.projectId - Unique UUID string identifying the target project
 * @param props.memberId - Unique UUID string identifying the member to remove
 * @throws {Error} Throws an error if the specified project member does not
 *   exist or does not belong to the given project
 */
export async function deletetaskManagementPmoProjectsProjectIdMembersMemberId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const member =
    await MyGlobal.prisma.task_management_project_members.findUnique({
      where: { id: props.memberId },
    });

  if (!member || member.project_id !== props.projectId) {
    throw new Error(
      `Project member not found for project ID ${props.projectId} and member ID ${props.memberId}`,
    );
  }

  await MyGlobal.prisma.task_management_project_members.delete({
    where: { id: props.memberId },
  });
}
