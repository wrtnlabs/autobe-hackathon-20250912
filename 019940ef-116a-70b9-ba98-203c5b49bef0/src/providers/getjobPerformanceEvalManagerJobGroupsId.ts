import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a job group by its ID from the job_performance_eval_job_groups
 * table.
 *
 * This function fetches detailed information of a specific job group identified
 * by its unique UUID. It filters out soft-deleted records by ensuring
 * deleted_at is null.
 *
 * Authorization: Requires authenticated manager role.
 *
 * @param props - Object containing the authenticated manager and the job group
 *   ID
 * @param props.manager - Authenticated manager payload containing ID and type
 * @param props.id - UUID of the job group to retrieve
 * @returns The job group details conforming to IJobPerformanceEvalJobGroup
 * @throws {Error} If the job group with the specified ID does not exist or is
 *   soft deleted
 */
export async function getjobPerformanceEvalManagerJobGroupsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobGroup> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_job_groups.findUniqueOrThrow({
      where: { id, deleted_at: null },
    });

  return {
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
