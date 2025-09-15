import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotUserTitle";
import { IPageIChatbotUserTitle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotUserTitle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Lists chatbot user titles for a given member with optional filtering and
 * pagination.
 *
 * Retrieves filtered user title summaries associated with a specific chatbot
 * member ID. Supports filtering by title, assignment date ranges, pagination
 * controls. Validates member existence and excludes soft deleted records.
 *
 * @param props - The function parameters
 * @param props.member - Authenticated member payload
 * @param props.memberId - UUID of the target chatbot member
 * @param props.body - Filtering, search, and pagination parameters
 * @returns A paginated summary list of chatbot user titles
 * @throws Error when the member does not exist or is soft deleted
 */
export async function patchchatbotMemberChatbotMembersMemberIdUserTitles(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IChatbotUserTitle.IRequest;
}): Promise<IPageIChatbotUserTitle.ISummary> {
  const { member, memberId, body } = props;

  const memberRecord = await MyGlobal.prisma.chatbot_members.findUnique({
    where: { id: memberId },
  });
  if (memberRecord === null || memberRecord.deleted_at !== null) {
    throw new Error("Member not found");
  }

  let page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  let limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at?: null;
    chatbot_member_id: string & tags.Format<"uuid">;
    chatbot_title_id?: string & tags.Format<"uuid">;
    assigned_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
    chatbot_member_id: memberId,
  };

  if (body.chatbot_title_id !== undefined && body.chatbot_title_id !== null) {
    where.chatbot_title_id = body.chatbot_title_id;
  }
  if (body.assigned_at_gte !== undefined && body.assigned_at_gte !== null) {
    where.assigned_at = { ...where.assigned_at, gte: body.assigned_at_gte };
  }
  if (body.assigned_at_lte !== undefined && body.assigned_at_lte !== null) {
    where.assigned_at = { ...where.assigned_at, lte: body.assigned_at_lte };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.chatbot_user_titles.findMany({
      where,
      orderBy: { assigned_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        chatbot_member_id: true,
        chatbot_title_id: true,
        assigned_at: true,
      },
    }),
    MyGlobal.prisma.chatbot_user_titles.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      chatbot_member_id: record.chatbot_member_id,
      chatbot_title_id: record.chatbot_title_id,
      assigned_at: toISOStringSafe(record.assigned_at),
    })),
  };
}
