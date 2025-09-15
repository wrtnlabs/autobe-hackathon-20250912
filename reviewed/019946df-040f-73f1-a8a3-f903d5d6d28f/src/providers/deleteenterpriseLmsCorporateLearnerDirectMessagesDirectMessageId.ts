import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Delete a direct message by ID (soft delete).
 *
 * This operation allows an authenticated corporate learner to perform a soft
 * delete on a direct message identified by the unique UUID `directMessageId`.
 * The deletion is logical (soft) by setting the `deleted_at` timestamp to
 * preserve audit trails.
 *
 * Authorization is enforced: only the sender or recipient of the message may
 * delete it.
 *
 * @param props - Object containing the corporateLearner payload and
 *   directMessageId
 * @param props.corporateLearner - The authenticated corporate learner's payload
 * @param props.directMessageId - UUID string of the direct message to soft
 *   delete
 * @returns Promise<void> No content is returned upon successful deletion
 * @throws {Error} Throws "Not found" if the message doesn't exist or is already
 *   deleted
 * @throws {Error} Throws "Forbidden" if the user is neither sender nor
 *   recipient
 */
export async function deleteenterpriseLmsCorporateLearnerDirectMessagesDirectMessageId(props: {
  corporateLearner: CorporatelearnerPayload;
  directMessageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { corporateLearner, directMessageId } = props;

  const message =
    await MyGlobal.prisma.enterprise_lms_direct_messages.findFirst({
      where: {
        id: directMessageId,
        deleted_at: null,
      },
    });

  if (!message) {
    throw new Error("Not found");
  }

  if (
    message.sender_id !== corporateLearner.id &&
    message.recipient_id !== corporateLearner.id
  ) {
    throw new Error("Forbidden");
  }

  await MyGlobal.prisma.enterprise_lms_direct_messages.update({
    where: { id: directMessageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
