import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve a job group by its ID from the job_performance_eval_job_groups
 * table.
 *
 * This operation fetches detailed information for a specific job group
 * identified by a UUID. It filters out soft-deleted records and converts date
 * fields to ISO string format for response.
 *
 * Authorization requires an authenticated employee.
 *
 * @param props - Contains the authenticated employee payload and the job group
 *   ID.
 * @param props.employee - The authenticated employee making the request.
 * @param props.id - The UUID of the job group to retrieve.
 * @returns The job group information adhering to IJobPerformanceEvalJobGroup.
 * @throws {Error} Throws if the job group is not found or soft-deleted.
 */
export async function getjobPerformanceEvalEmployeeJobGroupsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobGroup> {
  const record =
    await MyGlobal.prisma.job_performance_eval_job_groups.findFirstOrThrow({
      where: {
        id: props.id,
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
