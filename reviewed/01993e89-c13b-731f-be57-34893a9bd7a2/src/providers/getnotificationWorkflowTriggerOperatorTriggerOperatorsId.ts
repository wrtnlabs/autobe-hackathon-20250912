import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Retrieve a TriggerOperator user by unique ID.
 *
 * This function fetches detailed information of a TriggerOperator user from the
 * notification_workflow_triggeroperators table by their UUID, excluding
 * sensitive information such as the password hash to adhere to security best
 * practices. Only active (non-deleted) users are retrievable.
 *
 * @param props - The function parameters including authenticated
 *   TriggerOperator and the user ID.
 * @param props.triggerOperator - Authenticated TriggerOperator making the
 *   request.
 * @param props.id - Unique UUID of the TriggerOperator to retrieve.
 * @returns The TriggerOperator user information with sensitive fields excluded.
 * @throws {Error} If the user is not found or soft-deleted.
 */
export async function getnotificationWorkflowTriggerOperatorTriggerOperatorsId(props: {
  triggerOperator: TriggerOperatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowTriggerOperator> {
  const { triggerOperator, id } = props;

  const operator =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findFirstOrThrow(
      {
        where: {
          id,
          deleted_at: null,
        },
      },
    );

  return {
    id: operator.id,
    email: operator.email,
    password_hash: "",
    created_at: toISOStringSafe(operator.created_at),
    updated_at: toISOStringSafe(operator.updated_at),
    deleted_at: operator.deleted_at
      ? toISOStringSafe(operator.deleted_at)
      : null,
  };
}
