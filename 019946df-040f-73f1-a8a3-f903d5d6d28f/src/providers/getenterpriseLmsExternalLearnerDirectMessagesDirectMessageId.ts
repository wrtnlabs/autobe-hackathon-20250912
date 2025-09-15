import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Retrieve details of a specific direct message by ID for an authenticated
 * external learner.
 *
 * This operation fetches the direct message record from the database ensuring
 * the external learner either sent or received the message. It converts all
 * date fields to ISO strings, handles nullability properly, and enforces access
 * control.
 *
 * @param props - The request properties containing authentication and direct
 *   message identifier.
 * @param props.externalLearner - Authenticated external learner payload.
 * @param props.directMessageId - UUID of the direct message to retrieve.
 * @returns Detailed direct message information conforming to
 *   IEnterpriseLmsDirectMessage.
 * @throws {Error} When the direct message does not exist or access is
 *   unauthorized.
 */
export async function getenterpriseLmsExternalLearnerDirectMessagesDirectMessageId(props: {
  externalLearner: ExternallearnerPayload;
  directMessageId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsDirectMessage> {
  const { externalLearner, directMessageId } = props;

  // Fetch the direct message by id
  const directMessage =
    await MyGlobal.prisma.enterprise_lms_direct_messages.findUniqueOrThrow({
      where: { id: directMessageId },
    });

  // Check if external learner is either sender or recipient
  if (
    directMessage.sender_id !== externalLearner.id &&
    directMessage.recipient_id !== externalLearner.id
  ) {
    throw new Error("Unauthorized: Access to this message is forbidden");
  }

  // Return formatted direct message with dates converted to strings
  return {
    id: directMessage.id,
    tenant_id: directMessage.tenant_id,
    sender_id: directMessage.sender_id,
    recipient_id: directMessage.recipient_id,
    body: directMessage.body,
    sent_at: toISOStringSafe(directMessage.sent_at),
    read_at: directMessage.read_at
      ? toISOStringSafe(directMessage.read_at)
      : null,
    deleted_at: directMessage.deleted_at
      ? toISOStringSafe(directMessage.deleted_at)
      : null,
  };
}
