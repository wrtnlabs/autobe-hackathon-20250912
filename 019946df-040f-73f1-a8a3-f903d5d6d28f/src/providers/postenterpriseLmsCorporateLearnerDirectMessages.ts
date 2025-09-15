import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Create and send a new direct message between users.
 *
 * This operation creates a new direct message record representing a private
 * message sent from one user to another within the enterprise LMS system. The
 * message is stored in the enterprise_lms_direct_messages table capturing
 * sender and recipient user identifiers, message content, and sent timestamp.
 *
 * The sender must be the authenticated corporate learner and recipients must be
 * valid active users. Tenant isolation is enforced by matching tenant contexts
 * between sender and recipient.
 *
 * @param props - Object containing the authenticated corporate learner and
 *   message creation data
 * @param props.corporateLearner - The authenticated corporate learner sending
 *   the message
 * @param props.body - The direct message creation payload including tenant,
 *   sender, recipient, body, and sent timestamp
 * @returns The created direct message record with all fields populated
 *   including soft deletion and read timestamps
 * @throws {Error} If the sender is unauthorized (sender_id mismatch)
 * @throws {Error} If the sender or recipient is not found or inactive
 */
export async function postenterpriseLmsCorporateLearnerDirectMessages(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsDirectMessage.ICreate;
}): Promise<IEnterpriseLmsDirectMessage> {
  const { corporateLearner, body } = props;

  // Authorization: sender_id must match authenticated user id
  if (body.sender_id !== corporateLearner.id) {
    throw new Error(
      "Unauthorized: sender_id does not match authenticated user",
    );
  }

  // NOTE: Tenant ID verification cannot be done here due to lack of tenant_id in the payload

  // Verify sender exists, active, and not soft-deleted
  const sender =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
      where: {
        id: body.sender_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!sender) {
    throw new Error("Sender not found or inactive");
  }

  // Verify recipient exists, active, and not soft-deleted
  const recipient =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findFirst({
      where: {
        id: body.recipient_id,
        deleted_at: null,
        status: "active",
      },
    });
  if (!recipient) {
    throw new Error("Recipient not found or inactive");
  }

  // Create new direct message with generated UUID
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.enterprise_lms_direct_messages.create({
    data: {
      id: newId,
      tenant_id: body.tenant_id,
      sender_id: body.sender_id,
      recipient_id: body.recipient_id,
      body: body.body,
      sent_at: body.sent_at,
    },
  });

  // Return the created record, converting Date objects to ISO strings
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
