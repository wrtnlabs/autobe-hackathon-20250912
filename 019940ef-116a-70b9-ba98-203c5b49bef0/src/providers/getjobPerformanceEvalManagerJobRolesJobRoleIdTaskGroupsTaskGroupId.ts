import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Get detailed task group information by ID.
 *
 * This endpoint fetches detailed information about a specific task group within
 * a job role. Task groups consist of related tasks grouped for better
 * organization and management.
 *
 * The operation relies on 'jobRoleId' and 'taskGroupId' path parameters to
 * locate the targeted task group record in the database.
 *
 * Users with roles 'employee' or 'manager' have access to this endpoint for
 * security reasons.
 *
 * @param props - Object containing the manager authentication payload and path
 *   parameters
 * @param props.manager - The authenticated manager making the request
 * @param props.jobRoleId - Unique identifier of the target job role
 * @param props.taskGroupId - Unique identifier of the target task group
 * @returns The detailed task group entity conforming to
 *   IJobPerformanceEvalTaskGroup
 * @throws {Error} Throws if the task group is not found for the given jobRoleId
 *   and taskGroupId
 */
export async function getjobPerformanceEvalManagerJobRolesJobRoleIdTaskGroupsTaskGroupId(props: {
  manager: ManagerPayload;
  jobRoleId: string & tags.Format<"uuid">;
  taskGroupId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTaskGroup> {
  const { manager, jobRoleId, taskGroupId } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_task_groups.findFirstOrThrow({
      where: {
        id: taskGroupId,
        job_role_id: jobRoleId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    job_role_id: record.job_role_id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
