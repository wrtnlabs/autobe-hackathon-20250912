import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed event analytics by ID
 *
 * This operation retrieves detailed information about a single event analytics
 * record identified by `eventAnalyticsId`. It ensures that only authorized
 * admins can access the data.
 *
 * @param props - Object containing the authenticated admin and the event
 *   analytics ID
 * @param props.admin - The authenticated admin user making the request
 * @param props.eventAnalyticsId - The unique identifier of the target event
 *   analytics record
 * @returns The detailed event analytics information associated with the
 *   specified ID
 * @throws {Error} Throws if the event analytics record does not exist
 */
export async function geteventRegistrationAdminEventAnalyticsEventAnalyticsId(props: {
  admin: AdminPayload;
  eventAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAnalytics> {
  const { eventAnalyticsId } = props;

  const record =
    await MyGlobal.prisma.event_registration_event_analytics.findUniqueOrThrow({
      where: { id: eventAnalyticsId },
      select: {
        id: true,
        event_registration_event_id: true,
        total_sign_ups: true,
        waitlist_length: true,
        popularity_category_workshop: true,
        popularity_category_seminar: true,
        popularity_category_social: true,
        popularity_category_networking: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    event_registration_event_id: record.event_registration_event_id,
    total_sign_ups: record.total_sign_ups,
    waitlist_length: record.waitlist_length,
    popularity_category_workshop: record.popularity_category_workshop,
    popularity_category_seminar: record.popularity_category_seminar,
    popularity_category_social: record.popularity_category_social,
    popularity_category_networking: record.popularity_category_networking,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
