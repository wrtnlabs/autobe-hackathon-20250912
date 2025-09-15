import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";

/**
 * Test retrieval of detailed event information by event ID.
 *
 * This test verifies that an unauthenticated user can retrieve the full
 * details of an event by providing a valid event ID. It validates each
 * field complies with the expected types and business rules.
 *
 * Steps:
 *
 * 1. Generate a valid, random UUID as event ID.
 * 2. Use the API to fetch event details by the event ID.
 * 3. Assert using typia.assert that the returned object matches
 *    IEventRegistrationEvent.
 * 4. Verify that all mandatory fields are non-empty, formatted correctly and
 *    within valid ranges.
 *
 * Note: Because the event is fetched by ID, there's no need for
 * authentication.
 */
export async function test_api_event_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Generate a valid random UUID for eventId
  const eventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Fetch event details
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.events.at(connection, { eventId });

  // 3. Assert the returned data type
  typia.assert(event);

  // 4. Validate required properties with enhanced checks
  TestValidator.predicate(
    "id is a UUID",
    typeof event.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        event.id,
      ),
  );
  TestValidator.predicate(
    "event_category_id is a UUID",
    typeof event.event_category_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        event.event_category_id,
      ),
  );
  TestValidator.predicate(
    "name is non-empty string",
    typeof event.name === "string" && event.name.length > 0,
  );
  TestValidator.predicate(
    "date is ISO 8601 string",
    typeof event.date === "string" && !isNaN(Date.parse(event.date)),
  );
  TestValidator.predicate(
    "location is non-empty string",
    typeof event.location === "string" && event.location.length > 0,
  );
  TestValidator.predicate(
    "capacity is positive integer",
    typeof event.capacity === "number" &&
      Number.isInteger(event.capacity) &&
      event.capacity > 0,
  );
  TestValidator.predicate(
    "description is null or undefined or string",
    event.description === null ||
      event.description === undefined ||
      typeof event.description === "string",
  );
  TestValidator.predicate(
    "ticket_price is number >= 0",
    typeof event.ticket_price === "number" && event.ticket_price >= 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["scheduled", "cancelled", "completed"].includes(event.status),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof event.created_at === "string" &&
      !isNaN(Date.parse(event.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof event.updated_at === "string" &&
      !isNaN(Date.parse(event.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null or undefined or ISO 8601 string",
    event.deleted_at === null ||
      event.deleted_at === undefined ||
      (typeof event.deleted_at === "string" &&
        !isNaN(Date.parse(event.deleted_at))),
  );
}
