import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Create and send a new direct message between users.
 *
 * This operation creates a new direct message record representing a private
 * message sent from one user to another within the enterprise LMS system. It
 * stores sender and recipient IDs, message content, tenant information, and
 * timestamps.
 *
 * Only authenticated external learners can perform this operation.
 *
 * @param props - Object containing the authenticated external learner and the
 *   message creation payload
 * @param props.externalLearner - The authenticated external learner user making
 *   the request
 * @param props.body - The direct message creation payload including tenant,
 *   sender, recipient, message body, and sent timestamp
 * @returns The created direct message with all fields populated
 * @throws {Error} When creation fails due to database or validation errors
 */
export async function postenterpriseLmsExternalLearnerDirectMessages(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsDirectMessage.ICreate;
}): Promise<IEnterpriseLmsDirectMessage> {
  const { externalLearner, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const sentAt = toISOStringSafe(body.sent_at);

  const created = await MyGlobal.prisma.enterprise_lms_direct_messages.create({
    data: {
      id,
      tenant_id: body.tenant_id,
      sender_id: body.sender_id,
      recipient_id: body.recipient_id,
      body: body.body,
      sent_at: sentAt,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    sender_id: created.sender_id,
    recipient_id: created.recipient_id,
    body: created.body,
    sent_at: toISOStringSafe(created.sent_at),
    read_at: created.read_at ? toISOStringSafe(created.read_at) : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
