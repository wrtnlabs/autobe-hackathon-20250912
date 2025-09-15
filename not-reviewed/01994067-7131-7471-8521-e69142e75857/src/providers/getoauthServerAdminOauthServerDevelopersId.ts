import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get OAuth developer details by ID
 *
 * Retrieves detailed information of a single OAuth server developer by their
 * unique ID. Requires admin authorization.
 *
 * @param props - Object containing admin payload and developer ID
 * @param props.admin - Authenticated admin user payload
 * @param props.id - Unique identifier of the OAuth developer
 * @returns The detailed OAuth server developer information
 * @throws {Error} If developer not found or deleted
 */
export async function getoauthServerAdminOauthServerDevelopersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerDeveloper> {
  const { admin, id } = props;

  // Fetch developer record where deleted_at is null to exclude soft deleted
  const developer =
    await MyGlobal.prisma.oauth_server_developers.findUniqueOrThrow({
      where: { id },
    });

  // Check deleted_at is null
  if (developer.deleted_at !== null) {
    throw new Error("Developer not found");
  }

  // Return result with date strings converted using toISOStringSafe
  return {
    id: developer.id,
    email: developer.email,
    email_verified: developer.email_verified,
    password_hash: developer.password_hash,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at:
      developer.deleted_at === null
        ? null
        : toISOStringSafe(developer.deleted_at),
  };
}
