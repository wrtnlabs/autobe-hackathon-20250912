import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Updates an existing TriggerOperator user identified by UUID.
 *
 * This operation ensures the user exists and is active (not soft deleted),
 * validates unique email constraint, and updates specified fields.
 *
 * Password hash can be updated if provided. Soft deletion status can be toggled
 * via deleted_at.
 *
 * All date fields are stored and returned as ISO 8601 date-time strings.
 *
 * The returned object excludes the password hash field for security.
 *
 * @param props - Object containing triggerOperator authorization payload, user
 *   ID, and update body
 * @param props.triggerOperator - Authenticated trigger operator performing
 *   update
 * @param props.id - UUID of the user to update
 * @param props.body - Partial update payload including email, password_hash,
 *   and deleted_at
 * @returns Updated TriggerOperator user without password hash
 * @throws {Error} If user is not found or has been soft deleted
 * @throws {Error} If new email is already used by another active trigger
 *   operator
 */
export async function patchnotificationWorkflowTriggerOperatorTriggerOperators(props: {
  triggerOperator: TriggerOperatorPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowTriggerOperator.IUpdate;
}): Promise<INotificationWorkflowTriggerOperator> {
  const { triggerOperator, id, body } = props;

  const existing =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findUnique({
      where: { id },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new Error("Trigger operator user not found or deleted");
  }

  if (body.email !== undefined && body.email !== existing.email) {
    const count =
      await MyGlobal.prisma.notification_workflow_triggeroperators.count({
        where: {
          email: body.email,
          deleted_at: null,
          NOT: { id },
        },
      });
    if (count > 0) {
      throw new Error(
        "Email address already in use by another trigger operator",
      );
    }
  }

  const updated =
    await MyGlobal.prisma.notification_workflow_triggeroperators.update({
      where: { id },
      data: {
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.password_hash !== undefined
          ? { password_hash: body.password_hash }
          : {}),
        ...(body.deleted_at !== undefined
          ? { deleted_at: body.deleted_at ?? null }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
