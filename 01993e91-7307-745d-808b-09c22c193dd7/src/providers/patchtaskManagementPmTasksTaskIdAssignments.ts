import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves the list of task assignments for a specific task.
 *
 * This function fetches all task assignments matching the provided task ID. It
 * returns an array of assignment objects including IDs and assignment
 * timestamps. Only PM role is authorized to use this function.
 *
 * @param props - Object containing the PM payload and the task UUID
 * @param props.pm - The authenticated PM user payload
 * @param props.taskId - UUID of the target task
 * @returns A promise resolving to an array of task assignment objects
 * @throws Will throw if database access fails or other unexpected errors occur
 */
export async function patchtaskManagementPmTasksTaskIdAssignments(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: props.taskId },
    });

  return {
    data: assignments.map((assignment) => ({
      id: assignment.id as string & tags.Format<"uuid">,
      task_id: assignment.task_id as string & tags.Format<"uuid">,
      assignee_id: assignment.assignee_id as string & tags.Format<"uuid">,
      assigned_at: assignment.assigned_at
        ? toISOStringSafe(assignment.assigned_at)
        : ("" as string & tags.Format<"date-time">),
    })),
  };
}
