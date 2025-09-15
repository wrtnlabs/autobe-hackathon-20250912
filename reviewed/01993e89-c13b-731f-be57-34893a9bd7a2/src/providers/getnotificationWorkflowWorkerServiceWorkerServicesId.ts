import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { WorkerServicePayload } from "../decorators/payload/WorkerServicePayload";

/**
 * Retrieve detailed information of a specific WorkerService user.
 *
 * This operation returns non-sensitive data for the authenticated workerService
 * user matching the provided UUID in the path parameter.
 *
 * Authorization requires the authenticated user's id to match the requested id,
 * preventing access to other workerService accounts.
 *
 * @param props - Object containing authentication payload and target
 *   workerService UUID
 * @param props.workerService - Authenticated workerService user payload
 * @param props.id - UUID of the target workerService user to retrieve
 * @returns WorkerService user information excluding password_hash
 * @throws {Error} When access is unauthorized (id mismatch)
 * @throws {Error} When the workerService user with the given id does not exist
 */
export async function getnotificationWorkflowWorkerServiceWorkerServicesId(props: {
  workerService: WorkerServicePayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkerService> {
  const { workerService, id } = props;

  if (workerService.id !== id) {
    throw new Error(
      "Unauthorized: Access denied to other workerService profiles",
    );
  }

  const found =
    await MyGlobal.prisma.notification_workflow_workerservices.findUniqueOrThrow(
      {
        where: { id },
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
    id: found.id,
    email: found.email,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
