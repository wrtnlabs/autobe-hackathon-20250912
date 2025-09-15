import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new job series under a specified job group.
 *
 * This operation allows authorized employees to add a job series associated
 * with an existing job group. It enforces the existence of the parent job group
 * and populates created and updated timestamps.
 *
 * @param props - The properties containing employee authentication info, the
 *   job group ID, and the creation data for the job series.
 * @returns The newly created job series entity including timestamps.
 * @throws {Error} Throws if the job group does not exist.
 */
export async function postjobPerformanceEvalEmployeeJobGroupsJobGroupIdJobSeries(props: {
  employee: EmployeePayload;
  jobGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.ICreate;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { employee, jobGroupId, body } = props;

  // Verify that the referenced job group exists
  const jobGroup =
    await MyGlobal.prisma.job_performance_eval_job_groups.findUnique({
      where: { id: jobGroupId },
    });

  if (jobGroup === null) {
    throw new Error(`Job group with id ${jobGroupId} not found.`);
  }

  const now = toISOStringSafe(new Date());

  // Create the job series record
  const created = await MyGlobal.prisma.job_performance_eval_job_series.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      job_group_id: jobGroupId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the newly created job series, converting Date fields safely
  return {
    id: created.id,
    job_group_id: created.job_group_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
