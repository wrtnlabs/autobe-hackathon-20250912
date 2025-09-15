import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequests";
import { IPageIEventRegistrationOrganizerRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationOrganizerRequests";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Search and list event organizer requests
 *
 * This operation retrieves organizer requests filtered by status and search
 * text, with pagination and sorting support. Accessible by event organizers and
 * admins.
 *
 * @param props - Object containing the authenticated event organizer and search
 *   filters
 * @param props.eventOrganizer - The authenticated event organizer
 * @param props.body - The search and filter criteria conforming to
 *   IEventRegistrationOrganizerRequests.IRequest
 * @returns A paginated list of organizer request summaries
 * @throws {Error} When the orderBy field is invalid
 */
export async function patcheventRegistrationEventOrganizerOrganizerRequests(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationOrganizerRequests.IRequest;
}): Promise<IPageIEventRegistrationOrganizerRequests.ISummary> {
  const { body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 100;
  const skip = page * limit;

  const where: any = {};

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { reason: { contains: body.search } },
      { admin_comment: { contains: body.search } },
    ];
  }

  if (body.orderBy) {
    // Limit orderBy to allowed fields
    const allowedOrderBy = ["created_at", "updated_at", "status"];
    if (!allowedOrderBy.includes(body.orderBy)) {
      throw new Error(`Invalid orderBy field: ${body.orderBy}`);
    }
  }

  const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_organizer_requests.findMany({
      where,
      orderBy: body.orderBy
        ? { [body.orderBy]: orderDirection }
        : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_organizer_requests.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      status: row.status,
      reason: row.reason ?? null,
      admin_comment: row.admin_comment ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
