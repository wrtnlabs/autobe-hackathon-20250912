import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import { IPageIEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAnalytics";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Search and retrieve a paginated list of event analytics data.
 *
 * Retrieves filtered event analytics records belonging to the event organizer.
 * Supports filtering by event id and created_at date range, with pagination.
 *
 * @param props - Object containing the authenticated event organizer and search
 *   criteria.
 * @param props.eventOrganizer - The authenticated event organizer making the
 *   request.
 * @param props.body - The request body containing filter and pagination
 *   options.
 * @returns A paginated list of event analytics summaries.
 * @throws {Error} When an unexpected error occurs during the database query.
 */
export async function patcheventRegistrationEventOrganizerEventAnalytics(props: {
  eventOrganizer: EventOrganizerPayload;
  body: IEventRegistrationEventAnalytics.IRequest;
}): Promise<IPageIEventRegistrationEventAnalytics.ISummary> {
  const { eventOrganizer, body } = props;

  // Pagination with defaults and safe number conversions
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 50);
  const skip = (page - 1) * limit;

  // Build where filter condition
  const where: Record<string, unknown> = {};

  if (
    body.event_registration_event_id !== undefined &&
    body.event_registration_event_id !== null
  ) {
    where.event_registration_event_id = body.event_registration_event_id;
  }

  if (
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
  ) {
    where.created_at = {};
    if (body.created_after !== undefined && body.created_after !== null) {
      where.created_at["gte"] = body.created_after;
    }
    if (body.created_before !== undefined && body.created_before !== null) {
      where.created_at["lte"] = body.created_before;
    }
  }

  // Execute parallel Prisma queries
  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_analytics.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.event_registration_event_analytics.count({ where }),
  ]);

  // Map Prisma Date fields to ISO strings with appropriate branding
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      event_registration_event_id: item.event_registration_event_id,
      total_sign_ups: item.total_sign_ups,
      waitlist_length: item.waitlist_length,
      popularity_category_workshop: item.popularity_category_workshop,
      popularity_category_seminar: item.popularity_category_seminar,
      popularity_category_social: item.popularity_category_social,
      popularity_category_networking: item.popularity_category_networking,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  } as IPageIEventRegistrationEventAnalytics.ISummary;
}
