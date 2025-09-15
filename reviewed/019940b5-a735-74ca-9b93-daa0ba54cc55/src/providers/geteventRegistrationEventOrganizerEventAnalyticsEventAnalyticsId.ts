import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import { EventOrganizerPayload } from "../decorators/payload/EventOrganizerPayload";

/**
 * Retrieve detailed event analytics by ID
 *
 * This operation fetches a single event analytics record specified by
 * eventAnalyticsId. Access control is based on the eventOrganizer role,
 * ensuring only authorized users can view this data. Due to schema limitations,
 * ownership verification is limited and thus access is granted if the record
 * exists.
 *
 * @param props - Object containing the authenticated event organizer payload
 *   and the event analytics ID
 * @param props.eventOrganizer - The authenticated event organizer making the
 *   request
 * @param props.eventAnalyticsId - The UUID of the event analytics record to
 *   retrieve
 * @returns The detailed event analytics record
 * @throws {Error} When the event analytics record does not exist or the event
 *   is inaccessible
 */
export async function geteventRegistrationEventOrganizerEventAnalyticsEventAnalyticsId(props: {
  eventOrganizer: EventOrganizerPayload;
  eventAnalyticsId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEventAnalytics> {
  const { eventOrganizer, eventAnalyticsId } = props;

  const analytics =
    await MyGlobal.prisma.event_registration_event_analytics.findUniqueOrThrow({
      where: { id: eventAnalyticsId },
    });

  // Note: No explicit ownership check possible due to missing owner_id or organizer_id in event_registration_events schema
  // Return the analytics record with properly converted date fields

  return {
    id: analytics.id,
    event_registration_event_id: analytics.event_registration_event_id,
    total_sign_ups: analytics.total_sign_ups,
    waitlist_length: analytics.waitlist_length,
    popularity_category_workshop: analytics.popularity_category_workshop,
    popularity_category_seminar: analytics.popularity_category_seminar,
    popularity_category_social: analytics.popularity_category_social,
    popularity_category_networking: analytics.popularity_category_networking,
    created_at: toISOStringSafe(analytics.created_at),
    updated_at: toISOStringSafe(analytics.updated_at),
  };
}
