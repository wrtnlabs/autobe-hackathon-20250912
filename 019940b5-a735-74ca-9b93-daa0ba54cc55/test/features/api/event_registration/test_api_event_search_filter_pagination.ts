import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEvent";

/**
 * Tests event searching with various filters, pagination, and sorting.
 *
 * This E2E test verifies that the event listing API correctly filters
 * events by date range, location substring, category ID, and status
 * filters. It covers tests for pagination (page, limit), sorting by various
 * allowable fields (name, date, capacity, ticket price), and edge cases
 * using nulls for optional parameters.
 *
 * For each combination of filter parameters, the test ensures all returned
 * events match the filtering criteria, the pagination metadata is
 * consistent, and the data is correctly ordered according to the sorting
 * criteria.
 *
 * This ensures reliable behavior for unauthenticated users browsing events
 * with optional criteria and pagination requirements.
 */
export async function test_api_event_search_filter_pagination(
  connection: api.IConnection,
) {
  const nowISOString: string = new Date().toISOString();
  const pastISOString: string = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago

  const filters: IEventRegistrationEvent.IRequest[] = [
    {},
    { name: "Conference" },
    { status: ["scheduled"] },
    { status: ["completed", "cancelled"] },
    { date_from: pastISOString, date_to: nowISOString },
    { location: "New York" },
    { event_category_id: typia.random<string & tags.Format<"uuid">>() },
    { page: 1, limit: 10 },
    { sort: { field: "name", direction: "asc" } },
    { sort: { field: "capacity", direction: "desc" } },
    {
      status: ["scheduled"],
      date_from: pastISOString,
      date_to: nowISOString,
      page: 2,
      limit: 5,
      sort: { field: "date", direction: "asc" },
    },
    {
      name: null,
      status: null,
      date_from: null,
      date_to: null,
      location: null,
      event_category_id: null,
      page: null,
      limit: null,
      sort: null,
    },
  ];

  for (const filter of filters) {
    const requestBody = {
      name: filter.name === undefined ? undefined : filter.name,
      status: filter.status === undefined ? undefined : filter.status,
      date_from: filter.date_from === undefined ? undefined : filter.date_from,
      date_to: filter.date_to === undefined ? undefined : filter.date_to,
      location: filter.location === undefined ? undefined : filter.location,
      event_category_id:
        filter.event_category_id === undefined
          ? undefined
          : filter.event_category_id,
      page: filter.page === undefined ? undefined : filter.page,
      limit: filter.limit === undefined ? undefined : filter.limit,
      sort: filter.sort === undefined ? undefined : filter.sort,
    } satisfies IEventRegistrationEvent.IRequest;

    const output: IPageIEventRegistrationEvent.ISummary =
      await api.functional.eventRegistration.events.searchEvents(connection, {
        body: requestBody,
      });

    typia.assert(output);

    TestValidator.predicate(
      "pagination current is positive or zero",
      output.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive or zero",
      output.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages is positive or zero",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records is positive or zero",
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination current <= pages",
      output.pagination.current <= output.pagination.pages,
    );

    for (const event of output.data) {
      typia.assert(event);

      if (requestBody.status !== null && requestBody.status !== undefined) {
        TestValidator.predicate(
          `event status is within filter: ${requestBody.status.join(",")}`,
          requestBody.status.includes(event.status),
        );
      }

      if (
        requestBody.date_from !== null &&
        requestBody.date_from !== undefined
      ) {
        TestValidator.predicate(
          "event date >= date_from",
          new Date(event.date) >= new Date(requestBody.date_from),
        );
      }

      if (requestBody.date_to !== null && requestBody.date_to !== undefined) {
        TestValidator.predicate(
          "event date <= date_to",
          new Date(event.date) <= new Date(requestBody.date_to),
        );
      }

      if (requestBody.location !== null && requestBody.location !== undefined) {
        TestValidator.predicate(
          "event location includes location filter",
          event.location.includes(requestBody.location),
        );
      }

      if (
        requestBody.event_category_id !== null &&
        requestBody.event_category_id !== undefined
      ) {
        TestValidator.equals(
          "event category id matches",
          event.event_category_id,
          requestBody.event_category_id,
        );
      }

      if (
        requestBody.name !== null &&
        requestBody.name !== undefined &&
        requestBody.name.length > 0
      ) {
        TestValidator.predicate(
          "event name includes filter",
          event.name.includes(requestBody.name),
        );
      }
    }

    if (requestBody.sort !== null && requestBody.sort !== undefined) {
      const { field, direction } = requestBody.sort;
      const cmp = (
        a: IEventRegistrationEvent.ISummary,
        b: IEventRegistrationEvent.ISummary,
      ) => {
        let res = 0;
        switch (field) {
          case "name":
            res = a.name.localeCompare(b.name);
            break;
          case "date":
            res = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case "capacity":
            res = a.capacity - b.capacity;
            break;
          case "ticket_price":
            res = a.ticket_price - b.ticket_price;
            break;
          default:
            res = 0;
        }
        return direction === "asc" ? res : -res;
      };

      for (let i = 1; i < output.data.length; i++) {
        const cmpResult = cmp(output.data[i - 1], output.data[i]);
        TestValidator.predicate(
          `events are sorted by ${field} ${direction}`,
          cmpResult <= 0,
        );
      }
    }
  }
}
