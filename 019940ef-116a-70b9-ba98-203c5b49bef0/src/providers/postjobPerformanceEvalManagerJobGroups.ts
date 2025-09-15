import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Creates a new job group record.
 *
 * This operation allows an authorized manager to create a new job group used in
 * the organizational hierarchy. It requires a unique code, a name, and an
 * optional description. The creation timestamp and update timestamp are set
 * automatically. The ID is generated internally as a UUID.
 *
 * @param props - The function input parameters
 * @param props.manager - The authenticated manager performing the operation
 * @param props.body - The job group creation data including code, name, and
 *   optional description
 * @returns The newly created job group with all fields including timestamps
 * @throws {Error} If the job group creation fails due to database errors (e.g.,
 *   duplicate code)
 */
export async function postjobPerformanceEvalManagerJobGroups(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalJobGroup.ICreate;
}): Promise<IJobPerformanceEvalJobGroup> {
  const { manager, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.job_performance_eval_job_groups.create({
    data: {
      id: id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
