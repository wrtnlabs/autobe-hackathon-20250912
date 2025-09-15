import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new task activity under a specified task.
 *
 * This operation allows an authenticated manager to create a detailed task
 * activity associated with a given task ID. The task activity includes details
 * such as code, name, and optional description.
 *
 * @param props - The request parameters and body.
 * @param props.manager - The authenticated manager payload performing the
 *   operation.
 * @param props.taskId - The UUID of the parent task under which the activity is
 *   created.
 * @param props.body - The task activity creation details conforming to
 *   IJobPerformanceEvalTaskActivity.ICreate.
 * @returns The newly created task activity record with all fields populated.
 * @throws {Error} Throws if the creation fails due to constraints or database
 *   issues.
 */
export async function postjobPerformanceEvalManagerTasksTaskIdTaskActivities(props: {
  manager: ManagerPayload;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.ICreate;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { manager, taskId, body } = props;

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.job_performance_eval_task_activities.create({
      data: {
        id: newId,
        task_id: taskId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    task_id: created.task_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
