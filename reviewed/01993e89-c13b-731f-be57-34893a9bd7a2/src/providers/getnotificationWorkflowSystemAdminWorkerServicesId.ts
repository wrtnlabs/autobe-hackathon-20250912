import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieve detailed information of a specific WorkerService user by their
 * unique identifier.
 *
 * Returns non-sensitive profile data including id, email, created_at,
 * updated_at, and deleted_at. Access restricted to system administrators and
 * the WorkerService themselves.
 *
 * @param props - Object containing systemAdmin payload and the WorkerService
 *   user UUID
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the retrieval
 * @param props.id - The UUID of the WorkerService user to retrieve
 * @returns The WorkerService user data excluding password_hash
 * @throws {Error} Throws if no WorkerService found with the given id or if
 *   access is unauthorized
 */
export async function getnotificationWorkflowSystemAdminWorkerServicesId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkerService> {
  const { systemAdmin, id } = props;

  const workerService =
    await MyGlobal.prisma.notification_workflow_workerservices.findUniqueOrThrow(
      {
        where: { id, deleted_at: null },
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: workerService.id,
    email: workerService.email,
    created_at: toISOStringSafe(workerService.created_at),
    updated_at: toISOStringSafe(workerService.updated_at),
    deleted_at: workerService.deleted_at
      ? toISOStringSafe(workerService.deleted_at)
      : null,
  };
}
