import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a specific member from a project by project ID and member ID.
 *
 * This function performs a hard delete operation, permanently removing the
 * membership record linking the member to the project.
 *
 * @param props - Object containing the TPM user payload and identifiers
 * @param props.tpm - Authenticated TPM user payload
 * @param props.projectId - UUID of the project
 * @param props.memberId - UUID of the member to delete
 * @throws {Error} When the specified member is not found for the project
 */
export async function deletetaskManagementTpmProjectsProjectIdMembersMemberId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, projectId, memberId } = props;

  const projectMember =
    await MyGlobal.prisma.task_management_project_members.findFirst({
      where: {
        project_id: projectId,
        user_id: memberId,
      },
    });

  if (projectMember === null) {
    throw new Error("Member not found");
  }

  await MyGlobal.prisma.task_management_project_members.delete({
    where: { id: projectMember.id },
  });
}
