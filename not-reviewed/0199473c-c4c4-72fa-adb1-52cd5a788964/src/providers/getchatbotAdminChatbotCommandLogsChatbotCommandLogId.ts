import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotCommandLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a chatbot command log record by its unique
 * ID.
 *
 * This operation fetches a chatbot_command_logs database record uniquely
 * identified by the provided chatbotCommandLogId. It returns the full record
 * including the executor member ID, the command executed, optional parameters,
 * and the timestamp of execution.
 *
 * Authorization is restricted to admin users.
 *
 * @param props - Object containing the admin's authentication payload and the
 *   chatbot command log ID
 * @param props.admin - Authenticated admin user making the request
 * @param props.chatbotCommandLogId - Unique identifier of the chatbot command
 *   log to retrieve
 * @returns The detailed chatbot command log record matching the provided ID
 * @throws {Error} Throws if no record with the given ID exists
 */
export async function getchatbotAdminChatbotCommandLogsChatbotCommandLogId(props: {
  admin: AdminPayload;
  chatbotCommandLogId: string & tags.Format<"uuid">;
}): Promise<IChatbotCommandLog> {
  const { chatbotCommandLogId } = props;

  const record = await MyGlobal.prisma.chatbot_command_logs.findUniqueOrThrow({
    where: { id: chatbotCommandLogId },
    select: {
      id: true,
      chatbot_member_id: true,
      command: true,
      command_parameters: true,
      created_at: true,
    },
  });

  typia.assertGuard<string & tags.Format<"uuid">>(record.id);
  typia.assertGuard<string & tags.Format<"uuid">>(record.chatbot_member_id);

  return {
    id: record.id,
    chatbot_member_id: record.chatbot_member_id,
    command: record.command,
    command_parameters: record.command_parameters ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
