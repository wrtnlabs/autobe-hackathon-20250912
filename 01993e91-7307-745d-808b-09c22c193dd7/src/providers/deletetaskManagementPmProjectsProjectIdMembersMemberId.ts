import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete a specific member from a project by project ID and member ID.
 *
 * This function removes the membership record linking a user to a project. It
 * verifies that the PM user owns the project before allowing deletion.
 *
 * @param props - Object containing pm authentication payload, project ID, and
 *   member ID.
 * @param props.pm - The authenticated Project Manager performing the operation.
 * @param props.projectId - The UUID of the project from which to remove the
 *   member.
 * @param props.memberId - The UUID of the membership record representing the
 *   member to remove.
 * @throws {Error} Throws if the project is not found.
 * @throws {Error} Throws if the authenticated PM does not own the project.
 * @throws {Error} Throws if the project member record is not found.
 * @throws {Error} Throws if the member does not belong to the specified
 *   project.
 */
export async function deletetaskManagementPmProjectsProjectIdMembersMemberId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, projectId, memberId } = props;

  // Verify project ownership by PM
  const project = await MyGlobal.prisma.task_management_projects.findUnique({
    where: { id: projectId },
  });
  if (!project) throw new Error("Project not found");
  if (project.owner_id !== pm.id)
    throw new Error("Unauthorized: only project owner can remove members");

  // Verify project member exists and belongs to the project
  const member =
    await MyGlobal.prisma.task_management_project_members.findUnique({
      where: { id: memberId },
    });
  if (!member) throw new Error("Project member not found");
  if (member.project_id !== projectId)
    throw new Error("Invalid member for given project");

  // Perform hard delete
  await MyGlobal.prisma.task_management_project_members.delete({
    where: { id: memberId },
  });
}
