import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Creates a new job series under the specified job group.
 *
 * This operation creates a new job series record linked to the given job group
 * ID. It ensures all required fields are populated, including generated UUID
 * for ID and timestamps for creation and update. Optional description is
 * handled gracefully.
 *
 * Authorization is expected to be handled via the passed `manager` payload.
 *
 * @param props - Object containing the manager authorization payload, the job
 *   group ID under which the job series is created, and the creation data.
 * @param props.manager - Authenticated manager performing the operation.
 * @param props.jobGroupId - UUID string of the parent job group.
 * @param props.body - Creation data for the job series including code, name,
 *   and optional description.
 * @returns The newly created job series record as per
 *   IJobPerformanceEvalJobSeries interface.
 * @throws {Error} If creation fails due to database or constraint errors.
 */
export async function postjobPerformanceEvalManagerJobGroupsJobGroupIdJobSeries(props: {
  manager: ManagerPayload;
  jobGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.ICreate;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { manager, jobGroupId, body } = props;

  // Generate ISO timestamp strings for create/update timestamps
  const now = toISOStringSafe(new Date());

  // Create the job series in the database
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

  // Return the created entity with date fields converted to strings
  return {
    id: created.id as string & tags.Format<"uuid">,
    job_group_id: created.job_group_id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
