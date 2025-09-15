import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEvent";

export async function test_api_event_search_no_filters(
  connection: api.IConnection,
) {
  // Test the PATCH /eventRegistration/events endpoint with no filters
  // to ensure it returns all events with default pagination (page 1)

  // Empty filter object (all optional fields omitted)
  const requestBody = {} satisfies IEventRegistrationEvent.IRequest;

  // Call the searchEvents API
  const response: IPageIEventRegistrationEvent.ISummary =
    await api.functional.eventRegistration.events.searchEvents(connection, {
      body: requestBody,
    });

  // Validate full response structure
  typia.assert(response);

  // Pagination validation
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total pages should be >= 1",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination total records should be >= 0",
    response.pagination.records >= 0,
  );

  // Pagination limit consistency
  TestValidator.predicate(
    "data length should be <= pagination limit",
    response.data.length <= response.pagination.limit,
  );

  // Event data array validation
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );

  const validStatuses = ["scheduled", "cancelled", "completed"] as const;

  for (const event of response.data) {
    typia.assert(event);
    TestValidator.predicate(
      "event id is non-empty string",
      event.id.length > 0,
    );
    TestValidator.predicate(
      "event name is non-empty string",
      event.name.length > 0,
    );
    TestValidator.predicate(
      "event capacity is non-negative integer",
      event.capacity >= 0,
    );
    TestValidator.predicate(
      "event status is one of scheduled|cancelled|completed",
      validStatuses.includes(event.status),
    );
    TestValidator.predicate(
      "event date is non-empty string",
      event.date.length > 0,
    );
    TestValidator.predicate(
      "event location is non-empty string",
      event.location.length > 0,
    );
  }
}
