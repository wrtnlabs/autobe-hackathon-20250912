import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import { IPageIEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEvent";

/**
 * Query and list events with filtering and pagination.
 *
 * Retrieves a paginated list of events filtering by name (contains), status (in
 * array), date range, location (contains), and event category ID. Supports
 * pagination and sorting by allowed fields: name, date, capacity,
 * ticket_price.
 *
 * Open endpoint with no authentication required.
 *
 * @param props - Object containing the request body with filtering and
 *   pagination parameters
 * @param props.body - The event search and filter parameters
 * @returns Paginated event summary list matching filters
 * @throws {Error} Throws if pagination parameters are invalid
 */
export async function patcheventRegistrationEvents(props: {
  body: IEventRegistrationEvent.IRequest;
}): Promise<IPageIEventRegistrationEvent.ISummary> {
  const { body } = props;

  // Normalize pagination parameters with defaults
  const page = body.page === undefined || body.page === null ? 1 : body.page;
  const limit =
    body.limit === undefined || body.limit === null ? 10 : body.limit;
  if (page < 1) throw new Error("Page must be at least 1");
  if (limit < 1) throw new Error("Limit must be at least 1");

  // Calculate skip and take for pagination
  const skip = (page - 1) * limit;
  const take = limit;

  // Build the filtering conditions
  const where = {
    deleted_at: null,
    ...(body.name !== undefined && body.name !== null && body.name.length > 0
      ? { name: { contains: body.name } }
      : {}),
    ...(body.status !== undefined &&
    body.status !== null &&
    Array.isArray(body.status) &&
    body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...(body.date_from !== undefined && body.date_from !== null
      ? { date: { gte: body.date_from } }
      : {}),
    ...(body.date_to !== undefined && body.date_to !== null
      ? {
          date: {
            ...(body.date_from !== undefined && body.date_from !== null
              ? {}
              : {}),
            lte: body.date_to,
          },
        }
      : {}),
    ...(body.location !== undefined &&
    body.location !== null &&
    body.location.length > 0
      ? { location: { contains: body.location } }
      : {}),
    ...(body.event_category_id !== undefined && body.event_category_id !== null
      ? { event_category_id: body.event_category_id }
      : {}),
  };

  // Determine the orderBy criteria
  const orderBy =
    body.sort !== undefined &&
    body.sort !== null &&
    body.sort.field !== undefined &&
    body.sort.direction !== undefined
      ? { [body.sort.field]: body.sort.direction }
      : { date: "asc" };

  // Fetch events and total count in parallel
  const [events, total] = await Promise.all([
    MyGlobal.prisma.event_registration_events.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        event_category_id: true,
        name: true,
        date: true,
        location: true,
        capacity: true,
        ticket_price: true,
        status: true,
      },
    }),
    MyGlobal.prisma.event_registration_events.count({ where }),
  ]);

  // Map the results to the response format
  const data = events.map((event) => ({
    id: event.id,
    event_category_id: event.event_category_id,
    name: event.name,
    date: toISOStringSafe(event.date),
    location: event.location,
    capacity: event.capacity,
    ticket_price: event.ticket_price,
    status: event.status as "scheduled" | "cancelled" | "completed",
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
