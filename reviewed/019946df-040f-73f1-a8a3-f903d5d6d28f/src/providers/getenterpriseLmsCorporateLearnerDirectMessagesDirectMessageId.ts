import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve detailed information of a single direct message identified by
 * directMessageId.
 *
 * This operation queries the enterprise_lms_direct_messages entity and returns
 * the full message details. It enforces tenant isolation and permission
 * control, allowing access only to authorized corporate learners who are either
 * the sender, recipient, or belong to the same tenant.
 *
 * @param props - Object containing corporateLearner payload and direct message
 *   ID.
 * @param props.corporateLearner - Authenticated corporate learner user payload.
 * @param props.directMessageId - Unique identifier of the direct message.
 * @returns Detailed direct message information.
 * @throws {Error} When the direct message does not exist or access is
 *   unauthorized.
 */
export async function getenterpriseLmsCorporateLearnerDirectMessagesDirectMessageId(props: {
  corporateLearner: CorporatelearnerPayload;
  directMessageId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsDirectMessage> {
  const { corporateLearner, directMessageId } = props;

  const directMessage =
    await MyGlobal.prisma.enterprise_lms_direct_messages.findUniqueOrThrow({
      where: { id: directMessageId },
    });

  if (
    directMessage.tenant_id !== corporateLearner.id &&
    directMessage.sender_id !== corporateLearner.id &&
    directMessage.recipient_id !== corporateLearner.id
  ) {
    throw new Error("Unauthorized access to direct message");
  }

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
