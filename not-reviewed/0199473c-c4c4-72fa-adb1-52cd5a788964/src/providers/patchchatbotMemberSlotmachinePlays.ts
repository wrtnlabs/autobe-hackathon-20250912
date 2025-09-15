import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";
import { IPageIChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotSlotmachinePlay";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a filtered and paginated list of chatbot slot machine plays.
 *
 * This operation allows authenticated members to filter plays by user, creation
 * date range, and to paginate and sort the results.
 *
 * @param props - Object containing member payload and request filters
 * @param props.member - Authenticated member payload
 * @param props.body - Request body containing filter and pagination parameters
 * @returns A paginated summary of slot machine plays matching the criteria
 * @throws {Error} When pagination parameters are invalid or sorting criteria
 *   are invalid
 */
export async function patchchatbotMemberSlotmachinePlays(props: {
  member: MemberPayload;
  body: IChatbotSlotmachinePlay.IRequest;
}): Promise<IPageIChatbotSlotmachinePlay.ISummary> {
  const { member, body } = props;

  // Extract and normalize pagination parameters with defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  if (page < 0) throw new Error("Page must be non-negative");
  if (limit <= 0) throw new Error("Limit must be positive");

  // Build where condition with safe null checks
  const where: {
    chatbot_member_id?: string & tags.Format<"uuid">;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (body.chatbot_member_id !== undefined && body.chatbot_member_id !== null) {
    where.chatbot_member_id = body.chatbot_member_id;
  }

  if (
    (body.created_at_gte !== undefined && body.created_at_gte !== null) ||
    (body.created_at_lte !== undefined && body.created_at_lte !== null)
  ) {
    where.created_at = {};
    if (body.created_at_gte !== undefined && body.created_at_gte !== null) {
      where.created_at.gte = body.created_at_gte;
    }
    if (body.created_at_lte !== undefined && body.created_at_lte !== null) {
      where.created_at.lte = body.created_at_lte;
    }
  }

  // Build orderBy object
  const orderBy: { created_at: "asc" | "desc" } = {
    created_at: "desc",
  };
  if (body.orderBy === "created_at") {
    orderBy.created_at = body.direction === "asc" ? "asc" : "desc";
  }

  // Calculate skip for pagination
  const skip = page * limit;

  // Query the data and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_slotmachine_plays.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        chatbot_member_id: true,
        bet_points: true,
        slot1: true,
        slot2: true,
        slot3: true,
        payout_points: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.chatbot_slotmachine_plays.count({ where }),
  ]);

  // Map results to the DTO format
  const data = results.map((r) => ({
    id: r.id,
    chatbot_member_id: r.chatbot_member_id,
    bet_points: r.bet_points,
    slot1: r.slot1,
    slot2: r.slot2,
    slot3: r.slot3,
    payout_points: r.payout_points,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
