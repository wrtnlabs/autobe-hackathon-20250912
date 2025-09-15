import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";

/**
 * This test function validates the retrieval of user title details by UUID
 * through the public API endpoint. It verifies successful retrieval with a
 * valid UUID and appropriate error handling when the title does not exist. The
 * test checks all key properties for type correctness and format compliance,
 * including UUID, name, fee discount rate, and ISO 8601 timestamps, ensuring
 * nullability is properly handled for optional deletion timestamp.
 */
export async function test_api_user_title_retrieve_by_id_success_and_not_found(
  connection: api.IConnection,
) {
  // Prepare a valid UUID from random data for success case testing
  const validTitleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to retrieve an existing user title
  const title: IChatbotTitles = await api.functional.chatbot.titles.at(
    connection,
    { id: validTitleId },
  );
  typia.assert(title);

  // Validate id format
  TestValidator.predicate(
    "response should have valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      title.id,
    ),
  );

  // Validate name is non-empty string
  TestValidator.predicate(
    "name should be non-empty string",
    typeof title.name === "string" && title.name.length > 0,
  );

  // Validate fee_discount_rate is integer 0-100
  TestValidator.predicate(
    "fee_discount_rate is integer between 0 and 100",
    Number.isInteger(title.fee_discount_rate) &&
      title.fee_discount_rate >= 0 &&
      title.fee_discount_rate <= 100,
  );

  // Validate created_at and updated_at as ISO 8601 datetime strings
  TestValidator.predicate(
    "created_at and updated_at are iso8601 datetime strings",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(title.created_at) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(title.updated_at),
  );

  // Validate deleted_at is explicitly null, undefined, or ISO 8601 string
  TestValidator.predicate(
    "deleted_at is either null or iso8601 datetime string",
    title.deleted_at === null ||
      title.deleted_at === undefined ||
      (typeof title.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
          title.deleted_at,
        )),
  );

  // Test retrieval of non-existent user title triggers error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve non-existent id should throw error",
    async () => {
      await api.functional.chatbot.titles.at(connection, { id: nonExistentId });
    },
  );
}
