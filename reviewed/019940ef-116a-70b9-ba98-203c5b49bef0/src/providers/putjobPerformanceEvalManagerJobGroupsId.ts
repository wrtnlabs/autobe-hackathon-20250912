import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a job group by its ID in job_performance_eval_job_groups table.
 *
 * Allows authorized managers to modify existing job group information. Fields
 * such as the code, name, and description can be updated. The system checks for
 * unique code constraints on update.
 *
 * This operation requires path parameter 'id' as UUID to identify the job
 * group. The request body must conform to IJobPerformanceEvalJobGroup.IUpdate
 * type.
 *
 * Security restrictions limit access to 'manager' users.
 *
 * Upon success, returns the updated job group details.
 *
 * @param props - Object containing manager authorization, job group id, and
 *   update body
 * @param props.manager - The authenticated manager making this request
 * @param props.id - UUID of the job group to update
 * @param props.body - Update data for the job group
 * @returns The updated job group details
 * @throws {Error} If code uniqueness check fails
 * @throws {Error} If the job group does not exist for the given ID
 */
export async function putjobPerformanceEvalManagerJobGroupsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobGroup.IUpdate;
}): Promise<IJobPerformanceEvalJobGroup> {
  const { manager, id, body } = props;

  // Check if code is provided and unique
  if (body.code !== undefined && body.code !== null) {
    const existing =
      await MyGlobal.prisma.job_performance_eval_job_groups.findFirst({
        where: {
          code: body.code,
          id: { not: id },
          deleted_at: null,
        },
      });
    if (existing) throw new Error("Code already exists");
  }

  const updated = await MyGlobal.prisma.job_performance_eval_job_groups.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  if (!updated) throw new Error("Job group not found");

  return {
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
