import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update manager information by ID in the job performance evaluation system.
 *
 * This operation modifies the manager's profile details such as email and name.
 * Password changes are excluded and must be done via a separate endpoint.
 *
 * Authorization is enforced externally, here the authenticated employee is
 * provided.
 *
 * @param props - Object containing employee (auth), id, and update body
 * @param props.employee - Authenticated employee performing update
 * @param props.id - UUID identifier of the manager to update
 * @param props.body - Update payload including email and name
 * @returns The updated manager entity with all fields except password hashed
 *   returned
 * @throws {Error} Throws if the manager with given ID does not exist
 */
export async function putjobPerformanceEvalEmployeeManagersId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalManager.IUpdate;
}): Promise<IJobPerformanceEvalManager> {
  const { employee, id, body } = props;

  const manager =
    await MyGlobal.prisma.job_performance_eval_managers.findUnique({
      where: { id },
    });
  if (!manager) throw new Error("Manager not found");

  const updated = await MyGlobal.prisma.job_performance_eval_managers.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      name: body.name ?? undefined,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
