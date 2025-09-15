import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update manager information by ID in the job performance evaluation system.
 *
 * This operation modifies the manager's profile details such as email and name.
 * Password changes are not supported in this endpoint and should be managed via
 * a separate password update API to ensure security best practices.
 *
 * Authorization is restricted to managers with rights to edit their own or
 * subordinate profiles.
 *
 * @param props - Object containing manager authorization payload, the manager
 *   ID, and the update request body.
 * @param props.manager - The authenticated manager making the update request.
 * @param props.id - Unique identifier of the manager to be updated.
 * @param props.body - The update details for the manager (email, name,
 *   deleted_at).
 * @returns The updated manager entity including timestamps.
 * @throws {Error} Throws if the manager with the specified ID does not exist.
 */
export async function putjobPerformanceEvalManagerManagersId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalManager.IUpdate;
}): Promise<IJobPerformanceEvalManager> {
  const { manager, id, body } = props;

  const existing =
    await MyGlobal.prisma.job_performance_eval_managers.findUniqueOrThrow({
      where: { id },
    });

  const updated = await MyGlobal.prisma.job_performance_eval_managers.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      name: body.name ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
