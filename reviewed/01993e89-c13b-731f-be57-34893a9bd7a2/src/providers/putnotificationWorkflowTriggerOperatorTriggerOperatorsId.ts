import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Update a TriggerOperator user by the given UUID ID.
 *
 * This function updates an existing TriggerOperator user identified by the `id`
 * parameter. It ensures the user is not soft deleted and enforces email
 * uniqueness.
 *
 * @param props - Object containing the authenticated triggerOperator payload,
 *   the id of the user to update, and the update body.
 * @param props.triggerOperator - Authenticated trigger operator performing the
 *   update.
 * @param props.id - UUID of the trigger operator to update.
 * @param props.body - Update payload including optional email and
 *   password_hash.
 * @returns The updated trigger operator user information, excluding password
 *   values but including the password hash.
 * @throws {Error} When the user is not found or is soft deleted.
 * @throws {Error} When the email address is already used by another active
 *   trigger operator.
 */
export async function putnotificationWorkflowTriggerOperatorTriggerOperatorsId(props: {
  triggerOperator: TriggerOperatorPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowTriggerOperator.IUpdate;
}): Promise<INotificationWorkflowTriggerOperator> {
  const { id, body } = props;

  // Verify the user exists and is not soft deleted
  const existingUser =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findUnique({
      where: { id },
    });
  if (!existingUser || existingUser.deleted_at !== null) {
    throw new Error("TriggerOperator user not found or soft-deleted");
  }

  // Ensure email uniqueness if updating email
  if (body.email !== undefined && body.email !== null) {
    const emailConflict =
      await MyGlobal.prisma.notification_workflow_triggeroperators.findFirst({
        where: {
          email: body.email,
          deleted_at: null,
          NOT: { id },
        },
      });
    if (emailConflict) {
      throw new Error("Email address already in use");
    }
  }

  const updatedAt = toISOStringSafe(new Date());

  const updatedUser =
    await MyGlobal.prisma.notification_workflow_triggeroperators.update({
      where: { id },
      data: {
        email: body.email ?? undefined,
        password_hash: body.password_hash ?? undefined,
        updated_at: updatedAt,
      },
    });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    password_hash: updatedUser.password_hash,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : null,
  };
}
