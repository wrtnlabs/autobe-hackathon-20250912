import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve a specific assignment by assignmentId for a task by taskId.
 *
 * This endpoint fetches the detailed information of a single task assignment
 * identified by 'assignmentId' under the parent task identified by 'taskId'.
 *
 * Authorization is enforced for Project Managers (PM). The assignment must
 * exist and belong to the task.
 *
 * @param props - Object containing PM user payload, task ID, and assignment ID
 * @param props.pm - Authenticated PM user performing the request
 * @param props.taskId - UUID of the parent task
 * @param props.assignmentId - UUID of the specific assignment
 * @returns Task assignment details conforming to ITaskManagementTaskAssignment
 * @throws {Error} If the task assignment is not found
 */
export async function gettaskManagementPmTasksTaskIdAssignmentsAssignmentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { taskId, assignmentId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_assignments.findFirstOrThrow({
      where: { id: assignmentId, task_id: taskId },
      select: { id: true, task_id: true, assignee_id: true, assigned_at: true },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    assignee_id: record.assignee_id,
    assigned_at: toISOStringSafe(record.assigned_at),
  };
}
