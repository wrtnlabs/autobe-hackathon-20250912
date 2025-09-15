import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a manager comment for evaluation cycle
 *
 * This function creates a new record in the
 * job_performance_eval_manager_comments table. It requires an authenticated
 * manager and a body including evaluation cycle and comment. The function
 * generates a new UUID and timestamps for created_at and updated_at fields.
 * Soft deletion field is nullable and omitted on create.
 *
 * @param props - Object containing manager authentication and comment creation
 *   body
 * @param props.manager - Authenticated manager performing the operation
 * @param props.body - Comment creation data matching
 *   IJobPerformanceEvalManagerComments.ICreate
 * @returns Created manager comment record conforming to
 *   IJobPerformanceEvalManagerComments
 * @throws Error if database operation fails or required fields are missing
 */
export async function postjobPerformanceEvalManagerManagerComments(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManagerComments.ICreate;
}): Promise<IJobPerformanceEvalManagerComments> {
  const { manager, body } = props;

  // Generate new UUID for the comment id
  const newId = v4() as string & tags.Format<"uuid">;

  // Generate current ISO timestamp
  const now = toISOStringSafe(new Date());

  // Create new manager comment record
  const created =
    await MyGlobal.prisma.job_performance_eval_manager_comments.create({
      data: {
        id: newId,
        manager_id: manager.id,
        evaluation_cycle_id: body.evaluation_cycle_id,
        comment: body.comment,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    manager_id: created.manager_id,
    evaluation_cycle_id: created.evaluation_cycle_id,
    comment: created.comment,
    created_at: now,
    updated_at: now,
  };
}
