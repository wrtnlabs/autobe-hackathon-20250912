import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Deletes a chatbot command log entry by its unique identifier.
 *
 * This operation permanently removes the record from the database and cannot be
 * undone. Only the authenticated member who owns the command log can perform
 * this deletion.
 *
 * @param props - Object containing the authenticated member and the log ID to
 *   delete
 * @param props.member - The authenticated member performing the deletion
 * @param props.chatbotCommandLogId - UUID of the chatbot command log entry to
 *   delete
 * @throws {Error} Throws if the command log does not exist
 * @throws {Error} Throws if the authenticated member is not the owner of the
 *   command log
 */
export async function deletechatbotMemberChatbotCommandLogsChatbotCommandLogId(props: {
  member: MemberPayload;
  chatbotCommandLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, chatbotCommandLogId } = props;

  const commandLog =
    await MyGlobal.prisma.chatbot_command_logs.findUniqueOrThrow({
      where: { id: chatbotCommandLogId },
    });

  if (commandLog.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized: You can only delete your own command logs");
  }

  await MyGlobal.prisma.chatbot_command_logs.delete({
    where: { id: chatbotCommandLogId },
  });
}
