import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import { IPageIEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationOrganizerRequests";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filtered, and sorted list of event organizer requests.
 *
 * This endpoint allows admins to search and list organizer requests submitted
 * by regular users. It supports filtering by status, full-text search on reason
 * and admin comments, sorting, and pagination.
 *
 * @param props - Object containing the authenticated admin and request filter
 *   parameters.
 * @param props.admin - The authenticated admin performing the search.
 * @param props.body - The search and pagination criteria as per
 *   IEventRegistrationOrganizerRequests.IRequest.
 * @returns A paginated list of organizer request summaries matching the search
 *   criteria.
 * @throws {Error} When the database query fails.
 */
export async function patcheventRegistrationAdminOrganizerRequests(props: {
  admin: AdminPayload;
  body: IEventRegistrationOrganizerRequests.IRequest;
}): Promise<IPageIEventRegistrationOrganizerRequests.ISummary> {
  const { admin, body } = props;

  const page = body.page === null || body.page === undefined ? 0 : body.page;
  const limit =
    body.limit === null || body.limit === undefined ? 100 : body.limit;
  const skip = page * limit;

  const whereConditions: {
    status?: "pending" | "approved" | "rejected";
    OR?: (
      | { reason: { contains: string } }
      | { admin_comment: { contains: string } }
      | { user_id: string & tags.Format<"uuid"> }
    )[];
  } = {};

  if (body.status !== null && body.status !== undefined) {
    whereConditions.status = body.status;
  }

  if (body.search !== null && body.search !== undefined) {
    whereConditions.OR = [
      { reason: { contains: body.search } },
      { admin_comment: { contains: body.search } },
      { user_id: body.search as string & tags.Format<"uuid"> },
    ];
  }

  const orderByField =
    body.orderBy === "created_at" ||
    body.orderBy === "updated_at" ||
    body.orderBy === "status"
      ? body.orderBy
      : "created_at";

  const orderDirection =
    body.orderDirection === "asc" || body.orderDirection === "desc"
      ? body.orderDirection
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_organizer_requests.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_organizer_requests.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      user_id: item.user_id as string & tags.Format<"uuid">,
      status: item.status,
      reason: item.reason ?? null,
      admin_comment: item.admin_comment ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
