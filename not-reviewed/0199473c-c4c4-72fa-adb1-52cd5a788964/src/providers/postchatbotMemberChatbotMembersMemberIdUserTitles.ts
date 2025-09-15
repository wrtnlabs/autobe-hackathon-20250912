import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Assign a new user title to a chatbot member.
 *
 * This function verifies the member's identity, confirms the title exists,
 * ensures no duplicate active title assignment exists, and creates a new
 * chatbot_user_titles record.
 *
 * @param props - Object containing the authenticated member payload, memberId
 *   path parameter, and creation body for the new user title.
 * @returns Promise resolving to the newly created user title record.
 * @throws {Error} When memberId does not match the body.chatbot_member_id.
 * @throws {Error} When the member or title does not exist in the database.
 * @throws {Error} When the member already has an active title assigned.
 */
export async function postchatbotMemberChatbotMembersMemberIdUserTitles(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotUserTitle.ICreate;
}): Promise<IChatbotUserTitle> {
  const { member, memberId, body } = props;

  if (memberId !== body.chatbot_member_id) {
    throw new Error(
      "Member ID does not match the chatbot_member_id in the body.",
    );
  }

  const memberRecord = await MyGlobal.prisma.chatbot_members.findUniqueOrThrow({
    where: { id: memberId },
  });

  const titleRecord = await MyGlobal.prisma.chatbot_titles.findUniqueOrThrow({
    where: { id: body.chatbot_title_id },
  });

  const existingTitle = await MyGlobal.prisma.chatbot_user_titles.findFirst({
    where: {
      chatbot_member_id: memberId,
      deleted_at: null,
    },
  });

  if (existingTitle) {
    throw new Error("Member already has an active title assigned.");
  }

  const nowISO = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.chatbot_user_titles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      chatbot_member_id: body.chatbot_member_id,
      chatbot_title_id: body.chatbot_title_id,
      assigned_at: toISOStringSafe(body.assigned_at),
      created_at: nowISO,
      updated_at: nowISO,
    },
  });

  return {
    id: created.id,
    chatbot_member_id: created.chatbot_member_id,
    chatbot_title_id: created.chatbot_title_id,
    assigned_at: toISOStringSafe(created.assigned_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
