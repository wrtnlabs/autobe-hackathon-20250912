import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Updates a direct message entity by its unique identifier.
 *
 * This operation is restricted to the message sender and ensures tenant data
 * isolation. It updates the message body, read timestamp, and optionally the
 * deleted timestamp.
 *
 * @param props - Request properties including corporateLearner authentication
 *   payload, directMessageId, and update body conforming to
 *   IEnterpriseLmsDirectMessage.IUpdate.
 * @returns The fully updated direct message entity preserving all fields.
 * @throws {Error} Throws if the message does not exist, or if the authenticated
 *   user is not the sender.
 */
export async function putenterpriseLmsCorporateLearnerDirectMessagesDirectMessageId(props: {
  corporateLearner: CorporatelearnerPayload;
  directMessageId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsDirectMessage.IUpdate;
}): Promise<IEnterpriseLmsDirectMessage> {
  const { corporateLearner, directMessageId, body } = props;

  // Fetch existing direct message or throw if not found
  const message =
    await MyGlobal.prisma.enterprise_lms_direct_messages.findUniqueOrThrow({
      where: { id: directMessageId },
    });

  // Authorization: Only the sender can update the message
  if (message.sender_id !== corporateLearner.id) {
    throw new Error("Forbidden: You can update only your own sent messages");
  }

  // Update the direct message fields
  const updated = await MyGlobal.prisma.enterprise_lms_direct_messages.update({
    where: { id: directMessageId },
    data: {
      body: body.body,
      read_at: body.read_at ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return the updated message with all date fields converted to ISO strings
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    sender_id: updated.sender_id,
    recipient_id: updated.recipient_id,
    body: updated.body,
    sent_at: toISOStringSafe(updated.sent_at),
    read_at: updated.read_at ? toISOStringSafe(updated.read_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
