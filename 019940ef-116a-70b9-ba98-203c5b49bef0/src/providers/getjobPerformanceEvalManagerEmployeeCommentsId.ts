import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Get employee comment details by ID
 *
 * Retrieves a detailed employee comment record by its unique UUID identifier.
 * The result includes the comment content, associated employee ID, evaluation
 * cycle ID, and creation/updating timestamps.
 *
 * Authorization requires the caller to be an authenticated manager.
 *
 * @param props - Parameters including the authenticated manager user and
 *   comment ID
 * @param props.manager - Authenticated manager payload
 * @param props.id - UUID of the employee comment
 * @returns Detailed employee comment information
 * @throws {Error} When the comment does not exist or has been deleted
 */
export async function getjobPerformanceEvalManagerEmployeeCommentsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEmployeeComments> {
  const { manager, id } = props;

  // Retrieve the employee comment by id
  const comment =
    await MyGlobal.prisma.job_performance_eval_employee_comments.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Check soft delete
  if (comment.deleted_at !== null) {
    throw new Error("Employee comment not found or has been deleted.");
  }

  // Return DTO with date fields converted to ISO string
  return {
    id: comment.id,
    employee_id: comment.employee_id,
    evaluation_cycle_id: comment.evaluation_cycle_id,
    comment: comment.comment,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
