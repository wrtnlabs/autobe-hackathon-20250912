import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";

export async function test_api_admin_at_detailed_info_retrieval(
  connection: api.IConnection,
) {
  // 1. Create an initial admin user (join) to establish admin context
  const initialAdminEmail = `init${RandomGenerator.alphaNumeric(6)}@example.com`;
  const initialAdminPasswordHash = RandomGenerator.alphaNumeric(64);
  const initialAdminFullName = RandomGenerator.name();
  const initialCreateBody = {
    email: initialAdminEmail,
    password_hash: initialAdminPasswordHash,
    full_name: initialAdminFullName,
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const initialAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: initialCreateBody,
    });
  typia.assert(initialAdmin);

  // 2. Log in as initial admin
  const loginBody = {
    email: initialAdminEmail,
    password_hash: initialAdminPasswordHash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a new admin user to retrieve later
  const newAdminEmail = `new${RandomGenerator.alphaNumeric(6)}@example.com`;
  const newAdminPasswordHash = RandomGenerator.alphaNumeric(64);
  const newAdminFullName = RandomGenerator.name();
  const newAdminPhoneNum = null; // explicitly null
  const newAdminProfilePicUrl = null; // explicitly null
  const newAdminCreateBody = {
    email: newAdminEmail,
    password_hash: newAdminPasswordHash,
    full_name: newAdminFullName,
    phone_number: newAdminPhoneNum,
    profile_picture_url: newAdminProfilePicUrl,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const createdAdmin: IEventRegistrationAdmin =
    await api.functional.eventRegistration.admin.admins.create(connection, {
      body: newAdminCreateBody,
    });
  typia.assert(createdAdmin);

  // 4. Retrieve detailed information of the newly created admin user
  const retrievedAdmin: IEventRegistrationAdmin =
    await api.functional.eventRegistration.admin.admins.at(connection, {
      adminId: createdAdmin.id,
    });
  typia.assert(retrievedAdmin);

  // 5. Validate equality of important fields
  TestValidator.equals("admin id matches", retrievedAdmin.id, createdAdmin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin full_name matches",
    retrievedAdmin.full_name,
    createdAdmin.full_name,
  );
  TestValidator.equals(
    "admin phone_number matches",
    retrievedAdmin.phone_number,
    createdAdmin.phone_number,
  );
  TestValidator.equals(
    "admin profile_picture_url matches",
    retrievedAdmin.profile_picture_url,
    createdAdmin.profile_picture_url,
  );
  TestValidator.equals(
    "admin email_verified matches",
    retrievedAdmin.email_verified,
    createdAdmin.email_verified,
  );
  TestValidator.equals(
    "admin created_at exists",
    typeof retrievedAdmin.created_at === "string",
    true,
  );
  TestValidator.equals(
    "admin updated_at exists",
    typeof retrievedAdmin.updated_at === "string",
    true,
  );
}
