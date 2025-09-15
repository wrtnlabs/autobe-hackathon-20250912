import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotTitles } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotTitles";

export async function test_api_user_title_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin join to create an admin account
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login with the same credentials
  const adminLoginBody = {
    internal_sender_id: adminCreateBody.internal_sender_id,
    nickname: adminCreateBody.nickname,
  } satisfies IChatbotAdmin.ILogin;

  const loggedInAdmin: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new user title
  const titleCreateBody = {
    name: RandomGenerator.name(),
    fee_discount_rate: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >() satisfies number as number,
  } satisfies IChatbotTitles.ICreate;

  const createdTitle: IChatbotTitles =
    await api.functional.chatbot.admin.titles.create(connection, {
      body: titleCreateBody,
    });
  typia.assert(createdTitle);

  // 4. Validate returned user title properties
  TestValidator.predicate(
    "returned id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTitle.id,
    ),
  );
  TestValidator.equals("name matches", createdTitle.name, titleCreateBody.name);
  TestValidator.predicate(
    "fee discount rate between 0 and 100 inclusive",
    createdTitle.fee_discount_rate >= 0 &&
      createdTitle.fee_discount_rate <= 100,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    !isNaN(Date.parse(createdTitle.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    !isNaN(Date.parse(createdTitle.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    createdTitle.deleted_at ?? null,
    null,
  );
}
