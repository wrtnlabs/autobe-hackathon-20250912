import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve detailed information for a manager by their unique identifier.
 *
 * This endpoint fetches the manager record from the
 * job_performance_eval_managers table. It returns full details including id,
 * email, name, created_at, updated_at, and deleted_at. The password_hash is
 * included as per the interface but must be handled securely in client
 * applications.
 *
 * Authorization: Only authenticated manager users can access this endpoint.
 *
 * @param props - Object containing authentication and path parameters.
 * @param props.manager - Authenticated manager payload.
 * @param props.id - UUID of the manager to retrieve.
 * @returns The full manager details as IJobPerformanceEvalManager.
 * @throws {Error} Throws if manager not found (will throw Prisma error).
 */
export async function getjobPerformanceEvalManagerManagersId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalManager> {
  const { id } = props;

  const manager =
    await MyGlobal.prisma.job_performance_eval_managers.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: manager.id,
    email: manager.email,
    password_hash: manager.password_hash,
    name: manager.name,
    created_at: toISOStringSafe(manager.created_at),
    updated_at: toISOStringSafe(manager.updated_at),
    deleted_at: manager.deleted_at ? toISOStringSafe(manager.deleted_at) : null,
  };
}
