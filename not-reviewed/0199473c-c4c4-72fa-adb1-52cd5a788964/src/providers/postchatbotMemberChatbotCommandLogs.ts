import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotCommandLog";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new chatbot command log recording an executed command.
 *
 * This operation creates a new chatbot command log entry capturing details
 * about an executed command in the chatbot system. It stores information such
 * as the member who executed the command, the command string, parameters, and
 * timestamp.
 *
 * Only authenticated members are authorized to perform this operation.
 *
 * @param props - The function parameter object.
 * @param props.member - The authenticated member executing the command.
 * @param props.body - The data needed to create the command log entry.
 * @returns The newly created chatbot command log record.
 * @throws {Error} Throws if the database operation fails.
 */
export async function postchatbotMemberChatbotCommandLogs(props: {
  member: MemberPayload;
  body: IChatbotCommandLog.ICreate;
}): Promise<IChatbotCommandLog> {
  const { member, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const created_at = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.chatbot_command_logs.create({
    data: {
      id,
      chatbot_member_id: member.id,
      command: body.command,
      command_parameters: body.command_parameters ?? undefined,
      created_at,
    },
  });

  return {
    id: created.id,
    chatbot_member_id: created.chatbot_member_id,
    command: created.command,
    command_parameters: created.command_parameters ?? null,
    created_at: created.created_at,
  };
}
