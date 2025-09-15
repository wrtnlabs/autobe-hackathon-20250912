import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import { IPageIEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of event analytics data.
 *
 * This operation allows filtering by event ID and creation date range, and
 * supports pagination. It queries the event_registration_event_analytics table,
 * providing aggregated metrics per event.
 *
 * Only admin users with proper credentials can access this data.
 *
 * @param props - Object containing admin authentication and request body with
 *   search parameters.
 * @param props.admin - Authenticated admin payload
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated event analytics summaries fulfilling the search criteria
 * @throws {Error} Throws if any database interaction or Prisma client call
 *   fails
 */
export async function patcheventRegistrationAdminEventAnalytics(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventAnalytics.IRequest;
}): Promise<IPageIEventRegistrationEventAnalytics.ISummary> {
  const { admin, body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build dynamic where filter based on provided optional filters
  const where: {
    event_registration_event_id?: string & tags.Format<"uuid">;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

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
      where.created_at.gte = body.created_after;
    }
    if (body.created_before !== undefined && body.created_before !== null) {
      where.created_at.lte = body.created_before;
    }
  }

  // Fetch paginated data and total count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_analytics.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_analytics.count({ where }),
  ]);

  // Map the results and convert Date objects to ISO strings
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
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
  };
}
