import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Permanently delete a group project by its unique ID.
 *
 * This operation targets the enterprise_lms_group_projects table and requires
 * the 'groupProjectId' UUID path parameter identifying the project to be
 * deleted.
 *
 * Only authorized corporateLearner users may execute this operation.
 *
 * This operation performs a hard delete and returns no content. Deleted data
 * cannot be recovered.
 *
 * Use carefully due to the irreversible nature of the deletion.
 *
 * @param props - Object containing corporateLearner info and groupProjectId
 * @param props.corporateLearner - The authenticated corporate learner user
 * @param props.groupProjectId - UUID of the group project to permanently delete
 * @throws {Error} When the project does not exist or does not belong to the
 *   user
 * @throws {Error} When unauthorized deletion attempt occurs
 */
export async function deleteenterpriseLmsCorporateLearnerGroupProjectsGroupProjectId(props: {
  corporateLearner: CorporatelearnerPayload;
  groupProjectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { corporateLearner, groupProjectId } = props;

  // Fetch the group project, throw if not found
  const project =
    await MyGlobal.prisma.enterprise_lms_group_projects.findUniqueOrThrow({
      where: { id: groupProjectId },
    });

  // Check ownership
  if (project.owner_id !== corporateLearner.id) {
    throw new Error("Unauthorized: You can only delete your own group project");
  }

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_group_projects.delete({
    where: { id: groupProjectId },
  });
}
