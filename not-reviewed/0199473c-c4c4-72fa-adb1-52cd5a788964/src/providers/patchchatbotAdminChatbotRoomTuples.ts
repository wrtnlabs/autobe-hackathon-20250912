import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotRoomTuples";
import { IPageIChatbotRoomTuples } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotRoomTuples";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered and paginated list of chatbot room tuples.
 *
 * This endpoint allows administrators to query active chatbot room tuples with
 * options to filter by normal room ID, admin room ID, unique business ID,
 * display name (partial match), and enablement status.
 *
 * @param props - Object containing admin authentication and filter/pagination
 *   body
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Filter and pagination criteria
 * @returns Paginated list of chatbot room tuple summaries matching criteria
 * @throws {Error} Throws when any unexpected error occurs during data fetching
 */
export async function patchchatbotAdminChatbotRoomTuples(props: {
  admin: AdminPayload;
  body: IChatbotRoomTuples.IRequest;
}): Promise<IPageIChatbotRoomTuples.ISummary> {
  const { admin, body } = props;

  // Default pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Construct where filter conditions with proper null and undefined checks
  const whereCondition = {
    ...(body.normal_room_id !== undefined &&
      body.normal_room_id !== null && {
        normal_room_id: body.normal_room_id,
      }),
    ...(body.admin_room_id !== undefined &&
      body.admin_room_id !== null && {
        admin_room_id: body.admin_room_id,
      }),
    ...(body.unique_id !== undefined &&
      body.unique_id !== null && {
        unique_id: body.unique_id,
      }),
    ...(body.display_name !== undefined &&
      body.display_name !== null && {
        display_name: {
          contains: body.display_name,
        },
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && {
        enabled: body.enabled,
      }),
    deleted_at: null,
  };

  // Fetch results and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.chatbot_room_tuples.findMany({
      where: whereCondition,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        normal_room_id: true,
        admin_room_id: true,
        display_name: true,
        unique_id: true,
        enabled: true,
      },
    }),
    MyGlobal.prisma.chatbot_room_tuples.count({
      where: whereCondition,
    }),
  ]);

  // Construct and return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      normal_room_id: r.normal_room_id,
      admin_room_id: r.admin_room_id,
      display_name: r.display_name,
      unique_id: r.unique_id,
      enabled: r.enabled,
    })),
  };
}
