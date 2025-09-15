import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

export async function test_api_guest_retrieve_guest_user_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new guest user using the join API to get valid guestId and tokens
  const createRequestBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guestAuthorized: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createRequestBody,
    });
  typia.assert(guestAuthorized);

  // 2. Retrieve guest details by the guest id obtained
  const guestDetail: IEnterpriseLmsGuest =
    await api.functional.enterpriseLms.guest.guests.at(connection, {
      guestId: guestAuthorized.id,
    });
  typia.assert(guestDetail);

  // 3. Validate guest details match the created guest data
  TestValidator.equals("Guest ID matches", guestDetail.id, guestAuthorized.id);
  TestValidator.equals(
    "Tenant ID matches",
    guestDetail.tenant_id,
    createRequestBody.tenant_id,
  );
  TestValidator.equals(
    "Email matches",
    guestDetail.email,
    createRequestBody.email,
  );
  TestValidator.equals(
    "First name matches",
    guestDetail.first_name,
    createRequestBody.first_name,
  );
  TestValidator.equals(
    "Last name matches",
    guestDetail.last_name,
    createRequestBody.last_name,
  );
  TestValidator.equals(
    "Status matches",
    guestDetail.status,
    createRequestBody.status,
  );

  TestValidator.predicate(
    "Created at is string",
    typeof guestDetail.created_at === "string",
  );
  TestValidator.predicate(
    "Updated at is string",
    typeof guestDetail.updated_at === "string",
  );
  TestValidator.predicate(
    "Deleted at is null or undefined",
    guestDetail.deleted_at === null || guestDetail.deleted_at === undefined,
  );

  // 4. Attempt retrieval of a non-existent guestId and assert error thrown
  await TestValidator.error(
    "Non-existent guestId retrieval should fail",
    async () => {
      const fakeGuestId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.enterpriseLms.guest.guests.at(connection, {
        guestId: fakeGuestId,
      });
    },
  );
}
