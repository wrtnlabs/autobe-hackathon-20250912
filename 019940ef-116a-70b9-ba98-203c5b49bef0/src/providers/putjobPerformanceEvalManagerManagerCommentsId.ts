import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a manager comment by ID
 *
 * This operation updates the text content of a manager comment identified by
 * its ID. Only the comment's author (manager) can update it. The updated_at
 * timestamp is refreshed and dates are returned as ISO 8601 strings with proper
 * branding.
 *
 * @param props - Object containing authentication, comment ID, and update body
 * @param props.manager - The authenticated manager performing the update
 * @param props.id - UUID of the comment to update
 * @param props.body - Updated comment data (partial)
 * @returns The updated manager comment record
 * @throws {Error} When the comment does not exist or the user is unauthorized
 */
export async function putjobPerformanceEvalManagerManagerCommentsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalManagerComments.IUpdate;
}): Promise<IJobPerformanceEvalManagerComments> {
  const { manager, id, body } = props;

  // Fetch existing comment by ID or throw if not found
  const existing =
    await MyGlobal.prisma.job_performance_eval_manager_comments.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Authorization check
  if (existing.manager_id !== manager.id) {
    throw new Error(
      "Unauthorized: You can only update your own manager comments",
    );
  }

  // Perform update
  const updated =
    await MyGlobal.prisma.job_performance_eval_manager_comments.update({
      where: { id },
      data: {
        manager_id: body.manager_id ?? undefined,
        evaluation_cycle_id: body.evaluation_cycle_id ?? undefined,
        comment: body.comment ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated record with proper ISO string date conversion
  return {
    id: updated.id,
    manager_id: updated.manager_id,
    evaluation_cycle_id: updated.evaluation_cycle_id,
    comment: updated.comment,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
