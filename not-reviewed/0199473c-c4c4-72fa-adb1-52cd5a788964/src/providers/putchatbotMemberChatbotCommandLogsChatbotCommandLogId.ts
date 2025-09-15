import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotChatbotCommandLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotCommandLogs";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update a chatbot command log entry by its ID, modifying the command text and
 * parameters. Only the authenticated member who owns the log entry can perform
 * this operation.
 *
 * @param props - Object containing member info, chatbotCommandLogId, and the
 *   update body
 * @param props.member - Authenticated member performing the update
 * @param props.chatbotCommandLogId - UUID of the chatbot command log entry to
 *   update
 * @param props.body - Update data containing command and optional
 *   command_parameters
 * @returns Updated chatbot command log entry wrapped in a pagination structure
 * @throws {Error} If the command log entry is not owned by the authenticated
 *   member
 * @throws {Error} If the command log entry does not exist
 */
export async function putchatbotMemberChatbotCommandLogsChatbotCommandLogId(props: {
  member: MemberPayload;
  chatbotCommandLogId: string & tags.Format<"uuid">;
  body: IChatbotChatbotCommandLogs.IUpdate;
}): Promise<IChatbotChatbotCommandLogs> {
  const { member, chatbotCommandLogId, body } = props;

  // Fetch command log by id
  const commandLog =
    await MyGlobal.prisma.chatbot_command_logs.findUniqueOrThrow({
      where: { id: chatbotCommandLogId },
    });

  // Authorization check: verify ownership
  if (commandLog.chatbot_member_id !== member.id) {
    throw new Error("Unauthorized");
  }

  // Update command and command_parameters
  const updated = await MyGlobal.prisma.chatbot_command_logs.update({
    where: { id: chatbotCommandLogId },
    data: {
      command: body.command ?? undefined,
      command_parameters: body.command_parameters ?? undefined,
    },
  });

  // Return updated data wrapped in pagination format
  return {
    data: [
      {
        id: updated.id,
        chatbot_member_id: updated.chatbot_member_id,
        command: updated.command,
        command_parameters: updated.command_parameters ?? null,
        created_at: toISOStringSafe(updated.created_at),
      },
    ],
    pagination: {
      current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  };
}
